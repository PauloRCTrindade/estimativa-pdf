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
import { createId, buildTaskTree, flattenTaskTree } from "@/utils";

function notify(msg: string) {
  // Simple notification fallback
  if (typeof window !== "undefined") {
    console.log("[Notify]", msg);
  }
}

function getToken(): string | undefined {
  try {
    const session = JSON.parse(localStorage.getItem('sb-' + (import.meta.env.VITE_SUPABASE_URL?.match(/https:\/\/(.+)\.supabase\.co/)?.[1] || '') + '-auth-token') || 'null');
    return session?.access_token;
  } catch {
    return undefined;
  }
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
        const created = await criarColumn({ title: col.title, position: columns.indexOf(col) }, getToken());
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
        });
        createdCards.push(created);

        // Flatten tasks and create
        if (card.tasks && card.tasks.length > 0) {
          const flatTasks = flattenTaskTree(card.tasks, created.id);
          for (const ft of flatTasks) {
            try {
              const createdTask = await criarTask({
                cardId: created.id,
                parentId: ft.parentId,
                title: ft.title,
                description: ft.description,
                completed: ft.completed,
                priority: ft.priority,
                assignee: ft.assignee,
                dueDate: ft.dueDate,
                tags: ft.tags,
                checklist: ft.checklist,
                comments: ft.comments,
                attachments: ft.attachments,
              }, getToken());
              allTasks.push(createdTask);
            } catch {
              // ignore individual task creation errors
            }
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

  const favoriteIds = useMemo(() => cards.filter((c) => c.estimateId).map((c) => c.estimateId!), [cards]);
  const optimisticFavoriteIds = useMemo(() => {
    const ids = new Set(favoriteIds);
    addingFavoriteIds.forEach((id) => ids.add(id));
    return Array.from(ids);
  }, [favoriteIds, addingFavoriteIds]);

  useEffect(() => {
    let mounted = true;
    carregarBoard(getToken())
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
      const created = await criarColumn({ title, position: columns.length }, getToken());
      setColumns((prev) => prev.map((c) => (c.id === optimistic.id ? created : c)));
    } catch {
      setColumns((prev) => prev.filter((c) => c.id !== optimistic.id));
      notify("Erro ao criar coluna");
    }
  }, [columns.length]);

  const updateColumnTitle = useCallback(async (id: string, title: string) => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    try {
      await atualizarColumn(id, { title }, getToken());
    } catch {
      notify("Erro ao atualizar coluna");
    }
  }, []);

  const removeColumn = useCallback(async (id: string) => {
    const prevColumns = columns;
    const prevCards = cards;
    const prevTasks = tasks;
    setColumns((prev) => prev.filter((c) => c.id !== id));
    const removedCardIds = cards.filter((c) => c.columnId === id).map((c) => c.id);
    setCards((prev) => prev.filter((c) => c.columnId !== id));
    setTasks((prev) => prev.filter((t) => !removedCardIds.includes(t.cardId)));
    try {
      await deletarColumn(id, getToken());
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
      await Promise.all(
        positionUpdates.map((u) => atualizarColumn(u.id, { position: u.position }, getToken()))
      );
    } catch {
      notify("Erro ao reordenar colunas");
    }
  }, [columns]);

  /* ── Cards ───────────────────────────────────────────────────────────── */

  const moveCard = useCallback(async (cardId: string, columnId: string) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, columnId } : c)));
    try {
      await atualizarCard(cardId, { columnId }, getToken());
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
      await Promise.all(
        positionUpdates.map((u) => atualizarCard(u.id, { position: u.position, columnId: u.columnId }, getToken()))
      );
    } catch {
      notify("Erro ao reordenar cards");
    }
  }, [cards]);

  const updateCard = useCallback(async (cardId: string, patch: Partial<Omit<KanbanCard, "id" | "tasks">>) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, ...patch } : c)));
    try {
      await atualizarCard(cardId, patch, getToken());
    } catch {
      notify("Erro ao atualizar card");
    }
  }, []);

  const updateCardNotes = useCallback(async (cardId: string, notes: string) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, notes } : c)));
    try {
      await atualizarCard(cardId, { notes }, getToken());
    } catch {
      notify("Erro ao atualizar notas");
    }
  }, []);

  const removeCard = useCallback(async (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setTasks((prev) => prev.filter((t) => t.cardId !== cardId));
    try {
      await deletarCard(cardId, getToken());
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
      }, getToken());
      setTasks((prev) => [...prev, created]);
    } catch {
      notify("Erro ao criar tarefa");
    }
  }, []);

  const updateCardTask = useCallback(async (cardId: string, taskId: string, patch: Partial<Omit<KanbanCustomTask, "id" | "subtasks">>) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, tasks: updateTaskTree(c.tasks, taskId, (t) => ({ ...t, ...patch })) } : c)));
    try {
      const flatPatch: Partial<KanbanTask> = { ...patch };
      await atualizarTask(taskId, flatPatch, getToken());
    } catch {
      notify("Erro ao atualizar tarefa");
    }
  }, []);

  const toggleCardTaskCompleted = useCallback(async (cardId: string, taskId: string) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, tasks: updateTaskTree(c.tasks, taskId, (t) => ({ ...t, completed: !t.completed })) } : c)));
    try {
      const task = tasks.find((t) => t.id === taskId);
      if (task) await atualizarTask(taskId, { completed: !task.completed }, getToken());
    } catch {
      notify("Erro ao alternar tarefa");
    }
  }, [tasks]);

  const removeCardTask = useCallback(async (cardId: string, taskId: string) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, tasks: removeFromTree(c.tasks, taskId) ?? [] } : c)));
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await deletarTask(taskId, getToken());
    } catch {
      notify("Erro ao deletar tarefa");
    }
  }, []);

  /* ── Template helpers ────────────────────────────────────────────────── */

  const toggleCardTemplate = useCallback(async (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const next = !card.isTemplate;
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, isTemplate: next, isDefaultTemplate: next ? c.isDefaultTemplate : false } : c)));
    try {
      await atualizarCard(cardId, { isTemplate: next, isDefaultTemplate: next ? card.isDefaultTemplate : false }, getToken());
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
        await atualizarCard(t.id, { isDefaultTemplate: false }, getToken());
      }
      await atualizarCard(cardId, { isDefaultTemplate: true }, getToken());
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
      }, getToken());
      setCards((prev) => prev.map((c) => (c.id === optimistic.id ? { ...created, tasks: [] } : c)));
      return created.id;
    } catch {
      setCards((prev) => prev.filter((c) => c.id !== optimistic.id));
      notify("Erro ao criar card");
      return null;
    }
  }, [cards.length]);

  const addCard = useCallback(async (columnId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return null;
    const optimistic: KanbanCard = {
      id: createId(),
      columnId,
      title: trimmed,
      tasks: [],
    };
    setCards((prev) => [...prev, optimistic]);
    try {
      const created = await criarCard({
        columnId,
        title: trimmed,
        position: cards.length,
      }, getToken());
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
      const defaultCol = await criarColumn({ title: "Backlog", position: 0 }, getToken());
      targetColumnId = defaultCol.id;
      setColumns((prev) => [...prev, defaultCol]);
    }

    const newCard: Omit<KanbanCard, "id" | "tasks"> = {
      columnId: targetColumnId,
      estimateId: item.id,
      title: item.titulo || item.nome || "Estimativa sem título",
    };

    try {
      const created = await criarCard(newCard, getToken());

      // Apply default template
      const defaultTemplate = cards.find((c) => c.isTemplate && c.isDefaultTemplate);
      let clonedCount = 0;

      if (defaultTemplate && defaultTemplate.tasks && defaultTemplate.tasks.length > 0) {
        const flatOriginal = flattenTaskTree(defaultTemplate.tasks, created.id);
        // We need to remap parentIds because new tasks get new IDs
        const idMap = new Map<string, string>();
        const newFlatTasks = flatOriginal.map((t) => {
          const newId = createId();
          idMap.set(t.id, newId);
          return {
            ...t,
            id: newId,
            cardId: created.id,
            parentId: t.parentId ? idMap.get(t.parentId) || null : null,
            completed: false,
          };
        });

        for (const task of newFlatTasks) {
          try {
            await criarTask({
              cardId: task.cardId,
              parentId: task.parentId,
              title: task.title,
              description: task.description,
              completed: false,
              priority: task.priority,
              assignee: task.assignee,
              dueDate: task.dueDate,
              tags: task.tags,
              checklist: task.checklist,
              comments: task.comments,
              attachments: task.attachments,
            }, getToken());
            clonedCount++;
          } catch {
            // ignore individual clone errors
          }
        }

        // Reload tasks to reflect clones
        const { tasks: allTasks } = await carregarBoard(getToken());
        setTasks(allTasks);
        setCards((prev) => [
          ...prev,
          { ...created, tasks: buildTaskTree(allTasks.filter((t) => t.cardId === created.id)) },
        ]);
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

  return {
    columns,
    cards,
    tasks,
    loading,
    favoriteIds: optimisticFavoriteIds,
    isAddingFavorite: (id: string) => addingFavoriteIds.has(id),
    addColumn,
    updateColumnTitle,
    removeColumn,
    reorderColumn,
    moveCard,
    reorderCard,
    updateCard,
    updateCardNotes,
    removeCard,
    addCardTask,
    updateCardTask,
    toggleCardTaskCompleted,
    removeCardTask,
    toggleCardTemplate,
    setDefaultTemplate,
    createTemplateCard,
    addCard,
    favoriteEstimativa,
  };
}
