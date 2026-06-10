import { type DragEvent, useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { Estimativa, KanbanColumn, KanbanCard, KanbanCustomTask, TaskPriority } from "@/types";
import {
  parseDateBR, isValidDate, sameDateBR, addDays, parseDateRangeList,
  parseDiasParadosList, normalizeDateList, getTimelineColor, getTimelineLabel,
  isEsteiraPreProdDay, isHoliday, isPostRelease, isReleaseDay, isWeekend,
  isParadoDay, getChgDates, getWorkingDays
} from "@/utils";
import { calcularTermino } from "@/components/estimativa-pacotes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// Custom modal replaces Dialog from shadcn/ui
import { COLORS } from "@/styles";
import { cn } from "@/lib/utils";
import {
  Plus, Trash, CaretRight, Check, CalendarBlank, Note, ListChecks,
  Clock, X, Flag, User, Tag, Paperclip, ChatText, DotsThree,
  CheckCircle, Circle, CaretDown, ArrowLeft, SquareSplitHorizontal,
  DotsSixVertical
} from "@phosphor-icons/react";

/* ═══════════════════════════════════════════════════════════════════════════
   Tipos locais
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
  onRemoveCard: (cardId: string) => void;
  onToggleCardTemplate: (cardId: string) => void;
  onSetDefaultTemplate: (cardId: string) => void;
  onCreateTemplateCard: (columnId: string) => Promise<string | null>;
  onAddCard: (columnId: string, title: string) => Promise<string | null>;
  onReorderCard: (cardId: string, beforeCardId: string | null, targetColumnId?: string) => void;
  onReorderColumn: (columnId: string, targetColumnId: string, placement: "before" | "after") => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */

function formatDateBR(dateString: string | undefined): string {
  if (!dateString) return "—";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return dateString;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateRelative(dateString: string | undefined): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  if (diff > 1 && diff < 7) {
    const days = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
    return days[target.getDay()];
  }
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

function normalizeTaskType(rawTipo: unknown) {
  const tipo = String(rawTipo || "").trim().toLowerCase();
  if (tipo === "front" || tipo === "micro" || tipo === "desenvolvimento") return "desenvolvimento";
  if (tipo === "subida") return "subida";
  if (tipo === "testes" || tipo === "teste") return "testes";
  return "desenvolvimento";
}

function isPlaceholderTask(title: string, atividade: any) {
  const normalizedTitle = String(title || "").trim().toLowerCase();
  const titleSegments = normalizedTitle.split(/:/).map((s) => s.trim()).filter(Boolean);
  const titleWithoutPackage = titleSegments.length > 1 ? titleSegments[titleSegments.length - 1] : normalizedTitle;
  const hasNoName = !atividade.nome && !atividade.titulo && !atividade.demanda;
  const hasNoDates = !atividade.inicio && !atividade.dataInicio && !atividade.termino && !atividade.dataFim;
  const isDefaultHours = Number(atividade.horas ?? 0) === 8;
  const isDefaultOvertime = Number(atividade.horasOvertime ?? 0) === 0;
  const isAutoGeneratedTitle = /^tarefa\s+\d+$/i.test(titleWithoutPackage);
  return hasNoName && isAutoGeneratedTitle && hasNoDates && isDefaultHours && isDefaultOvertime;
}

function getTasksForEstimate(estimate: Estimativa) {
  const tasks: Array<{ id: string; title: string; tipo: string; inicio: string; termino: string; dias?: number }> = [];

  if (Array.isArray(estimate.atividades)) {
    estimate.atividades.forEach((atividade, index) => {
      const title = atividade.nome || atividade.titulo || atividade.demanda || `Tarefa ${index + 1}`;
      if (isPlaceholderTask(title, atividade)) return;
      tasks.push({
        id: atividade.id ?? `atividade-${index}`,
        title,
        tipo: normalizeTaskType(atividade.tipo),
        inicio: atividade.inicio || atividade.dataInicio || "",
        termino: atividade.termino || atividade.dataFim || "",
      });
    });
  }

  if (estimate.tipo === 'estimativa-pacotes' && Array.isArray(estimate.pacotes)) {
    estimate.pacotes.forEach((pacote, pacoteIndex) => {
      if (Array.isArray(pacote.atividades)) {
        pacote.atividades.forEach((atividade, index) => {
          const title = `${pacote.nome ? `${pacote.nome}: ` : ""}${atividade.nome || atividade.titulo || atividade.demanda || `Tarefa ${index + 1}`}`;
          if (isPlaceholderTask(title, atividade)) return;
          const workDays = Math.max(1, Math.ceil(Number(atividade.horas || 0) / 8));
          let termino = atividade.termino || atividade.dataFim || "";
          if (!termino && atividade.inicio) {
            termino = calcularTermino(
              atividade.inicio,
              Number(atividade.horas || 0),
              normalizeDateList(estimate.feriados || ""),
              normalizeDateList(estimate.releases || ""),
              atividade.overtime || { tombamentoDates: [], feriadoDates: [], fimDeSemanaDates: [] },
              Number(atividade.horasOvertime || 0),
              parseDiasParadosList(estimate.diasParados || "")
            );
          }
          tasks.push({
            id: atividade.id ?? `pacote-${pacoteIndex}-atividade-${index}`,
            title,
            tipo: normalizeTaskType(atividade.tipo),
            inicio: atividade.inicio || atividade.dataInicio || "",
            termino,
            dias: Number(atividade.dias ?? workDays),
          });
        });
      }
    });
  }

  return tasks.filter((task) => String(task.title || "").trim() !== "" && (task.inicio || task.termino));
}

function getFlattenedEstimateActivities(estimate: Estimativa) {
  const activities: Array<{ id: string; nome: string; tipo: string; etapa: string; dias: number; inicio: string; termino: string }> = [];

  if (Array.isArray(estimate.atividades)) {
    estimate.atividades.forEach((atividade, index) => {
      activities.push({
        id: atividade.id ?? `atividade-${index}`,
        nome: atividade.nome || atividade.titulo || atividade.demanda || `Atividade ${index + 1}`,
        tipo: normalizeTaskType(atividade.tipo),
        etapa: String(atividade.etapa ?? "1"),
        dias: Number(atividade.dias ?? 0),
        inicio: atividade.inicio || atividade.dataInicio || "",
        termino: atividade.termino || atividade.dataFim || "",
      });
    });
  }

  if (estimate.tipo === 'estimativa-pacotes' && Array.isArray(estimate.pacotes)) {
    estimate.pacotes.forEach((pacote) => {
      if (Array.isArray(pacote.atividades)) {
        pacote.atividades.forEach((atividade, index) => {
          const title = `${pacote.nome ? `${pacote.nome}: ` : ""}${atividade.nome || atividade.titulo || atividade.demanda || `Atividade ${index + 1}`}`;
          if (isPlaceholderTask(title, atividade)) return;
          const workDays = Math.max(1, Math.ceil(Number(atividade.horas || 0) / 8));
          activities.push({
            id: atividade.id ?? `pacote-${pacote.id ?? pacote.nome ?? "unknown"}-atividade-${index}`,
            nome: title,
            tipo: normalizeTaskType(atividade.tipo),
            etapa: String(atividade.etapa ?? "1"),
            dias: Number(atividade.dias ?? workDays),
            inicio: atividade.inicio || atividade.dataInicio || "",
            termino: atividade.termino || atividade.dataFim || "",
          });
        });
      }
    });
  }

  return activities;
}

function buildEstimateCalendar(estimate: Estimativa) {
  const activities = getFlattenedEstimateActivities(estimate);
  const holidayDates = normalizeDateList(estimate.feriados || "");
  const releaseDates = normalizeDateList(estimate.releases || "");
  const preprodRanges = parseDateRangeList(estimate.esteiraPreProd || "");
  const paradaRanges = parseDiasParadosList(estimate.diasParados || "");
  const releaseDate = estimate.releaseAlvo ? parseDateBR(estimate.releaseAlvo) : new Date(NaN);
  const chgDates = getChgDates(releaseDate, Number(estimate.chgDias || 0), holidayDates);

  const startDate = estimate.inicio ? parseDateBR(estimate.inicio) : new Date(NaN);
  if (!isValidDate(startDate)) {
    return { rows: [] as Array<Array<null>>, rangeStart: null as Date | null, rangeEnd: null as Date | null };
  }

  const etapasOrdenadas = Array.from(new Set(activities.map((a) => String(a.etapa || "1")))).sort((a, b) => Number(a) - Number(b));
  const stageDurations = etapasOrdenadas.map((etapa) => {
    const activitiesOfStage = activities.filter((a) => String(a.etapa || "1") === etapa);
    return Math.max(...activitiesOfStage.map((a) => Number(a.dias || 0)));
  });

  const totalDias = stageDurations.reduce((acc, dias) => acc + dias, 0);
  const validDays = getWorkingDays(startDate, totalDias, releaseDates, holidayDates, paradaRanges);

  let cursor = 0;
  const atividadesCalculadas: Array<{ id: string; nome: string; tipo: string; etapa: string; dias: number; inicio: Date; termino: Date }> = [];

  etapasOrdenadas.forEach((etapa, index) => {
    const activitiesOfStage = activities.filter((a) => String(a.etapa || "1") === etapa);
    const inicioEtapa = validDays[cursor];
    activitiesOfStage.forEach((atividade) => {
      const dias = Number(atividade.dias || 0);
      const termino = validDays[cursor + dias - 1];
      if (isValidDate(inicioEtapa) && isValidDate(termino)) {
        atividadesCalculadas.push({ ...atividade, inicio: inicioEtapa, termino });
      }
    });
    cursor += stageDurations[index] || 0;
  });

  const calculatedEndDate = validDays[validDays.length - 1];
  const endDate = isValidDate(releaseDate) && releaseDate > calculatedEndDate ? releaseDate : calculatedEndDate;

  type TimelineDay = { date: Date; tipo: string; color: string; isReleaseDay: boolean; isEsteiraPreProd: boolean; isChg: boolean };
  const timeline: Array<TimelineDay> = [];
  let current = new Date(startDate);

  while (current <= endDate) {
    const date = new Date(current);
    let tipo = "";
    let color = COLORS.white;

    if (isValidDate(releaseDate) && sameDateBR(date, releaseDate)) {
      tipo = "Release alvo";
      color = COLORS.releaseTarget;
    } else if (isParadoDay(date, paradaRanges, holidayDates, releaseDates)) {
      tipo = "Projeto parado";
      color = COLORS.blocked;
    } else if (isWeekend(date)) {
      tipo = "Fim de semana";
      color = COLORS.weekend;
    } else if (isHoliday(date, holidayDates)) {
      tipo = "Feriado";
      color = COLORS.holiday;
    } else if (isPostRelease(date, releaseDates)) {
      tipo = "Tombamento";
      color = COLORS.postRelease;
    } else {
      const activity = atividadesCalculadas.find((item) => isValidDate(item.inicio) && isValidDate(item.termino) && date >= item.inicio && date <= item.termino);
      if (activity) {
        tipo = getTimelineLabel(activity.tipo, activity.nome);
        color = getTimelineColor(activity.tipo);
      }
    }

    timeline.push({ date, tipo, color, isReleaseDay: isReleaseDay(date, releaseDates), isEsteiraPreProd: isEsteiraPreProdDay(date, preprodRanges), isChg: chgDates.some((d) => sameDateBR(d, date)) });
    current = addDays(current, 1);
  }

  const rows: Array<Array<TimelineDay | null>> = [];
  const blockSize = 15;
  for (let index = 0; index < timeline.length; index += blockSize) {
    const row = timeline.slice(index, index + blockSize);
    while (row.length < blockSize) row.push(null);
    rows.push(row);
  }

  return { rows, rangeStart: startDate, rangeEnd: endDate };
}

function countTasks(tasks: KanbanCustomTask[] | undefined): number {
  if (!tasks) return 0;
  return tasks.reduce((count, task) => count + 1 + countTasks(task.subtasks), 0);
}

function countCompleted(tasks: KanbanCustomTask[] | undefined): number {
  if (!tasks) return 0;
  return tasks.reduce((count, task) => count + (task.completed ? 1 : 0) + countCompleted(task.subtasks), 0);
}

function taskProgressPercent(tasks: KanbanCustomTask[] | undefined): number {
  const total = countTasks(tasks);
  if (!total) return 0;
  return Math.round((countCompleted(tasks) / total) * 100);
}

function findTaskInTree(tasks: KanbanCustomTask[] | undefined, taskId: string): KanbanCustomTask | null {
  if (!tasks) return null;
  for (const task of tasks) {
    if (task.id === taskId) return task;
    const found = findTaskInTree(task.subtasks, taskId);
    if (found) return found;
  }
  return null;
}

function getTaskPath(tasks: KanbanCustomTask[] | undefined, taskId: string): KanbanCustomTask[] {
  if (!tasks) return [];
  for (const task of tasks) {
    if (task.id === taskId) return [task];
    const subPath = getTaskPath(task.subtasks, taskId);
    if (subPath.length) return [task, ...subPath];
  }
  return [];
}

/* ═══════════════════════════════════════════════════════════════════════════
   Priority helpers
   ═══════════════════════════════════════════════════════════════════════════ */

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string; border: string }> = {
  p1: { label: "Prioridade 1", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30" },
  p2: { label: "Prioridade 2", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/30" },
  p3: { label: "Prioridade 3", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30" },
  p4: { label: "Prioridade 4", color: "text-muted-foreground", bg: "bg-muted", border: "border-border" },
};

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

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TaskDetailModal
   ═══════════════════════════════════════════════════════════════════════════ */

type ModalView =
  | { type: "card"; cardId: string }
  | { type: "task"; path: KanbanCustomTask[] };

interface TaskDetailModalProps {
  open: boolean;
  onClose: () => void;
  card: KanbanCard;
  columnTitle: string;
  estimativas: Estimativa[];
  onUpdateCard: (cardId: string, patch: Partial<Omit<KanbanCard, "id" | "tasks">>) => void;
  onUpdateCardNotes: (cardId: string, notes: string) => void;
  onAddCardTask: (cardId: string, task: Omit<KanbanCustomTask, "id" | "completed" | "subtasks">, parentTaskId?: string) => void;
  onUpdateCardTask: (cardId: string, taskId: string, patch: Partial<Omit<KanbanCustomTask, "id" | "subtasks">>) => void;
  onToggleCardTaskCompleted: (cardId: string, taskId: string) => void;
  onRemoveCardTask: (cardId: string, taskId: string) => void;
  onRemoveCard: (cardId: string) => void;
  onToggleCardTemplate: (cardId: string) => void;
  onSetDefaultTemplate: (cardId: string) => void;
}

function TaskDetailModal({
  open, onClose, card, columnTitle, estimativas,
  onUpdateCard, onUpdateCardNotes, onAddCardTask, onUpdateCardTask, onToggleCardTaskCompleted, onRemoveCardTask,
  onRemoveCard, onToggleCardTemplate, onSetDefaultTemplate,
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
  const [checkedEstimateTasks, setCheckedEstimateTasks] = useState<Record<string, boolean>>({});

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

  const breadcrumbItems = useMemo(() => {
    const items: Array<{ label: string; onClick?: () => void }> = [
      { label: "Quadro", onClick: () => { setView({ type: "card", cardId: card.id }); setAnimationKey((k) => k + 1); } },
      { label: columnTitle, onClick: () => { setView({ type: "card", cardId: card.id }); setAnimationKey((k) => k + 1); } },
      { label: card.title, onClick: () => { setView({ type: "card", cardId: card.id }); setAnimationKey((k) => k + 1); } },
    ];
    if (view.type === "task") {
      view.path.forEach((pathTask, index) => {
        items.push({
          label: pathTask.title,
          onClick: () => {
            setView({ type: "task", path: view.path.slice(0, index + 1) });
            setAnimationKey((k) => k + 1);
          },
        });
      });
    }
    return items;
  }, [view, card.title, card.id, columnTitle]);

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

  const estimate = useMemo(() => estimativas.find((e) => e.id === card.estimateId && e.tipo === 'estimativa-pacotes'), [estimativas, card.estimateId]);
  const estimateTasks = useMemo(() => estimate ? getTasksForEstimate(estimate) : [], [estimate]);

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
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
      />
      {/* Modal */}
      <div
        className="relative z-10 grid w-full max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10 animate-in fade-in zoom-in-95 duration-200 sm:max-w-3xl"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header: Breadcrumbs + close + template controls */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-1 overflow-hidden text-xs text-muted-foreground">
            {breadcrumbItems.map((item, index) => (
              <div key={index} className="flex items-center gap-1 shrink-0">
                {index > 0 && <CaretRight className="h-3 w-3 opacity-50" />}
                {item.onClick ? (
                  <button
                    onClick={item.onClick}
                    className="truncate max-w-[140px] hover:text-foreground hover:underline transition-colors"
                  >
                    {item.label}
                  </button>
                ) : (
                  <span className="truncate max-w-[140px]">{item.label}</span>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {card.isDefaultTemplate && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                Template padrão
              </span>
            )}
            <button
              onClick={() => onToggleCardTemplate(card.id)}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                card.isTemplate
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              title={card.isTemplate ? "Remover marcação de template" : "Marcar como template"}
            >
              {card.isTemplate ? "Template" : "Usar como template"}
            </button>
            {card.isTemplate && !card.isDefaultTemplate && (
              <button
                onClick={() => onSetDefaultTemplate(card.id)}
                className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                Definir como padrão
              </button>
            )}
            <button
              onClick={() => { onRemoveCard(card.id); onClose(); }}
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
              {card.isTemplate && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  Este é um <strong>modelo reutilizável</strong>. As tarefas aqui serão copiadas para novos cards quando uma estimativa for favoritada.
                </div>
              )}
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
                  <div className="mt-1 h-5 w-5 shrink-0" />
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
                        displayCompleted && "text-muted-foreground line-through"
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
                    Tarefas da estimativa
                    <span className="ml-auto text-xs text-muted-foreground">{estimateTasks.length}</span>
                    <CaretDown className={cn("h-3 w-3 text-muted-foreground transition-transform", !expandedSections.estimativa && "-rotate-90")} />
                  </button>
                  {expandedSections.estimativa && (
                    <div className="space-y-1">
                      {estimateTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/30"
                        >
                          <button
                            onClick={() =>
                              setCheckedEstimateTasks((prev) => ({
                                ...prev,
                                [task.id]: !prev[task.id],
                              }))
                            }
                            className={cn(
                              "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-all",
                              checkedEstimateTasks[task.id]
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-muted-foreground/25 hover:border-muted-foreground/50"
                            )}
                          >
                            {checkedEstimateTasks[task.id] && <Check weight="bold" className="h-2.5 w-2.5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <span className={cn("font-medium", checkedEstimateTasks[task.id] && "text-muted-foreground line-through")}>
                              {task.title}
                            </span>
                            <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                              <span>Início: {formatDateBR(task.inicio)}</span>
                              <span>Término: {formatDateBR(task.termino)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Calendar - only at card level and not template */}
              {!isTaskView && !card.isTemplate && estimate && (
                <div className="rounded-lg border border-border/60 bg-card">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CalendarBlank className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Calendário</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setShowCalendar((prev) => !prev)}
                      >
                        {showCalendar ? "Ocultar" : "Visualizar"}
                      </Button>
                      {showCalendar && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setLargeCalendar((prev) => !prev)}
                        >
                          {largeCalendar ? "Reduzir" : "Expandir"}
                        </Button>
                      )}
                    </div>
                  </div>
                  {showCalendar && (
                    <div className={cn(
                      "overflow-x-auto border-t border-border/60 px-3 py-3 text-[11px]",
                      largeCalendar ? "max-h-[420px]" : "max-h-[240px]"
                    )}>
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

              {/* Subtasks */}
              <div>
                <button
                  onClick={() => toggleSection("subtarefas")}
                  className="flex w-full items-center gap-2 text-sm font-medium text-foreground mb-2"
                >
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                  {isTaskView ? "Subtarefas" : "Tarefas"}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {countCompleted(currentSubtasks)}/{countTasks(currentSubtasks)}
                  </span>
                  <CaretDown className={cn("h-3 w-3 text-muted-foreground transition-transform", !expandedSections.subtarefas && "-rotate-90")} />
                </button>
                {expandedSections.subtarefas && (
                  <div className="space-y-1">
                    {currentSubtasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => navigateToTask(task)}
                        className="group flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/30"
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
                          <span
                            className={cn(
                              "text-sm",
                              task.completed && "text-muted-foreground line-through"
                            )}
                          >
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
            <div className="border-t md:border-t-0 md:border-l bg-muted/20 p-5 space-y-5">
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
                <div className="flex items-center gap-2">
                  <CalendarBlank className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={isTaskView ? (currentTask?.dueDate || currentTask?.termino || "") : (card.dueDate || "")}
                    onChange={(e) => {
                      if (isTaskView && currentTask) {
                        onUpdateCardTask(card.id, currentTask.id, { dueDate: e.target.value });
                      } else {
                        onUpdateCard(card.id, { dueDate: e.target.value });
                      }
                    }}
                    className="h-8 text-sm"
                  />
                </div>
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
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Etiquetas</label>
                <div className="flex flex-wrap gap-1.5">
                  {(displayTags ?? []).map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                      <Tag className="h-3 w-3" />
                      {tag}
                      <button
                        onClick={() => {
                          if (isTaskView && currentTask) {
                            onUpdateCardTask(card.id, currentTask.id, { tags: (currentTask.tags ?? []).filter((t) => t !== tag) });
                          } else {
                            onUpdateCard(card.id, { tags: (card.tags ?? []).filter((t) => t !== tag) });
                          }
                        }}
                        className="ml-0.5 rounded-sm hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground">
                        <Plus className="h-3 w-3" />
                        Adicionar
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="start">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const input = e.currentTarget.elements.namedItem("tag") as HTMLInputElement;
                          const val = input.value.trim();
                          if (!val) return;
                          if (isTaskView && currentTask) {
                            const tags = [...new Set([...(currentTask.tags ?? []), val])];
                            onUpdateCardTask(card.id, currentTask.id, { tags });
                          } else {
                            const tags = [...new Set([...(card.tags ?? []), val])];
                            onUpdateCard(card.id, { tags });
                          }
                          input.value = "";
                        }}
                      >
                        <Input name="tag" placeholder="Nova etiqueta..." className="h-8 text-sm" autoComplete="off" />
                      </form>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

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

/* ═══════════════════════════════════════════════════════════════════════════
   KanbanPage
   ═══════════════════════════════════════════════════════════════════════════ */

export function KanbanPage({
  columns, cards, estimativas, loading,
  onAddColumn, onUpdateColumnTitle, onRemoveColumn, onReorderColumn, onMoveCard,
  onUpdateCard, onUpdateCardNotes, onAddCardTask, onUpdateCardTask,
  onToggleCardTaskCompleted, onRemoveCardTask,
  onRemoveCard, onToggleCardTemplate, onSetDefaultTemplate, onCreateTemplateCard, onAddCard, onReorderCard,
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
      .filter((card) => card.columnId === columnId)
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
              {boardSubtitle} ({cards.length} cards)
            </p>
          )}
        </div>
        <div className="flex items-center gap-2" />
      </div>

      {/* Empty state */}
      {columns.length === 0 && (
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

      {/* Board */}
      {columns.length > 0 && (
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
                            isDragOver && "ring-2 ring-primary/40"
                          )}
                        >
                        <CardContent className="space-y-2 p-3">
                          {/* Top row: priority + template badge + due date */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {card.priority ? (
                                <PriorityFlag priority={card.priority} size={12} />
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

                          {/* Title */}
                          <p className="text-sm font-medium leading-snug text-foreground">{card.title}</p>

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

          {/* Add section button (Todoist style) */}
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
          onRemoveCard={onRemoveCard}
          onToggleCardTemplate={onToggleCardTemplate}
          onSetDefaultTemplate={onSetDefaultTemplate}
        />
      )}

      {/* Delete Column Confirmation Modal */}
      {deletingColumnId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => setDeletingColumnId(null)}
          />
          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10 animate-in fade-in zoom-in-95 duration-200 p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold">Deletar coluna</h3>
              <p className="text-sm text-muted-foreground">
                Deseja deletar a coluna <strong className="text-foreground">"{deletingColumnTitle}"</strong>?
              </p>
              <p className="text-sm text-muted-foreground">
                Todos os cards e tarefas desta coluna serão removidos permanentemente.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDeletingColumnId(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onRemoveColumn(deletingColumnId);
                  setDeletingColumnId(null);
                }}
              >
                Deletar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
