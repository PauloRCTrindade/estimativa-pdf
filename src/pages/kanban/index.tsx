import { type DragEvent, useState, useMemo } from "react";
import type { Estimativa, KanbanColumn, KanbanCard, KanbanCustomTask } from "@/types";
import {
  extractYMD,
  makeLocalDate,
  todayLocal,
  formatDateRelative,
  countTasks,
  countCompleted,
  taskProgressPercent,
  PRIORITY_CONFIG_SIMPLE,
} from "@/components/kanban/shared/kanbanHelpers";
import { HojeView } from "./hoje-view";
import { TaskDetailModal } from "@/components/kanban/modals/TaskDetailModal";
import { TemplateDetailModal } from "@/components/kanban/modals/TemplateDetailModal";
import { ConfirmDeleteDialog } from "@/components/kanban/shared/ConfirmDeleteDialog";
import { ArchivedView } from "@/components/kanban/views/ArchivedView";
import { TemplatesView } from "@/components/kanban/views/TemplatesView";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash,
  Check,
  CalendarBlank,
  ListChecks,
  User,
  SquareSplitHorizontal,
  DotsSixVertical,
} from "@phosphor-icons/react";

/* ═══════════════════════════════════════════════════════════════════════════
   Tipos
   ═══════════════════════════════════════════════════════════════════════════ */

export type TaskStatus = "backlog" | "analise" | "desenvolvimento" | "qa" | "producao";

interface KanbanPageProps {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  estimativas: Estimativa[];
  loading?: boolean;
  onAddColumn: (title: string) => void;
  onUpdateColumnTitle: (id: string, title: string) => void;
  onRemoveColumn: (id: string) => void;
  onMoveCard: (cardId: string, columnId: string) => void;
  onUpdateCard: (cardId: string, patch: Partial<Omit<KanbanCard, "id" | "tasks">>) => void;
  onUpdateCardNotes: (cardId: string, notes: string) => void;
  onAddCardTask: (cardId: string, task: Omit<KanbanCustomTask, "id" | "completed" | "subtasks">, parentTaskId?: string) => void;
  onUpdateCardTask: (cardId: string, taskId: string, patch: Partial<Omit<KanbanCustomTask, "id" | "subtasks">>) => void;
  onToggleCardTaskCompleted: (cardId: string, taskId: string) => void;
  onRemoveCardTask: (cardId: string, taskId: string) => void;
  onReorderCardTask: (cardId: string, parentTaskId: string | null, sourceIndex: number, destIndex: number) => void;
  onRemoveCard: (cardId: string) => void;
  onAddCard: (columnId: string, title: string) => Promise<string | null>;
  onReorderCard: (cardId: string, beforeCardId: string | null, targetColumnId?: string) => void;
  onReorderColumn: (columnId: string, targetColumnId: string, placement: "before" | "after") => void;
  onArchiveCard: (cardId: string) => void;
  onUnarchiveCard: (cardId: string) => void;
  onUseTemplate: (templateCardId: string) => Promise<string | null>;
  onCreateTemplate: () => Promise<string | null>;
  onDuplicateCard?: (cardId: string) => Promise<string | null>;
}

