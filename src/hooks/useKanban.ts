import { useState, useEffect, useCallback, useMemo } from "react";
import type { KanbanColumn, KanbanCard, KanbanTask, KanbanCustomTask, Estimativa } from "@/types";
import {
  carregarBoard,
  criarColumn,
  atualizarColumn,
  deletarColumn,
  criarCard,
  atualizarCard,
  deletarCard,
  criarTask,
  atualizarTask,
  deletarTask,
} from "@/services/kanbanApi";
import { createId, buildTaskTree } from "@/utils";
import { createClient } from "@supabase/supabase-js";

function notify(msg: string) {
  // Simple notification fallback
  if (typeof window !== "undefined") {
    console.log("[Notify]", msg);
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getToken(): Promise<string | undefined> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session?.access_token;
  } catch {
    return undefined;
  }
}

async function cloneTaskTree(
  tasks: KanbanCustomTask[],
  cardId: string,
  parentId: string | null,
  token: string,
  resetCompleted = true
): Promise<{ count: number; createdTasks: KanbanTask[] }> {
  let count = 0;
  const createdTasks: KanbanTask[] = [];

  for (const task of tasks) {
    const { subtasks, ...rest } = task;
    const created = await criarTask({
      cardId,
      parentId,
      title: rest.title,
      description: rest.description,
      completed: resetCompleted ? false : rest.completed,
      priority: rest.priority,
      assignee: rest.assignee,
      dueDate: rest.dueDate,
      tags: rest.tags,
      checklist: rest.checklist,
      comments: rest.comments,
      attachments: rest.attachments,
    }, token);

    count++;
    createdTasks.push(created);

    if (subtasks && subtasks.length > 0) {
      const { count: childCount, createdTasks: childTasks } = await cloneTaskTree(subtasks, cardId, created.id, token, resetCompleted);
      count += childCount;
      createdTasks.push(...childTasks);
    }
  }

  return { count, createdTasks };
}

function cardsWithTreeTasks(cards: KanbanCard[], tasks: KanbanTask[]): KanbanCard[] {
  const tasksByCard = new Map<string, KanbanTask[]>();
  tasks.forEach((t) => {
    const list = tasksByCard.get(t.cardId) || [];
    list.push(t);
    tasksByCard.set(t.cardId, list);
  });

  return cards.map((card) => ({
    ...card,
    tasks: buildTaskTree(tasksByCard.get(card.id) || []),
  }));
}

