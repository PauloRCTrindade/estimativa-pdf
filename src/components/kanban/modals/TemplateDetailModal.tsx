import { useState, useMemo, useEffect } from "react";
import type { KanbanCard, KanbanCustomTask } from "@/types";
import {
  countTasks,
  countCompleted,
} from "@/components/kanban/shared/kanbanHelpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { stripHtml } from "@/lib/rich-text";
import { cn } from "@/lib/utils";
import {
  Plus, Trash, CaretRight, Check, ListChecks,
  X, ArrowLeft,
} from "@phosphor-icons/react";

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

type ModalView =
  | { type: "card"; cardId: string }
  | { type: "task"; path: KanbanCustomTask[] };

export interface TemplateDetailModalProps {
  open: boolean;
  onClose: () => void;
  card: KanbanCard;
  onUpdateCard: (cardId: string, patch: Partial<Omit<KanbanCard, "id" | "tasks">>) => void;
  onAddCardTask: (cardId: string, task: Omit<KanbanCustomTask, "id" | "completed" | "subtasks">, parentTaskId?: string) => void;
  onUpdateCardTask: (cardId: string, taskId: string, patch: Partial<Omit<KanbanCustomTask, "id" | "subtasks">>) => void;
  onToggleCardTaskCompleted: (cardId: string, taskId: string) => void;
  onRemoveCardTask: (cardId: string, taskId: string) => void;
  onReorderCardTask: (cardId: string, parentTaskId: string | null, sourceIndex: number, destIndex: number) => void;
  onRemoveCard: (cardId: string) => void;
  onRequestDelete?: (cardId: string) => void;
}