function PriorityFlagSimple({ priority, size = 12 }: { priority?: import("@/types").TaskPriority; size?: number }) {
  const cfg = PRIORITY_CONFIG_SIMPLE[priority || "p4"];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={cfg.color}>
      <path d="M4 3h16v2.5l-2 1.5v8l2 1.5V19H4v-2.5l2-1.5v-8L4 5.5V3z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   KanbanPage
   ═══════════════════════════════════════════════════════════════════════════ */

export function KanbanPage({
  columns,
  cards,
  estimativas,
  onAddColumn,
  onUpdateColumnTitle,
  onRemoveColumn,
  onReorderColumn,
  onMoveCard,
  onUpdateCard,
  onUpdateCardNotes,
  onAddCardTask,
  onUpdateCardTask,
  onToggleCardTaskCompleted,
  onRemoveCardTask,
  onReorderCardTask,
  onRemoveCard,
  onAddCard,
  onReorderCard,
  onArchiveCard,
  onUnarchiveCard,
  onUseTemplate,
  onCreateTemplate,
  onDuplicateCard,
}: KanbanPageProps) {
  const [newColumnName, setNewColumnName] = useState("");
  const [error, setError] = useState("");
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [dragOverColumnReorderId, setDragOverColumnReorderId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState("");
  const [addingCardColumnId, setAddingCardColumnId] = useState<string | null>(null);
  const [newCardDraft, setNewCardDraft] = useState("");
  const [boardTitle, setBoardTitle] = useState(() => localStorage.getItem("kanban-board-title") || "Quadro Kanban");
  const [boardSubtitle, setBoardSubtitle] = useState(() => localStorage.getItem("kanban-board-subtitle") || "Organize suas estimativas e acompanhe o progresso.");
  const [editingBoardTitle, setEditingBoardTitle] = useState(false);
  const [boardTitleDraft, setBoardTitleDraft] = useState("");
  const [editingBoardSubtitle, setEditingBoardSubtitle] = useState(false);
  const [boardSubtitleDraft, setBoardSubtitleDraft] = useState("");
  const [deletingColumnId, setDeletingColumnId] = useState<string | null>(null);
  const deletingColumnTitle = useMemo(() => columns.find((c) => c.id === deletingColumnId)?.title || "", [columns, deletingColumnId]);
  const [kanbanSubtab, setKanbanSubtab] = useState<"ativos" | "hoje" | "arquivados" | "templates">("ativos");
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const selectedTemplate = useMemo(() => cards.find((c) => c.id === selectedTemplateId && c.isTemplate) ?? null, [cards, selectedTemplateId]);
  const selectedCard = useMemo(() => cards.find((c) => c.id === selectedCardId) ?? null, [cards, selectedCardId]);

  /* ── drag & drop ───────────────────────────────────────────────────────── */
  function handleDragStart(event: DragEvent<HTMLDivElement>, cardId: string) {
    event.dataTransfer.setData("text/plain", cardId);
    event.dataTransfer.effectAllowed = "move";
  }
  function handleDragOver(event: DragEvent<HTMLDivElement>, columnId: string) {
    if (event.dataTransfer.types.includes("column/id")) return;
    event.preventDefault();
    setDragOverColumnId(columnId);
  }
  function handleDragOverCard(event: DragEvent<HTMLDivElement>, cardId: string) {
    if (event.dataTransfer.types.includes("column/id")) return;
    event.preventDefault();
    event.stopPropagation();
    setDragOverCardId(cardId);
    event.dataTransfer.dropEffect = "move";
  }
  function handleDrop(event: DragEvent<HTMLDivElement>, columnId: string) {
    event.preventDefault();
    if (event.dataTransfer.types.includes("column/id")) return;
    const cardId = event.dataTransfer.getData("text/plain");
    if (cardId) onMoveCard(cardId, columnId);
    setDragOverColumnId(null);
    setDragOverCardId(null);
  }
  function handleDropOnCard(event: DragEvent<HTMLDivElement>, targetCardId: string) {
    if (event.dataTransfer.types.includes("column/id")) return;
    event.preventDefault();
    event.stopPropagation();
    const draggedCardId = event.dataTransfer.getData("text/plain");
    if (draggedCardId && draggedCardId !== targetCardId) {
      const targetCard = cards.find((c) => c.id === targetCardId);
      if (targetCard) {
        onReorderCard(draggedCardId, targetCardId, targetCard.columnId);
      }
    }
    setDragOverColumnId(null);
    setDragOverCardId(null);
  }
  function handleDragLeave() {
    setDragOverColumnId(null);
    setDragOverCardId(null);
  }

  /* ── column drag & drop ────────────────────────────────────────────────── */
  function handleColumnDragStart(event: DragEvent<HTMLDivElement>, columnId: string) {
    event.dataTransfer.setData("column/id", columnId);
    event.dataTransfer.effectAllowed = "move";
  }
  function handleColumnDragOver(event: DragEvent<HTMLDivElement>, columnId: string) {
    if (!event.dataTransfer.types.includes("column/id")) return;
    event.preventDefault();
    setDragOverColumnReorderId(columnId);
  }
  function handleColumnDrop(event: DragEvent<HTMLDivElement>, columnId: string) {
    event.preventDefault();
    const draggedColumnId = event.dataTransfer.getData("column/id");
    if (draggedColumnId && draggedColumnId !== columnId) {
      const draggedIndex = columns.findIndex((c) => c.id === draggedColumnId);
      const targetIndex = columns.findIndex((c) => c.id === columnId);
      const placement = draggedIndex < targetIndex ? "after" : "before";
      onReorderColumn(draggedColumnId, columnId, placement);
    }
    setDragOverColumnReorderId(null);
  }
  function handleColumnDragLeave() {
    setDragOverColumnReorderId(null);
  }

  /* ── column helpers ────────────────────────────────────────────────────── */
  function handleAddColumn() {
    const title = newColumnName.trim();
    if (!title) { setError("Informe o nome da coluna."); return; }
    onAddColumn(title);
    setNewColumnName("");
    setError("");
    setAddingColumn(false);
  }
  function startEditingColumn(column: KanbanColumn) {
    setEditingColumnId(column.id);
    setEditingColumnTitle(column.title);
  }
  function saveEditingColumn() {
    const title = editingColumnTitle.trim();
    if (editingColumnId && title) {
      onUpdateColumnTitle(editingColumnId, title);
    }
    setEditingColumnId(null);
    setEditingColumnTitle("");
  }
  function cancelEditingColumn() {
    setEditingColumnId(null);
    setEditingColumnTitle("");
  }
  function getColumnCards(columnId: string) {
    return cards
      .filter((card) => card.columnId === columnId && !card.isArchived && !card.isTemplate)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }
  function handleSubmitAddCard(columnId: string) {
    const title = newCardDraft.trim();
    if (!title) return;
    onAddCard(columnId, title);
    setNewCardDraft("");
    setAddingCardColumnId(null);
  }
  function handleCancelAddCard() {
    setNewCardDraft("");
    setAddingCardColumnId(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {editingBoardTitle ? (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                value={boardTitleDraft}
                onChange={(e) => setBoardTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const t = boardTitleDraft.trim();
                    if (t) { setBoardTitle(t); localStorage.setItem("kanban-board-title", t); }
                    setEditingBoardTitle(false);
                  }
                  if (e.key === "Escape") setEditingBoardTitle(false);
                }}
                onBlur={() => {
                  const t = boardTitleDraft.trim();
                  if (t) { setBoardTitle(t); localStorage.setItem("kanban-board-title", t); }
                  setEditingBoardTitle(false);
                }}
                className="h-8 text-lg font-semibold tracking-tight w-auto min-w-[200px]"
              />
            </div>
          ) : (
            <h1
              onClick={() => { setBoardTitleDraft(boardTitle); setEditingBoardTitle(true); }}
              className="text-xl font-semibold tracking-tight cursor-text hover:bg-accent/40 rounded px-1 -ml-1 py-0.5 transition-colors inline-block"
              title="Clique para editar"
            >
              {boardTitle}
            </h1>
          )}
          {editingBoardSubtitle ? (
            <Input
              autoFocus
              value={boardSubtitleDraft}
              onChange={(e) => setBoardSubtitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const t = boardSubtitleDraft.trim();
                  setBoardSubtitle(t);
                  localStorage.setItem("kanban-board-subtitle", t);
                  setEditingBoardSubtitle(false);
                }
                if (e.key === "Escape") setEditingBoardSubtitle(false);
              }}
              onBlur={() => {
                const t = boardSubtitleDraft.trim();
                setBoardSubtitle(t);
                localStorage.setItem("kanban-board-subtitle", t);
                setEditingBoardSubtitle(false);
              }}
              className="h-7 text-sm text-muted-foreground mt-1 w-auto min-w-[280px]"
            />
          ) : (
            <p
              onClick={() => { setBoardSubtitleDraft(boardSubtitle); setEditingBoardSubtitle(true); }}
              className="text-sm text-muted-foreground cursor-text hover:bg-accent/40 rounded px-1 -ml-1 py-0.5 transition-colors inline-block"
              title="Clique para editar"
            >
              {boardSubtitle} ({cards.filter((c) => !c.isArchived && !c.isTemplate).length} ativos · {cards.filter((c) => !c.completed && !c.isArchived && !c.isTemplate && c.dueDate).filter((c) => { const ymd = extractYMD(c.dueDate); if (!ymd) return false; const t = todayLocal(); const d = makeLocalDate(ymd[0], ymd[1], ymd[2]); return d.getTime() === t.getTime() || d < t; }).length} hoje · {cards.filter((c) => c.isArchived && !c.isTemplate).length} arquivados · {cards.filter((c) => c.isTemplate).length} templates)
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border/60 bg-muted/50 p-0.5">
            <button
              onClick={() => setKanbanSubtab("ativos")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                kanbanSubtab === "ativos"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Ativos
            </button>
            <button
              onClick={() => setKanbanSubtab("hoje")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                kanbanSubtab === "hoje"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Hoje
            </button>
            <button
              onClick={() => setKanbanSubtab("arquivados")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                kanbanSubtab === "arquivados"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Arquivados
            </button>
            <button
              onClick={() => setKanbanSubtab("templates")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                kanbanSubtab === "templates"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Templates
            </button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {columns.length === 0 && kanbanSubtab === "ativos" && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <ListChecks className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Seu quadro está vazio</p>
              <p className="text-xs text-muted-foreground">Crie uma coluna para começar. Favoritar uma estimativa adiciona um card automaticamente.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Board — Ativos */}
      {kanbanSubtab === "ativos" && columns.length > 0 && (
        <div className="flex flex-1 gap-4 overflow-x-auto pb-2 min-w-0">
          {[...columns].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((column) => {
            const columnCards = getColumnCards(column.id);
            const isDropTarget = dragOverColumnId === column.id;

            return (
              <div
                key={column.id}
                className={cn(
                  "flex w-[300px] shrink-0 flex-col gap-3 transition-colors",
                  isDropTarget && "rounded-2xl ring-2 ring-primary/30 bg-primary/5"
                )}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDrop={(e) => handleDrop(e, column.id)}
                onDragLeave={handleDragLeave}
              >
                {/* Column header */}
                <div
                  className={cn(
                    "group px-1 rounded-lg transition-colors cursor-grab active:cursor-grabbing",
                    dragOverColumnReorderId === column.id && "bg-primary/10 ring-2 ring-primary/30"
                  )}
                  draggable
                  onDragStart={(e) => handleColumnDragStart(e, column.id)}
                  onDragOver={(e) => handleColumnDragOver(e, column.id)}
                  onDrop={(e) => handleColumnDrop(e, column.id)}
                  onDragLeave={handleColumnDragLeave}
                >
                  {editingColumnId === column.id ? (
                    <div className="space-y-2">
                      <Input
                        autoFocus
                        value={editingColumnTitle}
                        onChange={(e) => setEditingColumnTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEditingColumn();
                          if (e.key === "Escape") cancelEditingColumn();
                        }}
                        className="h-8 text-sm font-semibold bg-background"
                      />
                      <div className="flex items-center gap-2">
                        <Button size="sm" className="h-7 text-xs" onClick={saveEditingColumn}>
                          Salvar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelEditingColumn}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DotsSixVertical className="h-4 w-4 text-muted-foreground/60" />
                        <div className="h-2 w-2 rounded-full bg-primary/70" />
                        <button
                          onClick={() => startEditingColumn(column)}
                          className="text-sm font-semibold hover:bg-accent/40 rounded px-1 -ml-1 py-0.5 transition-colors text-left"
                        >
                          {column.title}
                        </button>
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
                          {columnCards.length}
                        </span>
                      </div>
                      <button
                        onClick={() => setDeletingColumnId(column.id)}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Deletar coluna"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Column body */}
                <div className={cn(
                  "flex flex-1 flex-col gap-2.5 rounded-2xl p-2.5 transition-colors min-h-[140px]",
                  "bg-muted/40 dark:bg-muted/20"
                )}>
                  {columnCards.map((card) => {
                    const total = countTasks(card.tasks);
                    const completed = countCompleted(card.tasks);
                    const percent = taskProgressPercent(card.tasks);
                    const isDragOver = dragOverCardId === card.id;

                    return (
                      <div key={card.id} className="relative">
                        {/* Drop indicator above card */}
                        {isDragOver && (
                          <div className="absolute -top-1.5 left-0 right-0 h-0.5 rounded-full bg-primary z-10" />
                        )}
                        <Card
                          draggable
                          onDragStart={(e) => handleDragStart(e, card.id)}
                          onDragOver={(e) => handleDragOverCard(e, card.id)}
                          onDrop={(e) => handleDropOnCard(e, card.id)}
                          onClick={() => setSelectedCardId(card.id)}
                          className={cn(
                            "group cursor-pointer rounded-xl shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:cursor-grabbing",
                            card.isTemplate
                              ? "border-dashed border-amber-500/40 bg-amber-500/[0.02] dark:bg-amber-500/[0.03]"
                              : "border-border/60 bg-card",
                            isDragOver && "ring-2 ring-primary/40",
                            card.completed && "opacity-75"
                          )}
                        >
                        <CardContent className="space-y-2 p-3">
                          {/* Top row: priority + template badge + due date */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {card.priority ? (
                                <PriorityFlagSimple priority={card.priority} size={12} />
                              ) : (
                                <span />
                              )}
                              {card.isTemplate && (
                                <span className="rounded bg-amber-500/10 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                                  Template
                                </span>
                              )}
                              {card.isDefaultTemplate && (
                                <span className="rounded bg-emerald-500/10 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                                  Padrão
                                </span>
                              )}
                            </div>
                            {card.dueDate && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                <CalendarBlank className="h-3 w-3" />
                                {formatDateRelative(card.dueDate)}
                              </span>
                            )}
                          </div>

                          {/* Title + completed checkbox */}
                          <div className="flex items-start gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateCard(card.id, { completed: !card.completed });
                              }}
                              className={cn(
                                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all",
                                card.completed
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-muted-foreground/30 hover:border-muted-foreground/60"
                              )}
                            >
                              {card.completed && <Check weight="bold" className="h-3 w-3" />}
                            </button>
                            <p className={cn(
                              "text-sm font-medium leading-snug",
                              card.completed ? "text-muted-foreground line-through" : "text-foreground"
                            )}>{card.title}</p>
                          </div>

                          {/* Tags */}
                          {card.tags && card.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {card.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Footer */}
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {total > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  <ListChecks className="h-3 w-3" />
                                  {completed}/{total}
                                </span>
                              )}
                              {card.assignee && (
                                <span className="inline-flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {card.assignee}
                                </span>
                              )}
                            </div>
                            {percent > 0 && (
                              <div className="flex items-center gap-1.5">
                                <div className="h-1.5 w-8 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={cn("h-full rounded-full transition-all", percent === 100 ? "bg-emerald-500" : "bg-primary")}
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                                {percent === 100 && <Check weight="bold" className="h-3 w-3 text-emerald-500" />}
                              </div>
                            )}
                          </div>
                        </CardContent>
                        </Card>
                      </div>
                    );
                  })}

                  {columnCards.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 py-8 text-center">
                      <ListChecks className="h-5 w-5 text-muted-foreground/60" />
                      <p className="text-xs text-muted-foreground">Nenhum card nesta coluna.</p>
                    </div>
                  )}

                  {/* Add card inline */}
                  {addingCardColumnId === column.id ? (
                    <div className="space-y-2 rounded-xl border border-border/60 bg-background p-2.5">
                      <Input
                        autoFocus
                        value={newCardDraft}
                        onChange={(e) => setNewCardDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSubmitAddCard(column.id);
                          if (e.key === "Escape") handleCancelAddCard();
                        }}
                        placeholder="Nome da tarefa"
                        className="h-9 text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleSubmitAddCard(column.id)}>
                          Adicionar tarefa
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCancelAddCard}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingCardColumnId(column.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/30 hover:text-foreground"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar tarefa
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add section button */}
          <div className="flex w-[300px] shrink-0 flex-col gap-3">
            {addingColumn ? (
              <div className="space-y-2 rounded-xl bg-muted/40 dark:bg-muted/20 p-3">
                <Input
                  autoFocus
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddColumn();
                    if (e.key === "Escape") { setAddingColumn(false); setNewColumnName(""); setError(""); }
                  }}
                  placeholder="Nomear esta seção"
                  className="h-9 bg-background"
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
                <div className="flex items-center gap-2">
                  <Button size="sm" className="h-8 text-xs" onClick={handleAddColumn}>
                    Adicionar seção
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setAddingColumn(false); setNewColumnName(""); setError(""); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingColumn(true)}
                className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-border/60 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-accent/30 hover:text-foreground"
              >
                <SquareSplitHorizontal className="h-4 w-4" />
                Adicionar seção
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hoje */}
      {kanbanSubtab === "hoje" && (
        <HojeView
          cards={cards}
          columns={columns}
          onUpdateCard={onUpdateCard}
          onToggleCardTaskCompleted={onToggleCardTaskCompleted}
          onRemoveCard={onRemoveCard}
          onArchiveCard={onArchiveCard}
          onOpenCard={(cardId) => setSelectedCardId(cardId)}
        />
      )}

      {/* Templates */}
      {kanbanSubtab === "templates" && (
        <TemplatesView
          cards={cards}
          columns={columns}
          onOpenCard={(cardId) => setSelectedTemplateId(cardId)}
          onRemoveCard={(cardId) => setDeletingCardId(cardId)}
          onUseTemplate={onUseTemplate}
          onCreateTemplate={onCreateTemplate}
        />
      )}

      {/* Arquivados */}
      {kanbanSubtab === "arquivados" && (
        <ArchivedView
          cards={cards}
          columns={columns}
          onUnarchiveCard={onUnarchiveCard}
          onRemoveCard={(cardId) => setDeletingCardId(cardId)}
          onOpenCard={(cardId) => setSelectedCardId(cardId)}
        />
      )}

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <TemplateDetailModal
          open={!!selectedTemplate}
          onClose={() => setSelectedTemplateId(null)}
          card={selectedTemplate}
          onUpdateCard={onUpdateCard}
          onAddCardTask={onAddCardTask}
          onUpdateCardTask={onUpdateCardTask}
          onToggleCardTaskCompleted={onToggleCardTaskCompleted}
          onRemoveCardTask={onRemoveCardTask}
          onReorderCardTask={onReorderCardTask}
          onRemoveCard={onRemoveCard}
          onRequestDelete={(cardId) => setDeletingCardId(cardId)}
        />
      )}

      {/* Task Detail Modal */}
      {selectedCard && (
        <TaskDetailModal
          open={!!selectedCard}
          onClose={() => setSelectedCardId(null)}
          card={selectedCard}
          columnTitle={columns.find((c) => c.id === selectedCard.columnId)?.title || ""}
          estimativas={estimativas}
          onUpdateCard={onUpdateCard}
          onUpdateCardNotes={onUpdateCardNotes}
          onAddCardTask={onAddCardTask}
          onUpdateCardTask={onUpdateCardTask}
          onToggleCardTaskCompleted={onToggleCardTaskCompleted}
          onRemoveCardTask={onRemoveCardTask}
          onReorderCardTask={onReorderCardTask}
          onRemoveCard={onRemoveCard}
          onDuplicateCard={onDuplicateCard}
          onArchiveCard={onArchiveCard}
          onUnarchiveCard={onUnarchiveCard}
          onRequestDelete={(cardId) => setDeletingCardId(cardId)}
        />
      )}

      {/* Delete Card Confirmation */}
      <ConfirmDeleteDialog
        open={!!deletingCardId}
        title="Deletar card"
        description="Tem certeza que deseja deletar este card? Todas as informações adicionadas nele serão perdidas permanentemente."
        confirmLabel="Deletar permanentemente"
        onConfirm={() => {
          if (deletingCardId) {
            onRemoveCard(deletingCardId);
            if (selectedCardId === deletingCardId) setSelectedCardId(null);
          if (selectedTemplateId === deletingCardId) setSelectedTemplateId(null);
          }
          setDeletingCardId(null);
        }}
        onCancel={() => setDeletingCardId(null)}
      />

      {/* Delete Column Confirmation */}
      <ConfirmDeleteDialog
        open={!!deletingColumnId}
        title="Deletar coluna"
        description={
          <>
            Deseja deletar a coluna <strong className="text-foreground">"{deletingColumnTitle}"</strong>?
            <p className="mt-1">Todos os cards e tarefas desta coluna serão removidos permanentemente.</p>
          </>
        }
        onConfirm={() => {
          if (deletingColumnId) onRemoveColumn(deletingColumnId);
          setDeletingColumnId(null);
        }}
        onCancel={() => setDeletingColumnId(null)}
      />
    </div>
  );
}
