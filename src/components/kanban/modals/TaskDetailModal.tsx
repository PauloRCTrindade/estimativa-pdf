import { useState, useMemo, useEffect } from "react";
import type { Estimativa, KanbanCard, KanbanCustomTask, TaskPriority, KanbanColumn } from "@/types";
import {
  formatDateBR,
  formatDateRelative,
  buildEstimateCalendar,
  getTasksForEstimate,
  PRIORITY_CONFIG,
  countTasks,
  countCompleted,
  findTaskInTree,
  getTaskPath,
} from "@/components/kanban/shared/kanbanHelpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePicker } from "@/components/date-picker";
import { TagSelector } from "@/components/kanban/shared/TagSelector";
import { COLORS } from "@/styles";
import { cn } from "@/lib/utils";
import {
  Plus, Trash, CaretRight, Check, CalendarBlank, Note, ListChecks,
  Clock, X, Flag, User, Tag, Paperclip, ChatText,
  CheckCircle, CaretDown, ArrowLeft, Archive, ArrowCounterClockwise, Copy,
  SquareSplitHorizontal,
} from "@phosphor-icons/react";

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Priority sub-components
   ═══════════════════════════════════════════════════════════════════════════ */

function PriorityFlag({ priority, size = 16 }: { priority?: TaskPriority; size?: number }) {
  const cfg = PRIORITY_CONFIG[priority || "p4"];
  return <Flag weight="fill" className={cn("shrink-0", cfg.color)} style={{ width: size, height: size }} />;
}

