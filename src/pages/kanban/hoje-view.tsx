import { useMemo, useCallback } from "react";
import type { KanbanColumn, KanbanCard, KanbanCustomTask, TaskPriority, Estimativa } from "@/types";
import { cn } from "@/lib/utils";
import { getCardProgress, getTasksForEstimate } from "@/components/kanban/shared/kanbanHelpers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Sun,
  Warning,
  CalendarBlank,
  Flag,
  ListChecks,
  User,
} from "@phosphor-icons/react";

/* ═══════════════════════════════════════════════════════════════════════════
   Tipos
   ═══════════════════════════════════════════════════════════════════════════ */

interface HojeViewProps {
  cards: KanbanCard[];
  columns: KanbanColumn[];
  estimativas: Estimativa[];
  onUpdateCard: (cardId: string, patch: Partial<Omit<KanbanCard, "id" | "tasks">>) => void;
  onToggleCardTaskCompleted: (cardId: string, taskId: string) => void;
  onArchiveCard: (cardId: string) => void;
  onRemoveCard: (cardId: string) => void;
  onOpenCard: (cardId: string) => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Date helpers — timezone-safe: compare only year/month/day
   ═══════════════════════════════════════════════════════════════════════════ */

function extractYMD(dateString: string | undefined): [number, number, number] | null {
  if (!dateString) return null;
  const iso = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  const br = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return [Number(br[3]), Number(br[2]), Number(br[1])];
  const d = new Date(dateString);
  if (!Number.isNaN(d.getTime())) return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
  return null;
}

function todayYMD(): [number, number, number] {
  const n = new Date();
  return [n.getFullYear(), n.getMonth() + 1, n.getDate()];
}

function isToday(dateString: string | undefined): boolean {
  const ymd = extractYMD(dateString);
  if (!ymd) return false;
  const t = todayYMD();
  return ymd[0] === t[0] && ymd[1] === t[1] && ymd[2] === t[2];
}

function isOverdue(dateString: string | undefined): boolean {
  const ymd = extractYMD(dateString);
  if (!ymd) return false;
  const t = todayYMD();
  if (ymd[0] !== t[0]) return ymd[0] < t[0];
  if (ymd[1] !== t[1]) return ymd[1] < t[1];
  return ymd[2] < t[2];
}

function daysOverdue(dateString: string | undefined): number {
  const ymd = extractYMD(dateString);
  if (!ymd) return 0;
  const d = new Date(ymd[0], ymd[1] - 1, ymd[2], 0, 0, 0, 0);
  const t = new Date(todayYMD()[0], todayYMD()[1] - 1, todayYMD()[2], 0, 0, 0, 0);
  if (d.getTime() >= t.getTime()) return 0;
  return Math.round((t.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateRelative(dateString: string | undefined): string {
  if (!dateString) return "";
  const ymd = extractYMD(dateString);
  if (!ymd) return dateString;
  const target = new Date(ymd[0], ymd[1] - 1, ymd[2], 0, 0, 0, 0);
  const today = new Date(todayYMD()[0], todayYMD()[1] - 1, todayYMD()[2], 0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  if (diff > 1 && diff < 7) {
    const days = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
    return days[target.getDay()];
  }
  return target.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function todayFormatted(): string {
  return new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Task counting helpers
   ═══════════════════════════════════════════════════════════════════════════ */

function countTasks(tasks: { subtasks?: any[] }[] | undefined): number {
  if (!tasks) return 0;
  return tasks.reduce((count, task) => count + 1 + countTasks(task.subtasks), 0);
}

function countCompleted(tasks: { completed?: boolean; subtasks?: any[] }[] | undefined): number {
  if (!tasks) return 0;
  return tasks.reduce((count, task) => count + (task.completed ? 1 : 0) + countCompleted(task.subtasks), 0);
}

function taskProgressPercent(tasks: { completed?: boolean; subtasks?: any[] }[] | undefined): number {
  const total = countTasks(tasks);
  if (!total) return 0;
  return Math.round((countCompleted(tasks) / total) * 100);
}

/* Priority flag */
const PRIORITY_CONFIG: Record<TaskPriority, { color: string }> = {
  p1: { color: "text-red-400" },
  p2: { color: "text-orange-400" },
  p3: { color: "text-blue-400" },
  p4: { color: "text-muted-foreground" },
};

function PriorityFlag({ priority, size = 12 }: { priority?: TaskPriority; size?: number }) {
  const cfg = PRIORITY_CONFIG[priority || "p4"];
  return <Flag weight="fill" className={cn("shrink-0", cfg.color)} style={{ width: size, height: size }} />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Card component (matches Kanban board card style)
   ═══════════════════════════════════════════════════════════════════════════ */

interface TodayKanbanCardProps {
  card: KanbanCard;
  columnTitle: string;
  relevantTasks: KanbanCustomTask[];
  estimativas: Estimativa[];
  onToggleCompleted: () => void;
  onToggleTask: (taskId: string) => void;
  onOpen: () => void;
}

function TodayKanbanCard({
  card,
  columnTitle,
  relevantTasks,
  estimativas,
  onToggleCompleted,
  onToggleTask,
  onOpen,
}: TodayKanbanCardProps) {
  const estimate = estimativas.find((e) => e.id === card.estimateId && e.tipo === "estimativa-pacotes");
  const estimateTasks = estimate ? getTasksForEstimate(estimate) : [];
  const { total, completed, percent } = getCardProgress(card, estimateTasks);

  return (
    <Card
      onClick={onOpen}
      className={cn(
        "group cursor-pointer rounded-xl shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5",
        "border-border/60 bg-card w-full",
        card.completed && "opacity-75"
      )}
    >
      <CardContent className="space-y-2 p-3">
        {/* Top row: priority + badges + column */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {card.priority ? <PriorityFlag priority={card.priority} size={12} /> : <span />}
            {card.isTemplate && (
              <span className="rounded bg-amber-500/10 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Template
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
            {columnTitle}
          </span>
        </div>

        {/* Title + completed checkbox */}
        <div className="flex items-start gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleCompleted(); }}
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

        {/* Relevant tasks preview */}
        {relevantTasks.length > 0 && (
          <div className="space-y-1 rounded-lg bg-muted/40 p-2">
            {relevantTasks.slice(0, 3).map((task) => (
              <div key={task.id} className="flex items-start gap-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleTask(task.id); }}
                  className={cn(
                    "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition-all",
                    task.completed
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-muted-foreground/30"
                  )}
                >
                  {task.completed && <Check weight="bold" className="h-2.5 w-2.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[11px] leading-tight", task.completed && "text-muted-foreground line-through")}>
                    {task.title}
                  </p>
                  {task.dueDate && (
                    <span className={cn(
                      "text-[10px]",
                      isOverdue(task.dueDate) ? "text-red-500" : "text-primary"
                    )}>
                      {formatDateRelative(task.dueDate)}
                      {isOverdue(task.dueDate) && ` (atrasado há ${daysOverdue(task.dueDate)} dias)`}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {relevantTasks.length > 3 && (
              <p className="text-[10px] text-muted-foreground pl-5">
                +{relevantTasks.length - 3} tarefas
              </p>
            )}
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
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Collect tasks from a card that are due today or overdue
   ═══════════════════════════════════════════════════════════════════════════ */

function getRelevantTasks(card: KanbanCard): { overdue: KanbanCustomTask[]; today: KanbanCustomTask[] } {
  const tasks = card.tasks || [];
  const overdue: KanbanCustomTask[] = [];
  const today: KanbanCustomTask[] = [];

  for (const task of tasks) {
    if (task.dueDate) {
      if (isOverdue(task.dueDate)) overdue.push(task);
      else if (isToday(task.dueDate)) today.push(task);
    }
  }

  return { overdue, today };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main View
   ═══════════════════════════════════════════════════════════════════════════ */

export function HojeView({
  cards,
  columns,
  estimativas,
  onUpdateCard,
  onToggleCardTaskCompleted,
  onArchiveCard,
  onRemoveCard,
  onOpenCard,
}: HojeViewProps) {
  const columnMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const col of columns) map.set(col.id, col.title);
    return map;
  }, [columns]);

  const { overdueCards, todayCards } = useMemo(() => {
    const active = cards.filter((c) => !c.completed && !c.isArchived && !c.isTemplate);
    const overdue: Array<{ card: KanbanCard; tasks: KanbanCustomTask[] }> = [];
    const today: Array<{ card: KanbanCard; tasks: KanbanCustomTask[] }> = [];

    for (const card of active) {
      const { overdue: oTasks, today: tTasks } = getRelevantTasks(card);
      const cardDueOverdue = card.dueDate && isOverdue(card.dueDate);
      const cardDueToday = card.dueDate && isToday(card.dueDate);

      if (oTasks.length > 0 || cardDueOverdue) {
        overdue.push({ card, tasks: oTasks });
      }
      if (tTasks.length > 0 || cardDueToday) {
        today.push({ card, tasks: tTasks });
      }
    }

    overdue.sort((a, b) => {
      const priA = a.card.priority === "p1" ? 4 : a.card.priority === "p2" ? 3 : a.card.priority === "p3" ? 2 : 1;
      const priB = b.card.priority === "p1" ? 4 : b.card.priority === "p2" ? 3 : b.card.priority === "p3" ? 2 : 1;
      if (priB !== priA) return priB - priA;
      return b.tasks.length - a.tasks.length;
    });

    today.sort((a, b) => {
      const priA = a.card.priority === "p1" ? 4 : a.card.priority === "p2" ? 3 : a.card.priority === "p3" ? 2 : 1;
      const priB = b.card.priority === "p1" ? 4 : b.card.priority === "p2" ? 3 : b.card.priority === "p3" ? 2 : 1;
      if (priB !== priA) return priB - priA;
      return b.tasks.length - a.tasks.length;
    });

    return { overdueCards: overdue, todayCards: today };
  }, [cards]);

  const totalCount = overdueCards.length + todayCards.length;

  const handleToggleCompleted = useCallback(
    (cardId: string) => { onUpdateCard(cardId, { completed: true }); },
    [onUpdateCard]
  );

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto pb-6 min-w-0">
      {/* Header */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-amber-500" weight="fill" />
          <h1 className="text-xl font-semibold tracking-tight">Hoje</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {todayFormatted()} · {totalCount} {totalCount === 1 ? "card" : "cards"}
        </p>
      </div>

      {/* Overdue Section */}
      {overdueCards.length > 0 && (
        <div className="px-4 space-y-3">
          <h2 className="text-sm font-semibold text-red-500 flex items-center gap-1.5">
            <Warning className="h-4 w-4" />
            Atrasados ({overdueCards.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {overdueCards.map(({ card, tasks }) => (
              <TodayKanbanCard
                key={`overdue-${card.id}`}
                card={card}
                columnTitle={columnMap.get(card.columnId) || "—"}
                relevantTasks={tasks}
                estimativas={estimativas}
                onToggleCompleted={() => handleToggleCompleted(card.id)}
                onToggleTask={(taskId) => onToggleCardTaskCompleted(card.id, taskId)}
                onOpen={() => onOpenCard(card.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Today Section */}
      {todayCards.length > 0 && (
        <div className="px-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Sun className="h-4 w-4 text-primary" />
            Hoje ({todayCards.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {todayCards.map(({ card, tasks }) => (
              <TodayKanbanCard
                key={`today-${card.id}`}
                card={card}
                columnTitle={columnMap.get(card.columnId) || "—"}
                relevantTasks={tasks}
                estimativas={estimativas}
                onToggleCompleted={() => handleToggleCompleted(card.id)}
                onToggleTask={(taskId) => onToggleCardTaskCompleted(card.id, taskId)}
                onOpen={() => onOpenCard(card.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalCount === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <Sun className="h-12 w-12 text-muted-foreground/30 mb-3" weight="fill" />
          <p className="text-sm font-medium text-muted-foreground">Nenhuma tarefa para hoje</p>
          <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm">
            Cards que possuem tarefas com vencimento hoje ou atrasado aparecerão aqui.
          </p>
        </div>
      )}
    </div>
  );
}