export function TemplateDetailModal({
  open,
  onClose,
  card,
  onUpdateCard,
  onAddCardTask,
  onUpdateCardTask,
  onToggleCardTaskCompleted,
  onRemoveCardTask,
  onReorderCardTask,
  onRemoveCard,
  onRequestDelete,
}: TemplateDetailModalProps) {
  const [view, setView] = useState<ModalView>({ type: "card", cardId: card.id });
  const [animationKey, setAnimationKey] = useState(0);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskDraft, setSubtaskDraft] = useState({ title: "", description: "" });
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setView({ type: "card", cardId: card.id });
      setAnimationKey((k) => k + 1);
    }
  }, [open, card.id]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const currentTask = useMemo(() => {
    if (view.type === "card") return null;
    let tasks = card.tasks;
    let task: KanbanCustomTask | undefined;
    for (const pathTask of view.path) {
      task = tasks?.find((t) => t.id === pathTask.id);
      if (!task) break;
      tasks = task.subtasks;
    }
    return task ?? null;
  }, [view, card.tasks, card.id]);

  const currentSubtasks = useMemo(() => {
    if (view.type === "card") return card.tasks ?? [];
    return currentTask?.subtasks ?? [];
  }, [view, card.tasks, card.id, currentTask]);

  function goToParent() {
    if (view.type === "task") {
      if (view.path.length === 1) {
        setView({ type: "card", cardId: card.id });
      } else {
        setView({ type: "task", path: view.path.slice(0, -1) });
      }
      setAnimationKey((k) => k + 1);
    }
  }

  function navigateToTask(task: KanbanCustomTask) {
    if (view.type === "card") {
      setView({ type: "task", path: [task] });
    } else {
      setView({ type: "task", path: [...view.path, task] });
    }
    setAnimationKey((k) => k + 1);
    setAddingSubtask(false);
  }

  function submitSubtask() {
    const title = subtaskDraft.title.trim();
    if (!title) return;
    const description = stripHtml(subtaskDraft.description).trim()
      ? subtaskDraft.description.trim()
      : "";
    const parentId = view.type === "task" && currentTask ? currentTask.id : undefined;
    onAddCardTask(card.id, { title, description: description || undefined }, parentId);
    setSubtaskDraft({ title: "", description: "" });
    setAddingSubtask(false);
  }

  const isTaskView = view.type === "task" && currentTask;
  const displayTitle = isTaskView ? currentTask.title : card.title;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose} />
      <div
        className="relative z-10 flex w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10 animate-in fade-in zoom-in-95 duration-200 sm:max-w-xl max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-xs text-muted-foreground">
            {view.type === "task" && (
              <button
                onClick={goToParent}
                className="flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {view.path.length === 1 ? card.title : view.path[view.path.length - 2]?.title}
                </span>
              </button>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => {
                if (onRequestDelete) {
                  onRequestDelete(card.id);
                } else {
                  onRemoveCard(card.id);
                }
                onClose();
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Deletar template"
            >
              <Trash className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          key={animationKey}
          className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-5 md:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
            {/* Title */}
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                {editingTitle ? (
                  <div className="space-y-2">
                    <Input
                      autoFocus
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const t = titleDraft.trim();
                          if (t) onUpdateCard(card.id, { title: t });
                          setEditingTitle(false);
                        }
                        if (e.key === "Escape") setEditingTitle(false);
                      }}
                      onBlur={() => {
                        const t = titleDraft.trim();
                        if (t) onUpdateCard(card.id, { title: t });
                        setEditingTitle(false);
                      }}
                      className="text-base font-semibold"
                    />
                  </div>
                ) : (
                  <h2
                    onClick={() => {
                      setTitleDraft(displayTitle || "");
                      setEditingTitle(true);
                    }}
                    className="text-lg font-semibold leading-snug break-words cursor-text hover:bg-accent/40 rounded px-1 -ml-1 py-0.5 transition-colors"
                  >
                    {displayTitle || "Sem título"}
                  </h2>
                )}
              </div>
            </div>

            {/* Template info */}
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Este é um <strong>modelo de tarefas</strong>. As tarefas aqui serão copiadas para novos cards quando uma estimativa for favoritada ou quando um card for duplicado.
            </div>

            {/* Tasks */}
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                {isTaskView ? "Subtarefas" : "Tarefas"}
                <span className="ml-auto text-xs text-muted-foreground">
                  {countCompleted(currentSubtasks)}/{countTasks(currentSubtasks)}
                </span>
              </div>
              <div className="space-y-1">
                {currentSubtasks.map((task, index) => (
                  <div key={task.id} className="relative">
                    {dragOverTaskId === task.id && draggingTaskId !== task.id && (
                      <div className="absolute -top-0.5 left-0 right-0 h-0.5 rounded-full bg-primary z-10" />
                    )}
                    <div
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", task.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDraggingTaskId(task.id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (draggingTaskId && draggingTaskId !== task.id) {
                          setDragOverTaskId(task.id);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const draggedId = e.dataTransfer.getData("text/plain");
                        if (!draggedId || draggedId === task.id) {
                          setDraggingTaskId(null);
                          setDragOverTaskId(null);
                          return;
                        }
                        const sourceIdx = currentSubtasks.findIndex((t) => t.id === draggedId);
                        const destIdx = index;
                        if (sourceIdx !== -1 && sourceIdx !== destIdx) {
                          const parentId = isTaskView && currentTask ? currentTask.id : null;
                          onReorderCardTask(card.id, parentId, sourceIdx, destIdx);
                        }
                        setDraggingTaskId(null);
                        setDragOverTaskId(null);
                      }}
                      onDragLeave={() => setDragOverTaskId(null)}
                      onDragEnd={() => {
                        setDraggingTaskId(null);
                        setDragOverTaskId(null);
                      }}
                      onClick={() => {
                        if (!draggingTaskId) navigateToTask(task);
                      }}
                      className={cn(
                        "group flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/30",
                        draggingTaskId === task.id && "opacity-50"
                      )}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleCardTaskCompleted(card.id, task.id); }}
                        className={cn(
                          "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-all",
                          task.completed
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-muted-foreground/25 hover:border-muted-foreground/50"
                        )}
                      >
                        {task.completed && <Check weight="bold" className="h-2.5 w-2.5" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <span className={cn("text-sm break-words", task.completed && "text-muted-foreground line-through")}>
                          {task.title}
                        </span>
                        {task.subtasks && task.subtasks.length > 0 && (
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <ListChecks className="h-3 w-3" />
                              {countCompleted(task.subtasks)}/{countTasks(task.subtasks)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigateToTask(task); }}
                          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Abrir"
                        >
                          <CaretRight className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onRemoveCardTask(card.id, task.id); }}
                          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Remover"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add subtask inline */}
                {!addingSubtask ? (
                  <button
                    onClick={() => setAddingSubtask(true)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/30 hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar {isTaskView ? "subtarefa" : "tarefa"}
                  </button>
                ) : (
                  <div className="space-y-2 rounded-lg border border-border/60 bg-background p-3">
                    <Input
                      autoFocus
                      value={subtaskDraft.title}
                      onChange={(e) => setSubtaskDraft((p) => ({ ...p, title: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitSubtask();
                        if (e.key === "Escape") { setAddingSubtask(false); setSubtaskDraft({ title: "", description: "" }); }
                      }}
                      placeholder={`Nome da ${isTaskView ? "subtarefa" : "tarefa"}`}
                      className="h-8"
                    />
                    <RichTextEditor
                      defaultValue={subtaskDraft.description}
                      onChange={(html) => setSubtaskDraft((p) => ({ ...p, description: html }))}
                      placeholder="Descrição (opcional)"
                      minHeight="80px"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setAddingSubtask(false); setSubtaskDraft({ title: "", description: "" }); }}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={submitSubtask}>Adicionar</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