function PrioritySelect({ value, onChange }: { value?: TaskPriority; onChange: (p: TaskPriority) => void }) {
  return (
    <div className="flex flex-col gap-1">
      {( ["p1", "p2", "p3", "p4"] as TaskPriority[] ).map((p) => {
        const cfg = PRIORITY_CONFIG[p];
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              value === p ? cfg.bg : "hover:bg-accent",
              value === p && cfg.border && "border"
            )}
          >
            <Flag weight="fill" className={cfg.color} style={{ width: 14, height: 14 }} />
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════ */

type ModalView =
  | { type: "card"; cardId: string }
  | { type: "task"; path: KanbanCustomTask[] };

export interface TaskDetailModalProps {
  open: boolean;
  onClose: () => void;
  card: KanbanCard;
  columnTitle: string;
  columns: KanbanColumn[];
  estimativas: Estimativa[];
  feriados?: string[];
  releases?: string[];
  allTags?: string[];
  getTagColor?: (tag: string) => { bg: string; text: string; border: string } | string;
  setTagColor?: (tag: string, color: string) => void;
  onUpdateCard: (cardId: string, patch: Partial<Omit<KanbanCard, "id" | "tasks">>) => void;
  onUpdateCardNotes: (cardId: string, notes: string) => void;
  onAddCardTask: (cardId: string, task: Omit<KanbanCustomTask, "id" | "completed" | "subtasks">, parentTaskId?: string) => void;
  onUpdateCardTask: (cardId: string, taskId: string, patch: Partial<Omit<KanbanCustomTask, "id" | "subtasks">>) => void;
  onToggleCardTaskCompleted: (cardId: string, taskId: string) => void;
  onToggleEstimateTaskCompleted: (cardId: string, taskId: string) => void;
  onRemoveCardTask: (cardId: string, taskId: string) => void;
  onReorderCardTask: (cardId: string, parentTaskId: string | null, sourceIndex: number, destIndex: number) => void;
  onRemoveCard: (cardId: string) => void;
  onDuplicateCard?: (cardId: string) => Promise<string | null>;
  onArchiveCard: (cardId: string) => void;
  onUnarchiveCard: (cardId: string) => void;
  onRequestDelete?: (cardId: string) => void;
  onMoveCard?: (cardId: string, columnId: string) => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */

export function TaskDetailModal({
  open,
  onClose,
  card,
  columnTitle,
  columns,
  estimativas,
  feriados,
  releases,
  allTags,
  getTagColor,
  setTagColor,
  onUpdateCard,
  onUpdateCardNotes,
  onAddCardTask,
  onUpdateCardTask,
  onToggleCardTaskCompleted,
  onToggleEstimateTaskCompleted,
  onRemoveCardTask,
  onReorderCardTask,
  onRemoveCard,
  onDuplicateCard,
  onArchiveCard,
  onUnarchiveCard,
  onRequestDelete,
  onMoveCard,
}: TaskDetailModalProps) {
  const [view, setView] = useState<ModalView>({ type: "card", cardId: card.id });
  const [animationKey, setAnimationKey] = useState(0);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskDraft, setSubtaskDraft] = useState({ title: "", description: "" });
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [checklistDraft, setChecklistDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    subtarefas: true,
    checklist: true,
    comentarios: true,
    anexos: true,
    estimativa: true,
  });
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [largeCalendar, setLargeCalendar] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setView({ type: "card", cardId: card.id });
      setAnimationKey((k) => k + 1);
    }
  }, [open, card.id]);

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

  function updateCurrentTask(patch: Partial<Omit<KanbanCustomTask, "id" | "subtasks">>) {
    if (!currentTask) return;
    onUpdateCardTask(card.id, currentTask.id, patch);
  }

  function submitSubtask() {
    const title = subtaskDraft.title.trim();
    if (!title) return;
    const parentId = view.type === "task" && currentTask ? currentTask.id : undefined;
    onAddCardTask(card.id, { title, description: subtaskDraft.description.trim() }, parentId);
    setSubtaskDraft({ title: "", description: "" });
    setAddingSubtask(false);
  }

  function submitChecklistItem() {
    const title = checklistDraft.trim();
    if (!title || !currentTask) return;
    const checklist = [...(currentTask.checklist ?? []), { id: createId(), title, completed: false }];
    updateCurrentTask({ checklist });
    setChecklistDraft("");
    setAddingChecklist(false);
  }

  function toggleChecklistItem(itemId: string) {
    if (!currentTask) return;
    const checklist = (currentTask.checklist ?? []).map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    updateCurrentTask({ checklist });
  }

  function removeChecklistItem(itemId: string) {
    if (!currentTask) return;
    const checklist = (currentTask.checklist ?? []).filter((item) => item.id !== itemId);
    updateCurrentTask({ checklist });
  }

  function submitComment() {
    const text = commentDraft.trim();
    if (!text || !currentTask) return;
    const comments = [
      ...(currentTask.comments ?? []),
      { id: createId(), author: "Eu", text, createdAt: new Date().toISOString() },
    ];
    updateCurrentTask({ comments });
    setCommentDraft("");
  }

  function removeComment(commentId: string) {
    if (!currentTask) return;
    const comments = (currentTask.comments ?? []).filter((c) => c.id !== commentId);
    updateCurrentTask({ comments });
  }

  function addAttachment() {
    if (!currentTask) return;
    const name = prompt("Nome do anexo:");
    if (!name) return;
    const url = prompt("URL do anexo:");
    if (!url) return;
    const attachments = [
      ...(currentTask.attachments ?? []),
      { id: createId(), name, url, type: "link" as const },
    ];
    updateCurrentTask({ attachments });
  }

  function removeAttachment(attachmentId: string) {
    if (!currentTask) return;
    const attachments = (currentTask.attachments ?? []).filter((a) => a.id !== attachmentId);
    updateCurrentTask({ attachments });
  }

  function toggleSection(section: string) {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  const estimate = useMemo(() => estimativas.find((e) => e.id === card.estimateId && e.tipo === "estimativa-pacotes"), [estimativas, card.estimateId]);
  const estimateTasks = useMemo(() => (estimate ? getTasksForEstimate(estimate) : []), [estimate]);

  const isTaskView = view.type === "task" && currentTask;
  const displayTitle = isTaskView ? currentTask.title : card.title;
  const displayDescription = isTaskView ? currentTask.description : card.notes;
  const displayCompleted = isTaskView ? currentTask.completed : false;
  const displayPriority = isTaskView ? currentTask.priority : card.priority;
  const displayAssignee = isTaskView ? currentTask.assignee : card.assignee;
  const displayDueDate = isTaskView ? currentTask.dueDate : card.dueDate;
  const displayTags = isTaskView ? currentTask.tags : card.tags;
  const displayChecklist = isTaskView ? currentTask.checklist : [];
  const displayComments = isTaskView ? currentTask.comments : [];
  const displayAttachments = isTaskView ? currentTask.attachments : [];

  // Handle ESC key to close modal
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose} />
      {/* Modal */}
      <div
        className="relative z-10 grid w-full max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10 animate-in fade-in zoom-in-95 duration-200 sm:max-w-3xl"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header: Parent navigation + close + template controls */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-5 py-3">
          <div className="flex items-center gap-1 overflow-hidden text-xs text-muted-foreground min-w-0">
            {view.type === "task" && (
              <button
                onClick={goToParent}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate max-w-[240px] sm:max-w-[320px]">
                  {view.path.length === 1 ? card.title : view.path[view.path.length - 2]?.title}
                </span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!card.isTemplate && onMoveCard && (
              <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-foreground transition-colors hover:bg-accent/40">
                <SquareSplitHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={card.columnId}
                  disabled={card.isArchived}
                  onChange={(e) => {
                    if (!card.isArchived) {
                      onMoveCard(card.id, e.target.value);
                    }
                  }}
                  className="h-5 bg-transparent text-xs font-medium text-foreground outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {columns.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((col) => (
                    <option key={col.id} value={col.id}>{col.title}</option>
                  ))}
                </select>
              </div>
            )}
            {onDuplicateCard && (
              <button
                onClick={async () => {
                  await onDuplicateCard(card.id);
                  onClose();
                }}
                className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                title="Duplicar card"
              >
                <Copy className="h-4 w-4" />
                Duplicar
              </button>
            )}
            {card.isArchived ? (
              <button
                onClick={() => { onUnarchiveCard(card.id); onClose(); }}
                className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                title="Restaurar card"
              >
                <ArrowCounterClockwise className="h-4 w-4" />
                Restaurar
              </button>
            ) : (
              <button
                onClick={() => { onArchiveCard(card.id); onClose(); }}
                className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                title="Arquivar card"
              >
                <Archive className="h-4 w-4" />
                Arquivar
              </button>
            )}
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
              title="Deletar card"
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

        <ScrollArea className="max-h-[calc(90vh-60px)]">
          <div
            key={animationKey}
            className="grid grid-cols-1 md:grid-cols-[1fr_260px] animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            {/* ═════ Main Column ═════ */}
            <div className="p-5 md:p-6 space-y-6">
              {/* Title */}
              <div className="flex items-start gap-3">
                {isTaskView ? (
                  <button
                    onClick={() => {
                      if (currentTask) {
                        onToggleCardTaskCompleted(card.id, currentTask.id);
                      }
                    }}
                    className={cn(
                      "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150",
                      displayCompleted
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-muted-foreground/30 hover:border-muted-foreground/60"
                    )}
                  >
                    {displayCompleted && <Check weight="bold" className="h-3 w-3" />}
                  </button>
                ) : (
                  <button
                    onClick={() => onUpdateCard(card.id, { completed: !card.completed })}
                    className={cn(
                      "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150",
                      card.completed
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-muted-foreground/30 hover:border-muted-foreground/60"
                    )}
                  >
                    {card.completed && <Check weight="bold" className="h-3 w-3" />}
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  {editingTitle && isTaskView ? (
                    <div className="space-y-2">
                      <Textarea
                        autoFocus
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (currentTask) {
                              onUpdateCardTask(card.id, currentTask.id, { title: titleDraft.trim() });
                            }
                            setEditingTitle(false);
                          }
                          if (e.key === "Escape") setEditingTitle(false);
                        }}
                        className="min-h-0 resize-none text-base font-semibold"
                        rows={2}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (currentTask) {
                              onUpdateCardTask(card.id, currentTask.id, { title: titleDraft.trim() });
                            }
                            setEditingTitle(false);
                          }}
                        >
                          Salvar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingTitle(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <h2
                      onClick={() => {
                        if (isTaskView) {
                          setTitleDraft(displayTitle || "");
                          setEditingTitle(true);
                        }
                      }}
                      className={cn(
                        "text-lg font-semibold leading-snug transition-colors",
                        isTaskView && "cursor-text hover:bg-accent/40 rounded px-1 -ml-1 py-0.5",
                        (displayCompleted || (!isTaskView && card.completed)) && "text-muted-foreground line-through"
                      )}
                    >
                      {displayTitle || "Sem título"}
                    </h2>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                {editingDescription ? (
                  <div className="space-y-2">
                    <Textarea
                      autoFocus
                      value={descriptionDraft}
                      onChange={(e) => setDescriptionDraft(e.target.value)}
                      placeholder="Adicionar descrição..."
                      rows={4}
                      className="resize-none text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (isTaskView && currentTask) {
                            onUpdateCardTask(card.id, currentTask.id, { description: descriptionDraft.trim() });
                          } else {
                            onUpdateCardNotes(card.id, descriptionDraft.trim());
                          }
                          setEditingDescription(false);
                        }}
                      >
                        Salvar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingDescription(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setDescriptionDraft(displayDescription || "");
                      setEditingDescription(true);
                    }}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-accent/30",
                      !displayDescription && "text-muted-foreground"
                    )}
                  >
                    <Note className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className={cn("leading-relaxed", !displayDescription && "italic")}>
                      {displayDescription || "Adicionar descrição"}
                    </span>
                  </button>
                )}
              </div>

              {/* Estimate tasks - only at card level and not template */}
              {!isTaskView && !card.isTemplate && estimateTasks.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleSection("estimativa")}
                    className="flex w-full items-center gap-2 text-sm font-medium text-foreground mb-2"
                  >
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                    Tarefas Principais
                    <span className="ml-auto text-xs text-muted-foreground">{estimateTasks.length}</span>
                    <CaretDown className={cn("h-3 w-3 text-muted-foreground transition-transform", !expandedSections.estimativa && "-rotate-90")} />
                  </button>
                  {expandedSections.estimativa && (
                    <div className="space-y-1">
                      {estimateTasks.map((task) => {
                        const isChecked = card.completedEstimateTaskIds?.includes(task.id) ?? false;
                        return (
                          <div key={task.id} className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/30">
                            <button
                              onClick={() => onToggleEstimateTaskCompleted(card.id, task.id)}
                              className={cn(
                                "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-all",
                                isChecked
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
                              )}
                            >
                              {isChecked && <Check weight="bold" className="h-2.5 w-2.5" />}
                            </button>
                            <div className="min-w-0 flex-1">
                              <span className={cn("font-medium", isChecked && "text-muted-foreground line-through")}>
                                {task.title}
                              </span>
                              <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                                <span>Início: {formatDateBR(task.inicio)}</span>
                                <span>Término: {formatDateBR(task.termino)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Subtasks */}
              <div>
                <button
                  onClick={() => toggleSection("subtarefas")}
                  className="flex w-full items-center gap-2 text-sm font-medium text-foreground mb-2"
                >
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                  {isTaskView ? "Subtarefas" : "Tarefas Gerais"}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {countCompleted(currentSubtasks)}/{countTasks(currentSubtasks)}
                  </span>
                  <CaretDown className={cn("h-3 w-3 text-muted-foreground transition-transform", !expandedSections.subtarefas && "-rotate-90")} />
                </button>
                {expandedSections.subtarefas && (
                  <div className="space-y-1">
                    {currentSubtasks.map((task, index) => (
                      <div key={task.id} className="relative">
                        {/* Drop indicator */}
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
                            <span className={cn("text-sm", task.completed && "text-muted-foreground line-through")}>
                              {task.title}
                            </span>
                            {(task.dueDate || (task.subtasks && task.subtasks.length > 0)) && (
                              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                                {task.dueDate && (
                                  <span className="inline-flex items-center gap-1">
                                    <CalendarBlank className="h-3 w-3" />
                                    {formatDateRelative(task.dueDate)}
                                  </span>
                                )}
                                {task.subtasks && task.subtasks.length > 0 && (
                                  <span className="inline-flex items-center gap-1">
                                    <ListChecks className="h-3 w-3" />
                                    {countCompleted(task.subtasks)}/{countTasks(task.subtasks)}
                                  </span>
                                )}
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
                        Adicionar subtarefa
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
                          placeholder="Nome da subtarefa"
                          className="h-8"
                        />
                        <Textarea
                          value={subtaskDraft.description}
                          onChange={(e) => setSubtaskDraft((p) => ({ ...p, description: e.target.value }))}
                          placeholder="Descrição (opcional)"
                          rows={2}
                          className="resize-none text-sm"
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
                )}
              </div>

              {/* Calendar - only at card level and not template */}
              {!isTaskView && !card.isTemplate && estimate && (
                <div className="rounded-lg border border-border/60 bg-card">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CalendarBlank className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Calendário</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowCalendar((prev) => !prev)}>
                        {showCalendar ? "Ocultar" : "Visualizar"}
                      </Button>
                      {showCalendar && (
                        <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={() => setLargeCalendar((prev) => !prev)}>
                          {largeCalendar ? "Reduzir" : "Expandir"}
                        </Button>
                      )}
                    </div>
                  </div>
                  {showCalendar && (
                    <div className={cn("overflow-x-auto border-t border-border/60 px-3 py-3 text-[11px]", largeCalendar ? "max-h-[420px]" : "max-h-[240px]")}>
                      {(() => {
                        const calendar = buildEstimateCalendar(estimate);
                        if (!calendar || calendar.rows.length === 0) {
                          return <p className="text-xs text-muted-foreground">Calendário indisponível.</p>;
                        }
                        return (
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>Período:</span>
                              <span className="font-medium text-foreground">{formatDateBR(calendar.rangeStart?.toISOString() || "")}</span>
                              <span>→</span>
                              <span className="font-medium text-foreground">{formatDateBR(calendar.rangeEnd?.toISOString() || "")}</span>
                            </div>
                            {calendar.rows.map((row, rowIndex) => (
                              <div key={rowIndex} className="space-y-1">
                                <div className="grid gap-1 text-[10px] uppercase tracking-wider text-muted-foreground" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}>
                                  {row.map((day, index) => {
                                    const prevDay = index > 0 ? row[index - 1] : null;
                                    const showMonth = day && (!prevDay || prevDay.date.getMonth() !== day.date.getMonth());
                                    return <div key={index} className="h-4 text-center">{showMonth ? day.date.toLocaleString("pt-BR", { month: "short" }).toUpperCase() : ""}</div>;
                                  })}
                                </div>
                                <div className="grid gap-1 text-[10px] font-medium text-muted-foreground" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}>
                                  {row.map((day, index) => (
                                    <div key={index} className="flex h-5 items-center justify-center rounded-sm">
                                      {day ? ["D", "S", "T", "Q", "Q", "S", "S"][day.date.getDay()] : ""}
                                    </div>
                                  ))}
                                </div>
                                <div className="grid gap-1 text-[11px] font-semibold text-foreground" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}>
                                  {row.map((day, index) => (
                                    <div key={index} className={cn("flex h-7 items-center justify-center rounded-sm", day ? "bg-muted" : "bg-transparent")}>
                                      {day ? String(day.date.getDate()).padStart(2, "0") : ""}
                                    </div>
                                  ))}
                                </div>
                                <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}>
                                  {row.map((day, index) => {
                                    if (!day) return <div key={index} className="h-9 rounded-sm bg-muted/30" />;
                                    const badgeText = day.isReleaseDay ? "🚀" : day.isChg ? "CHG" : day.isEsteiraPreProd ? "PRE" : day.tipo === "feriado" ? "F" : day.tipo === "tombamento" ? "T" : day.tipo === "parado" ? "P" : "";
                                    const cellStyle = {
                                      backgroundColor: day.color || "transparent",
                                      border: day.isEsteiraPreProd ? `2px solid ${COLORS.esteiraPreProd}` : day.isChg ? `2px solid ${COLORS.chg}` : `1px solid hsl(var(--border) / 0.3)`,
                                    };
                                    return (
                                      <div
                                        key={index}
                                        className="flex h-9 items-center justify-center rounded-sm text-[10px] font-semibold text-zinc-950 dark:text-zinc-100"
                                        style={cellStyle}
                                      >
                                        <span>{badgeText}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Checklist */}
              {isTaskView && (
                <div>
                  <button
                    onClick={() => toggleSection("checklist")}
                    className="flex w-full items-center gap-2 text-sm font-medium text-foreground mb-2"
                  >
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    Checklist
                    <CaretDown className={cn("ml-auto h-3 w-3 text-muted-foreground transition-transform", !expandedSections.checklist && "-rotate-90")} />
                  </button>
                  {expandedSections.checklist && (
                    <div className="space-y-1">
                      {(displayChecklist ?? []).map((item) => (
                        <div key={item.id} className="group flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-accent/30">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => toggleChecklistItem(item.id)}
                            className="h-4 w-4 shrink-0 rounded border-muted-foreground/30"
                          />
                          <span className={cn("text-sm", item.completed && "text-muted-foreground line-through")}>
                            {item.title}
                          </span>
                          <button
                            onClick={() => removeChecklistItem(item.id)}
                            className="ml-auto flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {!addingChecklist ? (
                        <button
                          onClick={() => setAddingChecklist(true)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent/30 hover:text-foreground"
                        >
                          <Plus className="h-4 w-4" />
                          Adicionar item
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background p-2">
                          <Input
                            autoFocus
                            value={checklistDraft}
                            onChange={(e) => setChecklistDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") submitChecklistItem();
                              if (e.key === "Escape") { setAddingChecklist(false); setChecklistDraft(""); }
                            }}
                            placeholder="Novo item..."
                            className="h-8 text-sm"
                          />
                          <Button size="sm" onClick={submitChecklistItem}>Adicionar</Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Comments */}
              {isTaskView && (
                <div>
                  <button
                    onClick={() => toggleSection("comentarios")}
                    className="flex w-full items-center gap-2 text-sm font-medium text-foreground mb-2"
                  >
                    <ChatText className="h-4 w-4 text-muted-foreground" />
                    Comentários
                    <span className="ml-1 text-xs text-muted-foreground">{(displayComments ?? []).length}</span>
                    <CaretDown className={cn("ml-auto h-3 w-3 text-muted-foreground transition-transform", !expandedSections.comentarios && "-rotate-90")} />
                  </button>
                  {expandedSections.comentarios && (
                    <div className="space-y-3">
                      {(displayComments ?? []).map((comment) => (
                        <div key={comment.id} className="group flex gap-3 rounded-md p-2 transition-colors hover:bg-accent/20">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {comment.author.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{comment.author}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                            <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                          </div>
                          <button
                            onClick={() => removeComment(comment.id)}
                            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                          >
                            <Trash className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-background p-2">
                        <Textarea
                          value={commentDraft}
                          onChange={(e) => setCommentDraft(e.target.value)}
                          placeholder="Escrever um comentário..."
                          rows={2}
                          className="min-h-0 resize-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        <Button size="sm" className="shrink-0" onClick={submitComment} disabled={!commentDraft.trim()}>
                          Enviar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ═════ Sidebar ═════ */}
            <div className="border-t md:border-t-0 md:border-l border-border/60 bg-muted/30 p-5 space-y-5">
              {/* Project / Column */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Projeto</label>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary/70" />
                  <span className="truncate">{columnTitle}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="truncate text-muted-foreground">{card.title}</span>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Data de vencimento</label>
                <DatePicker
                  value={isTaskView ? (currentTask?.dueDate || currentTask?.termino || "") : (card.dueDate || "")}
                  onChange={(date) => {
                    if (isTaskView && currentTask) {
                      onUpdateCardTask(card.id, currentTask.id, { dueDate: date });
                    } else {
                      onUpdateCard(card.id, { dueDate: date });
                    }
                  }}
                  placeholder="Selecionar data"
                  className="h-8 text-sm"
                  dateFormat="iso"
                  feriados={feriados}
                  releases={releases}
                />
              </div>

              {/* Start / End dates (estimativa tasks only show if present) */}
              {isTaskView && (currentTask?.inicio || currentTask?.termino) && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Período</label>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatDateBR(currentTask?.inicio)}</span>
                    <span>→</span>
                    <span>{formatDateBR(currentTask?.termino)}</span>
                  </div>
                </div>
              )}

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Prioridade</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex w-full items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-sm transition-colors hover:bg-accent/40">
                      <PriorityFlag priority={displayPriority} size={14} />
                      <span>{PRIORITY_CONFIG[displayPriority || "p4"].label}</span>
                      <CaretDown className="ml-auto h-3 w-3 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="start">
                    <PrioritySelect
                      value={displayPriority}
                      onChange={(p) => {
                        if (isTaskView && currentTask) {
                          onUpdateCardTask(card.id, currentTask.id, { priority: p });
                        } else {
                          onUpdateCard(card.id, { priority: p });
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Assignee */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Responsável</label>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={displayAssignee || ""}
                    onChange={(e) => {
                      if (isTaskView && currentTask) {
                        onUpdateCardTask(card.id, currentTask.id, { assignee: e.target.value });
                      } else {
                        onUpdateCard(card.id, { assignee: e.target.value });
                      }
                    }}
                    placeholder="Nenhum"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Tags */}
              {!card.isTemplate && (
                <TagSelector
                  availableTags={allTags ?? []}
                  selectedTags={displayTags ?? []}
                  getTagColor={getTagColor}
                  setTagColor={setTagColor}
                  onChange={(tags) => {
                    if (isTaskView && currentTask) {
                      onUpdateCardTask(card.id, currentTask.id, { tags });
                    } else {
                      onUpdateCard(card.id, { tags });
                    }
                  }}
                />
              )}

              {/* Attachments */}
              {isTaskView && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Anexos</label>
                  <div className="space-y-1.5">
                    {(displayAttachments ?? []).map((att) => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm transition-colors hover:bg-accent/40"
                      >
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{att.name}</span>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeAttachment(att.id); }}
                          className="ml-auto flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                        >
                          <Trash className="h-3 w-3" />
                        </button>
                      </a>
                    ))}
                    <button
                      onClick={addAttachment}
                      className="flex w-full items-center gap-2 rounded-md border border-dashed border-border px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar anexo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
