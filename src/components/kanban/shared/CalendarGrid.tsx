import { cn } from "@/lib/utils";
import { COLORS, getCalendarCategory } from "@/styles";
import { formatDateBR } from "./kanbanHelpers";

export interface CalendarGridDay {
  date: Date;
  tipo: string;
  color: string;
  isReleaseDay: boolean;
  isEsteiraPreProd: boolean;
  isChg: boolean;
}

interface CalendarGridProps {
  rows: Array<Array<CalendarGridDay | null>>;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  title?: string;
  emptyMessage?: string;
  showPeriod?: boolean;
  className?: string;
}

export function CalendarGrid({
  rows,
  rangeStart,
  rangeEnd,
  title,
  emptyMessage = "Calendário indisponível.",
  showPeriod = true,
  className,
}: CalendarGridProps) {
  if (!rows || rows.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {showPeriod && (rangeStart || rangeEnd) && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Período:</span>
          {rangeStart && (
            <span className="font-medium text-foreground">{formatDateBR(rangeStart.toISOString())}</span>
          )}
          <span>→</span>
          {rangeEnd && (
            <span className="font-medium text-foreground">{formatDateBR(rangeEnd.toISOString())}</span>
          )}
        </div>
      )}
      {title && <div className="text-xs font-semibold text-foreground">{title}</div>}
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="space-y-1">
          <div
            className="grid gap-1 text-[10px] uppercase tracking-wider text-muted-foreground"
            style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}
          >
            {row.map((day, index) => {
              const prevDay = index > 0 ? row[index - 1] : null;
              const showMonth = day && (!prevDay || prevDay.date.getMonth() !== day.date.getMonth());
              return (
                <div key={index} className="h-4 text-center">
                  {showMonth ? day.date.toLocaleString("pt-BR", { month: "short" }).toUpperCase() : ""}
                </div>
              );
            })}
          </div>
          <div
            className="grid gap-1 text-[10px] font-medium text-muted-foreground"
            style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}
          >
            {row.map((day, index) => (
              <div key={index} className="flex h-5 items-center justify-center rounded-sm">
                {day ? ["D", "S", "T", "Q", "Q", "S", "S"][day.date.getDay()] : ""}
              </div>
            ))}
          </div>
          <div
            className="grid gap-1 text-[11px] font-semibold text-foreground"
            style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}
          >
            {row.map((day, index) => (
              <div
                key={index}
                className={cn(
                  "flex h-7 items-center justify-center rounded-sm",
                  day ? "bg-muted" : "bg-transparent"
                )}
              >
                {day ? String(day.date.getDate()).padStart(2, "0") : ""}
              </div>
            ))}
          </div>
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}>
            {row.map((day, index) => {
              if (!day) return <div key={index} className="h-9 rounded-sm bg-muted/30" />;

              const category = getCalendarCategory(day.tipo);
              const showIcon = category?.key === "producao" || category?.key === "impactado";
              const icon = category?.icon;
              const hasActivity = Boolean(day.tipo);

              const cellStyle = hasActivity
                ? {
                    backgroundColor: day.color || "transparent",
                    border: day.isEsteiraPreProd
                      ? `2px solid ${COLORS.esteiraPreProd}`
                      : day.isChg
                      ? `2px solid ${COLORS.chg}`
                      : `1px solid hsl(var(--border) / 0.3)`,
                  }
                : undefined;

              return (
                <div
                  key={index}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-sm text-[10px] font-semibold",
                    hasActivity
                      ? showIcon
                        ? "text-zinc-950 dark:text-zinc-100"
                        : ""
                      : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  )}
                  style={cellStyle}
                  title={day.tipo || "Sem atividade"}
                >
                  {showIcon && icon ? <span>{icon}</span> : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
