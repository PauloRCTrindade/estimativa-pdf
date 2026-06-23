import { type DragEvent, useState, useMemo, useCallback } from "react";
import { useDragScroll } from "@/hooks/useDragScroll";
import type { Estimativa, KanbanColumn, KanbanCard, KanbanCustomTask, TaskPriority } from "@/types";
import {
  extractYMD,
  makeLocalDate,
  todayLocal,
  formatDateRelative,
  getCardProgress,
  getTasksForEstimate,
  PRIORITY_CONFIG_SIMPLE,
  buildRealCalendar,
  diffDiasCorridos,
} from "@/components/kanban/shared/kanbanHelpers";
import { HojeView } from "./hoje-view";
import { ImpactManager } from "./impact-manager";
import { TaskDetailModal } from "@/components/kanban/modals/TaskDetailModal";
import { TemplateDetailModal } from "@/components/kanban/modals/TemplateDetailModal";
import { ConfirmDeleteDialog } from "@/components/kanban/shared/ConfirmDeleteDialog";
import { ArchivedView } from "@/components/kanban/views/ArchivedView";
import { TemplatesView } from "@/components/kanban/views/TemplatesView";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/date-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Faders,
  X,
} from "@phosphor-icons/react";

/* ═══════════════════════════════════════════════════════════════════════════
   Cores
   ═══════════════════════════════════════════════════════════════════════════ */

const COLUMN_COLORS: Record<string, { dot: string; border: string; badge: string; line: string; label: string }> = {
  gray:    { dot: "bg-zinc-400",    border: "border-zinc-400/40",    badge: "bg-zinc-500/15 text-zinc-400",    line: "bg-zinc-400",    label: "Cinza" },
  blue:    { dot: "bg-blue-400",    border: "border-blue-400/40",    badge: "bg-blue-500/15 text-blue-400",    line: "bg-blue-400",    label: "Azul" },
  green:   { dot: "bg-emerald-400", border: "border-emerald-400/40", badge: "bg-emerald-500/15 text-emerald-400", line: "bg-emerald-400", label: "Verde" },
  purple:  { dot: "bg-violet-400",  border: "border-violet-400/40",  badge: "bg-violet-500/15 text-violet-400", line: "bg-violet-400",  label: "Roxo" },
  orange:  { dot: "bg-orange-400",  border: "border-orange-400/40",  badge: "bg-orange-500/15 text-orange-400", line: "bg-orange-400",  label: "Laranja" },
  red:     { dot: "bg-red-400",     border: "border-red-400/40",     badge: "bg-red-500/15 text-red-400",     line: "bg-red-400",     label: "Vermelho" },
  pink:    { dot: "bg-pink-400",    border: "border-pink-400/40",    badge: "bg-pink-500/15 text-pink-400",    line: "bg-pink-400",    label: "Rosa" },
  cyan:    { dot: "bg-cyan-400",    border: "border-cyan-400/40",    badge: "bg-cyan-500/15 text-cyan-400",    line: "bg-cyan-400",    label: "Turquesa" },
  yellow:  { dot: "bg-yellow-400",  border: "border-yellow-400/40",  badge: "bg-yellow-500/15 text-yellow-400", line: "bg-yellow-400",  label: "Amarelo" },
};

