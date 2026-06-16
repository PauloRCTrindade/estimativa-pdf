import type { Estimativa, KanbanCard } from "@/types";
import { cn } from "@/lib/utils";
import {
  formatDateBR,
  calcScheduleComparison,
  formatDiffDays,
  formatChgWindow,
  type CompareStatus,
} from "./kanbanHelpers";
import { Warning, CheckCircle, XCircle, ChartLineUp } from "@phosphor-icons/react";

interface ScheduleComparisonProps {
  estimate: Estimativa;
  card: KanbanCard;
  realEnd: Date | string | undefined;
  holidays?: string[];
  releases?: string[];
  className?: string;
}

const STATUS_STYLES: Record<CompareStatus, { icon: typeof CheckCircle; container: string; iconColor: string; title: string }> = {
  ok: {
    icon: CheckCircle,
    container: "border-emerald-500/30 bg-emerald-500/[0.06]",
    iconColor: "text-emerald-500",
    title: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    icon: Warning,
    container: "border-amber-500/30 bg-amber-500/[0.06]",
    iconColor: "text-amber-500",
    title: "text-amber-600 dark:text-amber-400",
  },
  critical: {
    icon: XCircle,
    container: "border-red-500/30 bg-red-500/[0.06]",
    iconColor: "text-red-500",
    title: "text-red-600 dark:text-red-400",
  },
};

function ComparisonRow({ label, value, valueClassName }: { label: string; value: React.ReactNode; valueClassName?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-xs font-medium tabular-nums text-foreground",
          "break-words",
          valueClassName
        )}
        style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
      >
        {value}
      </span>
    </div>
  );
}

export function ScheduleComparison({ estimate, card, realEnd, holidays = [], releases = [], className }: ScheduleComparisonProps) {
  const comparison = calcScheduleComparison(estimate, card, realEnd, holidays, releases);

  const hasRealStart = !!comparison.realStart;
  const hasRealEnd = !!comparison.realEnd;

  return (
    <div className={cn("rounded-lg border border-border/60 bg-card p-4", className)}>
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
        <ChartLineUp className="h-4 w-4 text-muted-foreground" />
        Comparativo estimado × real
      </div>

      <div className="flex flex-col gap-6">
        {/* Estimado vs Real — lado a lado */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Estimated schedule */}
          <div className="flex flex-col justify-start gap-4 rounded-md border border-border/60 bg-muted/30 p-3.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Estimado</h4>
            <div className="flex flex-col gap-4">
              <ComparisonRow label="Início" value={formatDateBR(comparison.estimatedStart)} />
              <ComparisonRow label="Término" value={formatDateBR(comparison.estimatedEnd)} />
              <ComparisonRow label="Subida em produção" value={formatDateBR(comparison.productionDate)} />
            </div>
          </div>

          {/* Real schedule */}
          <div className="flex flex-col justify-start gap-4 rounded-md border border-border/60 bg-muted/30 p-3.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Real</h4>
            <div className="flex flex-col gap-4">
              <ComparisonRow
                label="Início"
                value={hasRealStart ? formatDateBR(comparison.realStart) : "—"}
              />
              <ComparisonRow
                label="Término previsto"
                value={hasRealEnd ? formatDateBR(comparison.realEnd) : "—"}
              />
              <ComparisonRow label="Subida em produção" value={formatDateBR(comparison.productionDate)} />
            </div>
          </div>
        </div>

        {/* Differences — abaixo */}
        <div className="flex w-full flex-col justify-start gap-4 rounded-md border border-border/60 bg-muted/30 p-3.5">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Diferença</h4>
          <div className="flex flex-col gap-4 sm:grid sm:grid-cols-3">
            <ComparisonRow
              label="Início"
              value={formatDiffDays(comparison.diffStartDays)}
              valueClassName={cn(
                comparison.diffStartDays === null
                  ? "text-muted-foreground"
                  : comparison.diffStartDays > 0
                  ? "text-red-500"
                  : comparison.diffStartDays < 0
                  ? "text-emerald-500"
                  : "text-foreground"
              )}
            />
            <ComparisonRow
              label="Término"
              value={formatDiffDays(comparison.diffEndDays)}
              valueClassName={cn(
                comparison.diffEndDays === null
                  ? "text-muted-foreground"
                  : comparison.diffEndDays > 0
                  ? "text-red-500"
                  : comparison.diffEndDays < 0
                  ? "text-emerald-500"
                  : "text-foreground"
              )}
            />
            <ComparisonRow label="Janela CHG" value={formatChgWindow(comparison.chgWindow)} />
          </div>
        </div>
      </div>

      {/* CHG alert */}
      {comparison.chgMessage && (
        <div
          className={cn(
            "mt-4 w-full flex items-start gap-3 rounded-md border p-3",
            STATUS_STYLES[comparison.chgStatus].container
          )}
        >
          {(() => {
            const Icon = STATUS_STYLES[comparison.chgStatus].icon;
            return <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", STATUS_STYLES[comparison.chgStatus].iconColor)} />;
          })()}
          <div className="min-w-0 space-y-0.5">
            <p className={cn("text-xs font-semibold", STATUS_STYLES[comparison.chgStatus].title)}>
              {comparison.chgMessage}
            </p>
            {comparison.chgDetail && (
              <p className="text-xs leading-relaxed text-muted-foreground">{comparison.chgDetail}</p>
            )}
          </div>
        </div>
      )}

      {!hasRealStart && (
        <p className="mt-3 text-xs text-muted-foreground">
          Informe a data real de início no card para calcular o comparativo completo.
        </p>
      )}
    </div>
  );
}