async function migrateFromLocalStorage(): Promise<{
  columns: KanbanColumn[];
  cards: KanbanCard[];
  tasks: KanbanTask[];
} | null> {
  try {
    const raw = localStorage.getItem("kanban-state-v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const columns: KanbanColumn[] = parsed.columns || [];
    const cards: KanbanCard[] = (parsed.cards || []).map((c: any) => ({
      ...c,
      isTemplate: c.isTemplate || false,
      isDefaultTemplate: c.isDefaultTemplate || false,
    }));

    // Criar columns no backend
    const createdColumns: KanbanColumn[] = [];
    for (const col of columns) {
      try {
        const created = await criarColumn({ title: col.title, position: columns.indexOf(col) }, await getToken());
        createdColumns.push(created);
      } catch {
        createdColumns.push(col);
      }
    }

    // Mapear ids antigos para novos
    const columnIdMap = new Map<string, string>();
    columns.forEach((oldCol, idx) => {
      columnIdMap.set(oldCol.id, createdColumns[idx]?.id || oldCol.id);
    });

    const createdCards: KanbanCard[] = [];
    const allTasks: KanbanTask[] = [];

    for (const card of cards) {
      try {
        const created = await criarCard({
          columnId: columnIdMap.get(card.columnId) || card.columnId,
          estimateId: card.estimateId,
          title: card.title,
          notes: card.notes,
          description: card.description,
          tags: card.tags,
          dueDate: card.dueDate,
          priority: card.priority,
          assignee: card.assignee,
          isTemplate: card.isTemplate,
          isDefaultTemplate: card.isDefaultTemplate,
          position: cards.indexOf(card),
        }, await getToken());
        createdCards.push(created);

        // Clone tasks recursively (preserves subtasks hierarchy)
        if (card.tasks && card.tasks.length > 0) {
          try {
            const { createdTasks } = await cloneTaskTree(card.tasks, created.id, null, await getToken());
            allTasks.push(...createdTasks);
          } catch {
            // ignore task clone errors
          }
        }
      } catch {
        createdCards.push(card);
      }
    }

    localStorage.removeItem("kanban-state-v1");
    return {
      columns: createdColumns,
      cards: cardsWithTreeTasks(createdCards, allTasks),
      tasks: allTasks,
    };
  } catch {
    return null;
  }
}

export function useKanban(estimativas: Estimativa[]) {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingFavoriteIds, setAddingFavoriteIds] = useState<Set<string>>(new Set());
  const [tagColors, setTagColorsState] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem("kanban-tag-colors");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const favoriteIds = useMemo(() => cards.filter((c) => c.estimateId).map((c) => c.estimateId!), [cards]);
  const optimisticFavoriteIds = useMemo(() => {
    const ids = new Set(favoriteIds);
    addingFavoriteIds.forEach((id) => ids.add(id));
    return Array.from(ids);
  }, [favoriteIds, addingFavoriteIds]);

  useEffect(() => {
    let mounted = true;
    const loadBoard = async () => {
      const token = await getToken();
      return carregarBoard(token);
    };
    loadBoard()
      .then(async (board) => {
        if (!mounted) return;
        if (board.columns.length === 0 && board.cards.length === 0) {
          const migrated = await migrateFromLocalStorage();
          if (migrated) {
            setColumns(migrated.columns);
            setCards(migrated.cards);
            setTasks(migrated.tasks);
          }
        } else {
          setColumns(board.columns);
          setTasks(board.tasks);
          setCards(cardsWithTreeTasks(board.cards, board.tasks));
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar kanban:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  /* ── Columns ─────────────────────────────────────────────────────────── */

  const addColumn = useCallback(async (title: string) => {
    const optimistic: KanbanColumn = { id: createId(), title, position: columns.length };
    setColumns((prev) => [...prev, optimistic]);
    try {
      const created = await criarColumn({ title, position: columns.length }, await getToken());
      setColumns((prev) => prev.map((c) => (c.id === optimistic.id ? created : c)));
    } catch {
      setColumns((prev) => prev.filter((c) => c.id !== optimistic.id));
      notify("Erro ao criar coluna");
    }
  }, [columns.length]);

  const updateColumnTitle = useCallback(async (id: string, title: string) => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    try {
      await atualizarColumn(id, { title }, await getToken());
    } catch {
      notify("Erro ao atualizar coluna");
    }
  }, []);

  const updateColumnColor = useCallback(async (id: string, color: string) => {
    const previousColumns = columns;
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, color } : c)));
    try {
      const updated = await atualizarColumn(id, { color }, await getToken());
      setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, color: updated.color } : c)));
    } catch (err) {
      setColumns(previousColumns);
      console.error("[updateColumnColor] Erro ao persistir cor da coluna:", err);
      notify("Erro ao atualizar cor da coluna");
    }
  }, [columns]);

  const removeColumn = useCallback(async (id: string) => {
    const prevColumns = columns;
    const prevCards = cards;
    const prevTasks = tasks;
    setColumns((prev) => prev.filter((c) => c.id !== id));
    const removedCardIds = cards.filter((c) => c.columnId === id).map((c) => c.id);
    setCards((prev) => prev.filter((c) => c.columnId !== id));
    setTasks((prev) => prev.filter((t) => !removedCardIds.includes(t.cardId)));
    try {
      await deletarColumn(id, await getToken());
    } catch {
      setColumns(prevColumns);
      setCards(prevCards);
      setTasks(prevTasks);
      notify("Erro ao deletar coluna");
    }
  }, [columns, cards, tasks]);

  const reorderColumn = useCallback(async (
    columnId: string,
    targetColumnId: string,
    placement: "before" | "after"
  ) => {
    const draggedColumn = columns.find((c) => c.id === columnId);
    if (!draggedColumn) return;

    const otherColumns = columns.filter((c) => c.id !== columnId);
    const targetIndex = otherColumns.findIndex((c) => c.id === targetColumnId);
    if (targetIndex === -1) return;

    const insertIndex = placement === "after" ? targetIndex + 1 : targetIndex;
    const newOrder = [
      ...otherColumns.slice(0, insertIndex),
      draggedColumn,
      ...otherColumns.slice(insertIndex),
    ];

    const positionUpdates = newOrder.map((c, idx) => ({ id: c.id, position: idx }));

    setColumns((prev) =>
      prev
        .map((c) => {
          const update = positionUpdates.find((u) => u.id === c.id);
          return update ? { ...c, position: update.position } : c;
        })
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    );

    try {
      const token = await getToken();
      await Promise.all(
        positionUpdates.map((u) => atualizarColumn(u.id, { position: u.position }, token))
      );
    } catch {
      notify("Erro ao reordenar colunas");
    }
  }, [columns]);

  /* ── Cards ───────────────────────────────────────────────────────────── */

  const moveCard = useCallback(async (cardId: string, columnId: string) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, columnId } : c)));
    try {
      await atualizarCard(cardId, { columnId }, await getToken());
    } catch {
      notify("Erro ao mover card");
    }
  }, []);

  const reorderCard = useCallback(async (
    cardId: string,
    beforeCardId: string | null,
    targetColumnId?: string
  ) => {
    const draggedCard = cards.find((c) => c.id === cardId);
    if (!draggedCard) return;

    // Determina a coluna de destino (permite mover de uma coluna para outra ao reordenar)
    let columnId = targetColumnId;
    if (!columnId && beforeCardId) {
      const beforeCard = cards.find((c) => c.id === beforeCardId);
      columnId = beforeCard?.columnId;
    }
    if (!columnId) columnId = draggedCard.columnId;

    // Cards da coluna de destino, excluindo o card arrastado
    const columnCards = cards.filter((c) => c.columnId === columnId && c.id !== cardId);
    const movedCard = { ...draggedCard, columnId };

    let newOrder: KanbanCard[];
    if (beforeCardId) {
      const beforeIndex = columnCards.findIndex((c) => c.id === beforeCardId);
      newOrder = [
        ...columnCards.slice(0, beforeIndex),
        movedCard,
        ...columnCards.slice(beforeIndex),
      ];
    } else {
      newOrder = [...columnCards, movedCard];
    }

    // Atualizar posições
    const positionUpdates = newOrder.map((c, idx) => ({ id: c.id, position: idx, columnId: c.columnId }));

    // Atualizar estado otimista (reordena o array da coluna afetada)
    setCards((prev) => {
      const outsideColumn = prev.filter((c) => c.columnId !== columnId || c.id === cardId);
      const reordered = newOrder.map((c, idx) => ({ ...c, position: idx }));
      const filteredOutside = outsideColumn.filter((c) => c.id !== cardId);
      return [...filteredOutside, ...reordered];
    });

    // Atualizar backend (batch paralelo)
    try {
      const token = await getToken();
      await Promise.all(
        positionUpdates.map((u) => atualizarCard(u.id, { position: u.position, columnId: u.columnId }, token))
      );
    } catch {
      notify("Erro ao reordenar cards");
    }
  }, [cards]);

  const updateCard = useCallback(async (cardId: string, patch: Partial<Omit<KanbanCard, "id" | "tasks">>) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, ...patch } : c)));
    try {
      await atualizarCard(cardId, patch, await getToken());
    } catch {
      notify("Erro ao atualizar card");
    }
  }, []);

  const updateCardNotes = useCallback(async (cardId: string, notes: string) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, notes } : c)));
    try {
      await atualizarCard(cardId, { notes }, await getToken());
    } catch {
      notify("Erro ao atualizar notas");
    }
  }, []);

  const toggleEstimateTaskCompleted = useCallback(async (cardId: string, taskId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const currentIds = card.completedEstimateTaskIds ?? [];
    const isCompleted = currentIds.includes(taskId);
    const nextIds = isCompleted ? currentIds.filter((id) => id !== taskId) : [...currentIds, taskId];
    const previousCards = cards;
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, completedEstimateTaskIds: nextIds } : c)));
    try {
      const updated = await atualizarCard(cardId, { completedEstimateTaskIds: nextIds }, await getToken());
      setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, completedEstimateTaskIds: updated.completedEstimateTaskIds } : c)));
    } catch (err) {
      setCards(previousCards);
      console.error("[toggleEstimateTaskCompleted] Erro ao persistir:", err);
      notify("Erro ao atualizar tarefa principal");
    }
  }, [cards]);

  const removeCard = useCallback(async (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setTasks((prev) => prev.filter((t) => t.cardId !== cardId));
    try {
      await deletarCard(cardId, await getToken());
    } catch {
      notify("Erro ao deletar card");
    }
  }, []);

  /* ── Tasks (tree helpers) ────────────────────────────────────────────── */

  function updateTaskTree(tasksTree: KanbanCustomTask[] | undefined, taskId: string, updater: (task: KanbanCustomTask) => KanbanCustomTask | null): KanbanCustomTask[] | undefined {
    if (!tasksTree) return tasksTree;
    return tasksTree
      .map((task) => {
        if (task.id === taskId) return updater(task);
        const updatedSubtasks = updateTaskTree(task.subtasks, taskId, updater);
        if (updatedSubtasks !== task.subtasks) return { ...task, subtasks: updatedSubtasks };
        return task;
      })
      .filter(Boolean) as KanbanCustomTask[];
  }

  function addTaskToTree(tasksTree: KanbanCustomTask[] | undefined, parentTaskId: string | undefined, newTask: KanbanCustomTask): KanbanCustomTask[] {
    if (!parentTaskId) return [...(tasksTree || []), newTask];
    if (!tasksTree) return [];
    return tasksTree.map((task) => {
      if (task.id === parentTaskId) return { ...task, subtasks: [...(task.subtasks ?? []), newTask] };
      return { ...task, subtasks: addTaskToTree(task.subtasks, parentTaskId, newTask) };
    });
  }

  function removeFromTree(tasksTree: KanbanCustomTask[] | undefined, taskId: string): KanbanCustomTask[] | undefined {
    if (!tasksTree) return tasksTree;
    return tasksTree
      .flatMap((task) => {
        if (task.id === taskId) return [];
        return [{ ...task, subtasks: removeFromTree(task.subtasks, taskId) }];
      })
      .filter(Boolean) as KanbanCustomTask[];
  }

  const addCardTask = useCallback(async (cardId: string, task: Omit<KanbanCustomTask, "id" | "completed" | "subtasks">, parentTaskId?: string) => {
    const newTask: KanbanCustomTask = { id: createId(), completed: false, subtasks: [], ...task };
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, tasks: addTaskToTree(c.tasks, parentTaskId, newTask) } : c)));
    try {
      const created = await criarTask({
        cardId,
        parentId: parentTaskId || null,
        title: newTask.title,
        description: newTask.description,
        completed: false,
        priority: newTask.priority,
        assignee: newTask.assignee,
        dueDate: newTask.dueDate,
        tags: newTask.tags,
        checklist: newTask.checklist,
        comments: newTask.comments,
        attachments: newTask.attachments,
      }, await getToken());
      setTasks((prev) => [...prev, created]);
    } catch {
      notify("Erro ao criar tarefa");
    }
  }, []);

  const updateCardTask = useCallback(async (cardId: string, taskId: string, patch: Partial<Omit<KanbanCustomTask, "id" | "subtasks">>) => {
    const previousCards = cards;
    const previousTasks = tasks;
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, tasks: updateTaskTree(c.tasks, taskId, (t) => ({ ...t, ...patch })) } : c)));
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
    try {
      const updated = await atualizarTask(taskId, patch, await getToken());
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)));
    } catch (err) {
      setCards(previousCards);
      setTasks(previousTasks);
      console.error("[updateCardTask] Erro ao persistir tarefa:", err);
      notify("Erro ao atualizar tarefa");
    }
  }, [cards, tasks]);

  const toggleCardTaskCompleted = useCallback(async (cardId: string, taskId: string) => {
    const previousCards = cards;
    const previousTasks = tasks;
    const currentCompleted = tasks.find((t) => t.id === taskId)?.completed ?? false;
    const nextCompleted = !currentCompleted;

    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, tasks: updateTaskTree(c.tasks, taskId, (t) => ({ ...t, completed: nextCompleted })) } : c)));
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: nextCompleted } : t)));

    try {
      const updated = await atualizarTask(taskId, { completed: nextCompleted }, await getToken());
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: updated.completed } : t)));
    } catch (err) {
      setCards(previousCards);
      setTasks(previousTasks);
      console.error("[toggleCardTaskCompleted] Erro ao persistir estado da tarefa:", err);
      notify("Erro ao alternar tarefa");
    }
  }, [cards, tasks]);

  const removeCardTask = useCallback(async (cardId: string, taskId: string) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, tasks: removeFromTree(c.tasks, taskId) ?? [] } : c)));
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await deletarTask(taskId, await getToken());
    } catch {
      notify("Erro ao deletar tarefa");
    }
  }, []);

  /* ── Task reorder helpers ────────────────────────────────────────────── */

  function findTaskArrayInTree(
    tasksTree: KanbanCustomTask[] | undefined,
    parentTaskId: string | null
  ): KanbanCustomTask[] | undefined {
    if (!parentTaskId) return tasksTree;
    if (!tasksTree) return undefined;
    for (const task of tasksTree) {
      if (task.id === parentTaskId) return task.subtasks;
      const found = findTaskArrayInTree(task.subtasks, parentTaskId);
      if (found) return found;
    }
    return undefined;
  }

  function replaceTaskArrayInTree(
    tasksTree: KanbanCustomTask[] | undefined,
    parentTaskId: string | null,
    newArray: KanbanCustomTask[]
  ): KanbanCustomTask[] | undefined {
    if (!parentTaskId) return newArray;
    if (!tasksTree) return tasksTree;
    return tasksTree.map((task) => {
      if (task.id === parentTaskId) return { ...task, subtasks: newArray };
      const replaced = replaceTaskArrayInTree(task.subtasks, parentTaskId, newArray);
      if (replaced !== task.subtasks) return { ...task, subtasks: replaced };
      return task;
    });
  }

  const reorderCardTask = useCallback(async (
    cardId: string,
    parentTaskId: string | null,
    sourceIndex: number,
    destIndex: number
  ) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    const taskArray = findTaskArrayInTree(card.tasks, parentTaskId);
    if (!taskArray || sourceIndex === destIndex) return;
    if (sourceIndex < 0 || sourceIndex >= taskArray.length) return;
    if (destIndex < 0 || destIndex >= taskArray.length) return;

    // Reorder array
    const reordered = [...taskArray];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(destIndex, 0, moved);

    // Assign positions
    const withPositions = reordered.map((t, idx) => ({ ...t, position: idx }));

    // Update card tree
    const newTasks = replaceTaskArrayInTree(card.tasks, parentTaskId, withPositions);
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, tasks: newTasks } : c)));

    // Update flat tasks state
    setTasks((prev) => {
      const map = new Map(prev.map((t) => [t.id, t]));
      withPositions.forEach((t) => {
        if (map.has(t.id)) map.set(t.id, { ...map.get(t.id)!, position: t.position });
      });
      return Array.from(map.values());
    });

    // Persist to backend
    try {
      const token = await getToken();
      await Promise.all(
        withPositions.map((t) => atualizarTask(t.id, { position: t.position }, token))
      );
    } catch {
      notify("Erro ao reordenar tarefas");
    }
  }, [cards]);

  /* ── Template helpers ────────────────────────────────────────────────── */

  const toggleCardTemplate = useCallback(async (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const next = !card.isTemplate;
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, isTemplate: next, isDefaultTemplate: next ? c.isDefaultTemplate : false } : c)));
    try {
      await atualizarCard(cardId, { isTemplate: next, isDefaultTemplate: next ? card.isDefaultTemplate : false }, await getToken());
    } catch {
      notify("Erro ao alternar template");
    }
  }, [cards]);

  const setDefaultTemplate = useCallback(async (cardId: string) => {
    setCards((prev) => prev.map((c) => ({ ...c, isDefaultTemplate: c.id === cardId })));
    try {
      // Unset all others first
      const templates = cards.filter((c) => c.isTemplate && c.id !== cardId);
      for (const t of templates) {
        await atualizarCard(t.id, { isDefaultTemplate: false }, await getToken());
      }
      await atualizarCard(cardId, { isDefaultTemplate: true }, await getToken());
    } catch {
      notify("Erro ao definir template padrão");
    }
  }, [cards]);

  const createTemplateCard = useCallback(async (columnId: string) => {
    const optimistic: KanbanCard = {
      id: createId(),
      columnId,
      title: "Novo card",
      tasks: [],
    };
    setCards((prev) => [...prev, optimistic]);
    try {
      const created = await criarCard({
        columnId,
        title: "Novo card",
        position: cards.length,
      }, await getToken());
      setCards((prev) => prev.map((c) => (c.id === optimistic.id ? { ...created, tasks: [] } : c)));
      return created.id;
    } catch {
      setCards((prev) => prev.filter((c) => c.id !== optimistic.id));
      notify("Erro ao criar card");
      return null;
    }
  }, [cards.length]);

  const addCard = useCallback(async (payload: { columnId: string; title: string; dueDate?: string; description?: string }) => {
    const trimmed = payload.title.trim();
    if (!trimmed) return null;
    const optimistic: KanbanCard = {
      id: createId(),
      columnId: payload.columnId,
      title: trimmed,
      dueDate: payload.dueDate,
      description: payload.description,
      tasks: [],
    };
    setCards((prev) => [...prev, optimistic]);
    try {
      const created = await criarCard({
        columnId: payload.columnId,
        title: trimmed,
        dueDate: payload.dueDate,
        description: payload.description,
        position: cards.length,
      }, await getToken());
      setCards((prev) => prev.map((c) => (c.id === optimistic.id ? { ...created, tasks: [] } : c)));
      return created.id;
    } catch {
      setCards((prev) => prev.filter((c) => c.id !== optimistic.id));
      notify("Erro ao criar card");
      return null;
    }
  }, [cards.length]);

  /* ── Favorite + Template application ─────────────────────────────────── */

  const favoriteEstimativa = useCallback(async (item: Estimativa) => {
    if (!item.id) {
      notify("Estimativa inválida.");
      return;
    }
    if (optimisticFavoriteIds.includes(item.id)) {
      notify("Esta estimativa já está no Kanban.");
      return;
    }
    setAddingFavoriteIds((prev) => new Set(prev).add(item.id));

    let targetColumnId = columns[0]?.id;
    if (!targetColumnId) {
      const defaultCol = await criarColumn({ title: "Backlog", position: 0 }, await getToken());
      targetColumnId = defaultCol.id;
      setColumns((prev) => [...prev, defaultCol]);
    }

    const newCard: Omit<KanbanCard, "id" | "tasks"> = {
      columnId: targetColumnId,
      estimateId: item.id,
      title: item.titulo || item.nome || "Estimativa sem título",
      completedEstimateTaskIds: [],
    };

    try {
      const created = await criarCard(newCard, await getToken());

      // Apply default template
      const defaultTemplate = cards.find((c) => c.isTemplate && c.isDefaultTemplate);
      let clonedCount = 0;

      if (defaultTemplate && defaultTemplate.tasks && defaultTemplate.tasks.length > 0) {
        try {
          const { count, createdTasks: newTasks } = await cloneTaskTree(
            defaultTemplate.tasks,
            created.id,
            null,
            await getToken()
          );
          clonedCount = count;
          setTasks((prev) => [...prev, ...newTasks]);
          setCards((prev) => [
            ...prev,
            { ...created, tasks: buildTaskTree(newTasks) },
          ]);
        } catch {
          setCards((prev) => [...prev, { ...created, tasks: [] }]);
        }
      } else {
        setCards((prev) => [...prev, { ...created, tasks: [] }]);
      }

      if (defaultTemplate) {
        notify(`Estimativa favoritada e adicionada ao Kanban. ${clonedCount} tarefas do template "${defaultTemplate.title}" aplicadas.`);
      } else {
        notify("Estimativa favoritada e adicionada ao Kanban.");
      }
    } catch {
      notify("Erro ao favoritar estimativa");
    } finally {
      setAddingFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }, [columns, cards, favoriteIds, optimisticFavoriteIds]);

  const useTemplateAsBase = useCallback(async (templateCardId: string) => {
    const template = cards.find((c) => c.id === templateCardId);
    if (!template) {
      notify("Template não encontrado.");
      return null;
    }

    let targetColumnId = columns[0]?.id;
    if (!targetColumnId) {
      const defaultCol = await criarColumn({ title: "Backlog", position: 0 }, await getToken());
      targetColumnId = defaultCol.id;
      setColumns((prev) => [...prev, defaultCol]);
    }

    const newCardPayload: Omit<KanbanCard, "id" | "tasks"> = {
      columnId: targetColumnId,
      title: `Cópia de ${template.title}`,
      description: template.description,
      tags: template.tags,
      dueDate: template.dueDate,
      priority: template.priority,
      assignee: template.assignee,
      completedEstimateTaskIds: template.completedEstimateTaskIds,
    };

    try {
      const created = await criarCard(newCardPayload, await getToken());

      let clonedCount = 0;
      if (template.tasks && template.tasks.length > 0) {
        try {
          const { count, createdTasks: newTasks } = await cloneTaskTree(
            template.tasks,
            created.id,
            null,
            await getToken()
          );
          clonedCount = count;
          setTasks((prev) => [...prev, ...newTasks]);
          setCards((prev) => [
            ...prev,
            { ...created, tasks: buildTaskTree(newTasks) },
          ]);
        } catch {
          setCards((prev) => [...prev, { ...created, tasks: [] }]);
        }
      } else {
        setCards((prev) => [...prev, { ...created, tasks: [] }]);
      }

      notify(`Card criado a partir do template. ${clonedCount > 0 ? `${clonedCount} tarefas copiadas.` : ""}`);
      return created.id;
    } catch {
      notify("Erro ao usar template como base");
      return null;
    }
  }, [columns, cards]);

  const createTemplate = useCallback(async () => {
    let targetColumnId = columns[0]?.id;
    if (!targetColumnId) {
      const defaultCol = await criarColumn({ title: "Backlog", position: 0 }, await getToken());
      targetColumnId = defaultCol.id;
      setColumns((prev) => [...prev, defaultCol]);
    }

    const optimistic: KanbanCard = {
      id: createId(),
      columnId: targetColumnId,
      title: "Novo template",
      isTemplate: true,
      tasks: [],
    };
    setCards((prev) => [...prev, optimistic]);
    try {
      const created = await criarCard({
        columnId: targetColumnId,
        title: "Novo template",
        isTemplate: true,
        position: cards.length,
      }, await getToken());
      setCards((prev) => prev.map((c) => (c.id === optimistic.id ? { ...created, tasks: [] } : c)));
      return created.id;
    } catch {
      setCards((prev) => prev.filter((c) => c.id !== optimistic.id));
      notify("Erro ao criar template");
      return null;
    }
  }, [columns, cards.length]);

  const duplicateCard = useCallback(async (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) {
      notify("Card não encontrado.");
      return null;
    }

    const optimistic: KanbanCard = {
      id: createId(),
      columnId: card.columnId,
      title: `${card.title} (cópia)`,
      description: card.description,
      notes: card.notes,
      tags: card.tags,
      dueDate: card.dueDate,
      priority: card.priority,
      assignee: card.assignee,
      isArchived: false,
      completed: card.completed,
      completedEstimateTaskIds: card.completedEstimateTaskIds,
      tasks: card.tasks,
    };
    setCards((prev) => [...prev, optimistic]);

    try {
      const created = await criarCard({
        columnId: card.columnId,
        title: `${card.title} (cópia)`,
        description: card.description,
        notes: card.notes,
        tags: card.tags,
        dueDate: card.dueDate,
        priority: card.priority,
        assignee: card.assignee,
        isArchived: false,
        completed: card.completed,
        completedEstimateTaskIds: card.completedEstimateTaskIds,
        position: cards.length,
      }, await getToken());

      let clonedCount = 0;
      if (card.tasks && card.tasks.length > 0) {
        try {
          const { count, createdTasks: newTasks } = await cloneTaskTree(
            card.tasks,
            created.id,
            null,
            await getToken(),
            false
          );
          clonedCount = count;
          setTasks((prev) => [...prev, ...newTasks]);
          setCards((prev) =>
            prev.map((c) => (c.id === optimistic.id ? { ...created, tasks: buildTaskTree(newTasks) } : c))
          );
        } catch {
          setCards((prev) =>
            prev.map((c) => (c.id === optimistic.id ? { ...created, tasks: [] } : c))
          );
        }
      } else {
        setCards((prev) =>
          prev.map((c) => (c.id === optimistic.id ? { ...created, tasks: [] } : c))
        );
      }

      notify(`Card duplicado. ${clonedCount > 0 ? `${clonedCount} tarefas copiadas.` : ""}`);
      return created.id;
    } catch {
      setCards((prev) => prev.filter((c) => c.id !== optimistic.id));
      notify("Erro ao duplicar card");
      return null;
    }
  }, [cards]);

  const archiveCard = useCallback(async (cardId: string) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, isArchived: true } : c)));
    try {
      await atualizarCard(cardId, { isArchived: true }, await getToken());
    } catch (err) {
      console.error("[archiveCard] Erro:", err);
      setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, isArchived: false } : c)));
      notify("Erro ao arquivar card");
    }
  }, []);

  const unarchiveCard = useCallback(async (cardId: string) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, isArchived: false } : c)));
    try {
      await atualizarCard(cardId, { isArchived: false }, await getToken());
    } catch (err) {
      console.error("[unarchiveCard] Erro:", err);
      setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, isArchived: true } : c)));
      notify("Erro ao desarquivar card");
    }
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => c.tags?.forEach((t) => set.add(t)));
    tasks.forEach((t) => t.tags?.forEach((tag) => set.add(tag)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cards, tasks]);

  const setTagColor = useCallback((tag: string, color: string) => {
    setTagColorsState((prev) => {
      const next = { ...prev, [tag]: color };
      localStorage.setItem("kanban-tag-colors", JSON.stringify(next));
      return next;
    });
  }, []);

  const getTagColor = useCallback((tag: string) => {
    const saved = tagColors[tag];
    if (saved) return saved;
    const palette = [
      "#ef4444", "#f97316", "#f59e0b", "#84cc16",
      "#10b981", "#06b6d4", "#3b82f6", "#6366f1",
      "#8b5cf6", "#d946ef", "#f43f5e", "#78716c",
    ];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    const index = Math.abs(hash) % palette.length;
    return palette[index];
  }, [tagColors]);

  return {
    columns,
    cards,
    tasks,
    allTags,
    tagColors,
    loading,
    favoriteIds: optimisticFavoriteIds,
    isAddingFavorite: (id: string) => addingFavoriteIds.has(id),
    addColumn,
    updateColumnTitle,
    updateColumnColor,
    removeColumn,
    reorderColumn,
    moveCard,
    reorderCard,
    updateCard,
    updateCardNotes,
    toggleEstimateTaskCompleted,
    removeCard,
    addCardTask,
    updateCardTask,
    toggleCardTaskCompleted,
    removeCardTask,
    reorderCardTask,
    toggleCardTemplate,
    setDefaultTemplate,
    createTemplateCard,
    addCard,
    favoriteEstimativa,
    useTemplateAsBase,
    createTemplate,
    duplicateCard,
    archiveCard,
    unarchiveCard,
    setTagColor,
    getTagColor,
  };
}