function isHexColor(value?: string): boolean {
  return !!value && /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(value);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.match(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function getColumnColorClasses(colorKey?: string): {
  dot: string;
  border: string;
  badge: string;
  line: string;
  label: string;
  style?: { backgroundColor: string };
} {
  if (isHexColor(colorKey)) {
    const rgb = hexToRgb(colorKey!);
    if (!rgb) return { ...COLUMN_COLORS.gray };
    const css = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
    return {
      dot: "",
      border: "",
      badge: "",
      line: "",
      label: "Personalizado",
      style: { backgroundColor: css },
    };
  }
  const preset = COLUMN_COLORS[colorKey || "gray"] || COLUMN_COLORS.gray;
  return { ...preset };
}

const PRIORITY_BAR_CLASSES: Record<TaskPriority, string> = {
  p1: "bg-red-500/70",
  p2: "bg-orange-500/70",
  p3: "bg-blue-500/70",
  p4: "bg-zinc-500/40",
};

const TAG_COLOR_PALETTE = [
  { bg: "bg-red-500/15",    text: "text-red-400",    border: "border-red-500/25" },
  { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/25" },
  { bg: "bg-amber-500/15",  text: "text-amber-400",  border: "border-amber-500/25" },
  { bg: "bg-emerald-500/15",text: "text-emerald-400",border: "border-emerald-500/25" },
  { bg: "bg-cyan-500/15",   text: "text-cyan-400",   border: "border-cyan-500/25" },
  { bg: "bg-blue-500/15",   text: "text-blue-400",   border: "border-blue-500/25" },
  { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/25" },
  { bg: "bg-pink-500/15",   text: "text-pink-400",   border: "border-pink-500/25" },
  { bg: "bg-rose-500/15",   text: "text-rose-400",   border: "border-rose-500/25" },
  { bg: "bg-sky-500/15",    text: "text-sky-400",    border: "border-sky-500/25" },
  { bg: "bg-teal-500/15",   text: "text-teal-400",   border: "border-teal-500/25" },
  { bg: "bg-lime-500/15",   text: "text-lime-400",   border: "border-lime-500/25" },
];

function getDueDateHighlight(dueDate: string | undefined): { text: string; color: string; icon?: string } {
  if (!dueDate) return { text: "", color: "" };
  const ymd = extractYMD(dueDate);
  if (!ymd) return { text: "", color: "" };
  const target = makeLocalDate(ymd[0], ymd[1], ymd[2]);
  const today = todayLocal();
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { text: formatDateRelative(dueDate), color: "text-red-400" };
  if (diff === 0) return { text: "Hoje", color: "text-sky-400" };
  if (diff <= 7) return { text: formatDateRelative(dueDate), color: "text-yellow-400" };
  return { text: formatDateRelative(dueDate), color: "text-muted-foreground" };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Tipos
   ═══════════════════════════════════════════════════════════════════════════ */

export type TaskStatus = "backlog" | "analise" | "desenvolvimento" | "qa" | "producao";

interface KanbanPageProps {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  estimativas: Estimativa[];
  feriados?: string[];
  releases?: string[];
  allTags?: string[];
  loading?: boolean;
  getTagColor?: (tag: string) => { bg: string; text: string; border: string } | string;
  setTagColor?: (tag: string, color: string) => void;
  onAddColumn: (title: string) => void;
  onUpdateColumnTitle: (id: string, title: string) => void;
  onUpdateColumnColor: (id: string, color: string) => void;
  onRemoveColumn: (id: string) => void;
  onMoveCard: (cardId: string, columnId: string) => void;
  onUpdateCard: (cardId: string, patch: Partial<Omit<KanbanCard, "id" | "tasks">>) => void;
  onUpdateCardNotes: (cardId: string, notes: string) => void;
  onAddCardTask: (cardId: string, task: Omit<KanbanCustomTask, "id" | "completed" | "subtasks">, parentTaskId?: string) => void;
  onUpdateCardTask: (cardId: string, taskId: string, patch: Partial<Omit<KanbanCustomTask, "id" | "subtasks">>) => void;
  onToggleCardTaskCompleted: (cardId: string, taskId: string) => void;
  onToggleEstimateTaskCompleted: (cardId: string, taskId: string) => void;
  onRemoveCardTask: (cardId: string, taskId: string) => void;
  onReorderCardTask: (cardId: string, parentTaskId: string | null, sourceIndex: number, destIndex: number) => void;
  onRemoveCard: (cardId: string) => void;
  onAddCard: (payload: { columnId: string; title: string; dueDate?: string; description?: string }) => Promise<string | null>;
  onReorderCard: (cardId: string, beforeCardId: string | null, targetColumnId?: string) => void;
  onReorderColumn: (columnId: string, targetColumnId: string, placement: "before" | "after") => void;
  onArchiveCard: (cardId: string) => void;
  onUnarchiveCard: (cardId: string) => void;
  onUseTemplate: (templateCardId: string) => Promise<void> | void;
  onCreateTemplate: () => Promise<string | null>;
  onDuplicateCard?: (cardId: string) => Promise<string | null>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   KanbanPage
   ═══════════════════════════════════════════════════════════════════════════ */

export function KanbanPage({
  columns,
  cards,
  estimativas,
  feriados,
  releases,
  allTags,
  getTagColor: getTagColorProp,
  setTagColor: setTagColorProp,
  onAddColumn,
  onUpdateColumnTitle,
  onUpdateColumnColor,
  onRemoveColumn,
  onReorderColumn,
  onMoveCard,
  onUpdateCard,
  onUpdateCardNotes,
  onAddCardTask,
  onUpdateCardTask,
  onToggleCardTaskCompleted,
  onToggleEstimateTaskCompleted,
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
  const getTagColor = useCallback((tag: string) => {
    if (getTagColorProp) {
      const result = getTagColorProp(tag);
      if (typeof result === "string") {
        return { bg: result + "20", text: result, border: result + "40" };
      }
      return result as { bg: string; text: string; border: string };
    }
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    const idx = Math.abs(hash) % TAG_COLOR_PALETTE.length;
    return TAG_COLOR_PALETTE[idx];
  }, [getTagColorProp]);

  const [newColumnName, setNewColumnName] = useState("");
  const [error, setError] = useState("");
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [dragOverColumnReorderId, setDragOverColumnReorderId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [impactManagerCardId, setImpactManagerCardId] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState("");
  const [addingCardColumnId, setAddingCardColumnId] = useState<string | null>(null);
  const [newCardDraft, setNewCardDraft] = useState("");
  const [newCardDueDate, setNewCardDueDate] = useState("");
  const [newCardColumnId, setNewCardColumnId] = useState<string>("");
  const [newCardDescription, setNewCardDescription] = useState("");
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
  const impactManagerCard = useMemo(() => cards.find((c) => c.id === impactManagerCardId) ?? null, [cards, impactManagerCardId]);
  const impactManagerEstimate = useMemo(
    () => (impactManagerCard ? estimativas.find((e) => e.id === impactManagerCard.estimateId && e.tipo === "estimativa-pacotes") ?? null : null),
    [estimativas, impactManagerCard]
  );
  const boardRef = useDragScroll<HTMLDivElement>();

  /* ── Filtros ───────────────────────────────────────────────────────────── */
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<"hoje" | "esta_semana" | "proximos_7_dias" | "proximo_mes" | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | null>(null);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (dateFilter) count++;
    if (tagFilter) count++;
    if (priorityFilter) count++;
    return count;
  }, [dateFilter, tagFilter, priorityFilter]);

  function clearFilters() {
    setDateFilter(null);
    setTagFilter(null);
    setPriorityFilter(null);
  }

  function flattenTasks(tasks: KanbanCustomTask[] | undefined): KanbanCustomTask[] {
    if (!tasks) return [];
    const result: KanbanCustomTask[] = [];
    for (const task of tasks) {
      result.push(task);
      if (task.subtasks && task.subtasks.length > 0) {
        result.push(...flattenTasks(task.subtasks));
      }
    }
    return result;
  }

  function dateMatchesFilter(dateStr: string | undefined, filter: string): boolean {
    if (!dateStr) return false;
    const ymd = extractYMD(dateStr);
    if (!ymd) return false;
    const target = makeLocalDate(ymd[0], ymd[1], ymd[2]);
    const today = todayLocal();
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    switch (filter) {
      case "hoje":
        return diffDays === 0;
      case "esta_semana": {
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);
        return target >= startOfWeek && target <= endOfWeek;
      }
      case "proximos_7_dias":
        return diffDays >= 0 && diffDays <= 7;
      case "proximo_mes": {
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const endNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
        return target >= nextMonth && target <= endNextMonth;
      }
      default:
        return false;
    }
  }

  function cardMatchesFilters(card: KanbanCard): boolean {
    if (card.isArchived || card.isTemplate) return false;

    // Check card itself
    const cardMatchesDate = dateFilter ? dateMatchesFilter(card.dueDate, dateFilter) : true;
    const cardMatchesTag = tagFilter ? (card.tags ?? []).includes(tagFilter) : true;
    const cardMatchesPriority = priorityFilter ? card.priority === priorityFilter : true;

    if (cardMatchesDate && cardMatchesTag && cardMatchesPriority) return true;

    // Check tasks and subtasks
    const allTasks = flattenTasks(card.tasks);
    for (const task of allTasks) {
      const taskMatchesDate = dateFilter ? dateMatchesFilter(task.dueDate, dateFilter) : true;
      const taskMatchesTag = tagFilter ? (task.tags ?? []).includes(tagFilter) : true;
      const taskMatchesPriority = priorityFilter ? task.priority === priorityFilter : true;
      if (taskMatchesDate && taskMatchesTag && taskMatchesPriority) return true;
    }

    return false;
  }

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
    const hasFilter = dateFilter || tagFilter || priorityFilter;
    return cards
      .filter((card) => {
        if (card.columnId !== columnId) return false;
        if (card.isArchived || card.isTemplate) return false;
        if (hasFilter) return cardMatchesFilters(card);
        return true;
      })
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }
  function handleSubmitAddCard() {
    const title = newCardDraft.trim();
    if (!title) return;
    onAddCard({
      columnId: newCardColumnId || addingCardColumnId || columns[0]?.id || "",
      title,
      dueDate: newCardDueDate || undefined,
      description: newCardDescription.trim() || undefined,
    });
    setNewCardDraft("");
    setNewCardDueDate("");
    setNewCardColumnId("");
    setNewCardDescription("");
    setAddingCardColumnId(null);
  }
  function handleCancelAddCard() {
    setNewCardDraft("");
    setNewCardDueDate("");
    setNewCardColumnId("");
    setNewCardDescription("");
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                activeFiltersCount > 0
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Faders className="h-3.5 w-3.5" />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-foreground text-[10px] font-bold text-primary px-1">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && kanbanSubtab === "ativos" && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
          {/* Filtro por data */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Data</label>
            <select
              value={dateFilter || ""}
              onChange={(e) => setDateFilter((e.target.value || null) as typeof dateFilter)}
              className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Todas</option>
              <option value="hoje">Hoje</option>
              <option value="esta_semana">Esta semana</option>
              <option value="proximos_7_dias">Próximos 7 dias</option>
              <option value="proximo_mes">Próximo mês</option>
            </select>
          </div>

          {/* Filtro por etiqueta */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Etiqueta</label>
            <select
              value={tagFilter || ""}
              onChange={(e) => setTagFilter(e.target.value || null)}
              className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Todas</option>
              {(allTags ?? []).map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          {/* Filtro por prioridade */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Prioridade</label>
            <select
              value={priorityFilter || ""}
              onChange={(e) => setPriorityFilter((e.target.value || null) as TaskPriority | null)}
              className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Todas</option>
              <option value="p1">Prioridade 1</option>
              <option value="p2">Prioridade 2</option>
              <option value="p3">Prioridade 3</option>
              <option value="p4">Prioridade 4</option>
            </select>
          </div>

          {/* Limpar filtros */}
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>
      )}

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
        <div ref={boardRef} className="flex flex-1 gap-4 overflow-x-auto pb-2 min-w-0 cursor-grab">
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
                  data-kanban-column-header
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
                  {(() => {
                    const colColor = getColumnColorClasses(column.color);
                    const isCustom = isHexColor(column.color);
                    return (
                      <>
                        {/* Color line on top */}
                        <div
                          className={cn("h-0.5 w-full rounded-full mb-1.5", colColor.line)}
                          style={isCustom && colColor.style ? { backgroundColor: colColor.style.backgroundColor } : undefined}
                        />
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
                              <div
                                className={cn("h-2 w-2 rounded-full", colColor.dot)}
                                style={isCustom && colColor.style ? { backgroundColor: colColor.style.backgroundColor } : undefined}
                              />
                              <button
                                onClick={() => startEditingColumn(column)}
                                className="text-sm font-semibold hover:bg-accent/40 rounded px-1 -ml-1 py-0.5 transition-colors text-left"
                              >
                                {column.title}
                              </button>
                              <span
                                className={cn("flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-medium", colColor.badge)}
                                style={isCustom && colColor.style ? { backgroundColor: colColor.style.backgroundColor + "20", color: colColor.style.backgroundColor } : undefined}
                              >
                                {columnCards.length}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {/* Color picker */}
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    title="Alterar cor"
                                  >
                                    <div
                                      className={cn("h-3 w-3 rounded-full border border-foreground/20", colColor.dot)}
                                      style={isCustom && colColor.style ? { backgroundColor: colColor.style.backgroundColor } : undefined}
                                    />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2" align="end">
                                  <div className="grid grid-cols-3 gap-1.5">
                                    {Object.entries(COLUMN_COLORS).map(([key, cfg]) => (
                                      <button
                                        key={key}
                                        onClick={() => onUpdateColumnColor(column.id, key)}
                                        className={cn(
                                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                                          column.color === key ? "bg-accent" : "hover:bg-accent/40"
                                        )}
                                      >
                                        <div className={cn("h-3 w-3 rounded-full", cfg.dot)} />
                                        {cfg.label}
                                      </button>
                                    ))}
                                    <div className="col-span-3 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent/40 transition-colors">
                                      <input
                                        type="color"
                                        value={isCustom ? column.color : "#6366f1"}
                                        onChange={(e) => {
                                          const hex = e.target.value;
                                          if (isHexColor(hex)) onUpdateColumnColor(column.id, hex);
                                        }}
                                        className="h-5 w-5 cursor-pointer rounded border-0 p-0"
                                      />
                                      Personalizado
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <button
                                onClick={() => setDeletingColumnId(column.id)}
                                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Deletar coluna"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Column body */}
                <div className={cn(
                  "flex flex-1 flex-col gap-2.5 rounded-2xl p-2.5 transition-colors min-h-[140px]",
                  "bg-muted/40 dark:bg-muted/20"
                )}>
                  {columnCards.map((card) => {
                    const estimate = estimativas.find((e) => e.id === card.estimateId && e.tipo === "estimativa-pacotes");
                    const estimateTasks = estimate ? getTasksForEstimate(estimate) : [];
                    const { total, completed, percent } = getCardProgress(card, estimateTasks);
                    const isDragOver = dragOverCardId === card.id;

                    return (
                      <div key={card.id} className="relative">
                        {/* Drop indicator above card */}
                        {isDragOver && (
                          <div className="absolute -top-1.5 left-0 right-0 h-0.5 rounded-full bg-primary z-10" />
                        )}
                        <Card
                          draggable
                          data-kanban-card
                          onDragStart={(e) => handleDragStart(e, card.id)}
                          onDragOver={(e) => handleDragOverCard(e, card.id)}
                          onDrop={(e) => handleDropOnCard(e, card.id)}
                          onClick={() => setSelectedCardId(card.id)}
                          className={cn(
                            "group cursor-pointer rounded-xl shadow-sm transition-all hover:shadow-lg hover:shadow-foreground/5 hover:-translate-y-0.5 hover:brightness-105 active:cursor-grabbing relative overflow-hidden",
                            card.isTemplate
                              ? "border-dashed border-amber-500/40 bg-amber-500/[0.02] dark:bg-amber-500/[0.03]"
                              : "border-border/60 bg-card",
                            isDragOver && "ring-2 ring-primary/40",
                            card.completed && "opacity-70"
                          )}
                        >
                          {/* Priority bar */}
                          {card.priority && (
                            <div className={cn("absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl", PRIORITY_BAR_CLASSES[card.priority])} />
                          )}
                          <CardContent className="space-y-2 p-3 pl-3.5">
                            {/* Top row: priority + template badge + due date */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {card.priority && (
                                  <span className={cn("text-[10px] font-bold tabular-nums", PRIORITY_CONFIG_SIMPLE[card.priority].color)}>
                                    {card.priority.toUpperCase()}
                                  </span>
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
                                (() => {
                                  const dd = getDueDateHighlight(card.dueDate);
                                  return (
                                    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", dd.color)}>
                                      <CalendarBlank className="h-3 w-3" />
                                      {dd.text}
                                    </span>
                                  );
                                })()
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
                                "text-sm font-medium leading-snug transition-colors",
                                card.completed ? "text-muted-foreground line-through" : "text-foreground"
                              )}>{card.title}</p>
                            </div>

                            {/* Tags */}
                            {card.tags && card.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {card.tags.map((tag) => {
                                  const tc = getTagColor(tag);
                                  const isHex = !tc.text.startsWith("text-");
                                  return (
                                    <span
                                      key={tag}
                                      className={cn(
                                        "inline-flex items-center rounded px-1.5 py-0 text-[10px] font-medium border",
                                        !isHex && tc.bg,
                                        !isHex && tc.text,
                                        !isHex && tc.border
                                      )}
                                      style={isHex ? {
                                        backgroundColor: tc.bg,
                                        color: tc.text,
                                        borderColor: tc.border,
                                      } : undefined}
                                    >
                                      {tag}
                                    </span>
                                  );
                                })}
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
                                {card.dataRealInicio && card.estimateId && (() => {
                                  const estimate = estimativas.find((e) => e.id === card.estimateId && e.tipo === "estimativa-pacotes");
                                  if (!estimate) return null;
                                  const estimateCal = buildRealCalendar(estimate, estimate.inicio, estimate.diasParados, estimate.chgDias, estimate.esteiraPreProd, feriados, releases);
                                  const realCal = buildRealCalendar(estimate, card.dataRealInicio, card.diasImpactados, card.chgDias, card.esteiraPreProd, feriados, releases, card.cronogramaReal, card.realProductionDate);
                                  const diff = diffDiasCorridos(estimateCal.calculatedEndDate, realCal.calculatedEndDate);
                                  if (diff === null) return null;
                                  return (
                                    <span className={cn("inline-flex items-center gap-1 font-medium", diff > 0 ? "text-red-500" : diff < 0 ? "text-emerald-500" : "text-muted-foreground")}>
                                      <CalendarBlank className="h-3 w-3" />
                                      Real: {diff > 0 ? `+${diff}` : diff} dias
                                    </span>
                                  );
                                })()}
                              </div>
                              {percent > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <div className="h-1.5 w-10 overflow-hidden rounded-full bg-muted">
                                    <div
                                      className={cn("h-full rounded-full transition-all", percent === 100 ? "bg-emerald-500" : "bg-primary")}
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] tabular-nums">{percent}%</span>
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
                          if (e.key === "Enter") handleSubmitAddCard();
                          if (e.key === "Escape") handleCancelAddCard();
                        }}
                        placeholder="Título da tarefa"
                        className="h-9 text-sm"
                      />
                      <Textarea
                        value={newCardDescription}
                        onChange={(e) => setNewCardDescription(e.target.value)}
                        placeholder="Descrição (opcional)"
                        rows={2}
                        className="resize-none text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <DatePicker
                          value={newCardDueDate}
                          onChange={(date) => setNewCardDueDate(date)}
                          placeholder="Data de vencimento"
                          className="h-8 text-sm"
                          dateFormat="iso"
                          feriados={feriados}
                          releases={releases}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={newCardColumnId || column.id}
                          onChange={(e) => setNewCardColumnId(e.target.value)}
                          className="h-8 flex-1 rounded-md border border-border/60 bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {columns.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((col) => (
                            <option key={col.id} value={col.id}>{col.title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" className="h-7 text-xs" onClick={handleSubmitAddCard}>
                          Salvar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCancelAddCard}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAddingCardColumnId(column.id);
                        setNewCardColumnId(column.id);
                      }}
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
          estimativas={estimativas}
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
          columns={columns}
          estimativas={estimativas}
          feriados={feriados}
          releases={releases}
          allTags={allTags}
          getTagColor={getTagColor}
          setTagColor={setTagColorProp}
          onUpdateCard={onUpdateCard}
          onUpdateCardNotes={onUpdateCardNotes}
          onAddCardTask={onAddCardTask}
          onUpdateCardTask={onUpdateCardTask}
          onToggleCardTaskCompleted={onToggleCardTaskCompleted}
          onToggleEstimateTaskCompleted={onToggleEstimateTaskCompleted}
          onRemoveCardTask={onRemoveCardTask}
          onReorderCardTask={onReorderCardTask}
          onRemoveCard={onRemoveCard}
          onDuplicateCard={onDuplicateCard}
          onArchiveCard={onArchiveCard}
          onUnarchiveCard={onUnarchiveCard}
          onRequestDelete={(cardId) => setDeletingCardId(cardId)}
          onMoveCard={onMoveCard}
          onOpenImpactManager={(cardId) => {
            setSelectedCardId(null);
            setImpactManagerCardId(cardId);
          }}
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

      {/* Impact Manager */}
      {impactManagerCard && impactManagerEstimate && (
        <ImpactManager
          key={`impact-manager-${impactManagerCard.id}`}
          card={impactManagerCard}
          estimate={impactManagerEstimate}
          feriados={feriados}
          releases={releases}
          onUpdateCard={onUpdateCard}
          onClose={() => setImpactManagerCardId(null)}
        />
      )}
    </div>
  );
}
