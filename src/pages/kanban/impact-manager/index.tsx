import { useMemo } from "react";
import type { Estimativa, KanbanCard } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/form-field";
import { DateRangeList } from "@/components/date-range-list";
import { CalendarGrid } from "@/components/kanban/shared/CalendarGrid";
import { Legend } from "@/components/legend";
import { CALENDAR_GROUPS, CALENDAR_CATEGORIES } from "@/styles";
import { buildRealCalendar, diffDiasCorridos, formatDateBR } from "@/components/kanban/shared/kanbanHelpers";
import { ArrowLeft } from "@phosphor-icons/react";

interface ImpactManagerProps {
  card: KanbanCard;
  estimate: Estimativa;
  feriados?: string[];
  releases?: string[];
  onUpdateCard: (cardId: string, patch: Partial<Omit<KanbanCard, "id" | "tasks">>) => void;
  onClose: () => void;
}

export function ImpactManager({ card, estimate, feriados, releases, onUpdateCard, onClose }: ImpactManagerProps) {
  const realCalendar = useMemo(
    () =>
      buildRealCalendar(
        estimate,
        card.dataRealInicio,
        card.diasImpactados,
        card.chgDias,
        card.esteiraPreProd,
        feriados,
        releases
      ),
    [estimate, card.dataRealInicio, card.diasImpactados, card.chgDias, card.esteiraPreProd, feriados, releases]
  );

  const estimateCalendar = useMemo(
    () => buildRealCalendar(estimate, estimate.inicio, estimate.diasParados, estimate.chgDias, estimate.esteiraPreProd, feriados, releases),
    [estimate, feriados, releases]
  );

  const diferencaDias = diffDiasCorridos(estimateCalendar.rangeEnd, realCalendar.rangeEnd);
  const readOnly = card.isArchived;

  const legendItems = CALENDAR_GROUPS.map((group) => ({
    ...group,
    items: Object.values(CALENDAR_CATEGORIES).filter((c) => c.group === group.key),
  }));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
            Voltar ao card
          </Button>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Gerenciador de Impacto</h2>
            <p className="text-xs text-muted-foreground">{card.title}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Comparative summary */}
          <Card className="border-border/60 bg-card">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estimativa</h3>
                  <div className="space-y-1 text-xs">
                    <div>
                      <span className="text-muted-foreground">Início:</span>{" "}
                      <span className="font-medium text-foreground">{formatDateBR(estimate.inicio)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Término:</span>{" "}
                      <span className="font-medium text-foreground">{formatDateBR(estimateCalendar.rangeEnd?.toISOString() || "")}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Real</h3>
                  <div className="space-y-1 text-xs">
                    <div>
                      <span className="text-muted-foreground">Início:</span>{" "}
                      <span className="font-medium text-foreground">{formatDateBR(card.dataRealInicio)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Término previsto:</span>{" "}
                      <span className="font-medium text-foreground">{formatDateBR(realCalendar.rangeEnd?.toISOString() || "")}</span>
                    </div>
                    {typeof diferencaDias === "number" && (
                      <div className={`font-semibold ${diferencaDias > 0 ? "text-red-500" : diferencaDias < 0 ? "text-emerald-500" : "text-muted-foreground"}`}>
                        Impacto: {diferencaDias > 0 ? `+${diferencaDias}` : diferencaDias} dias
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <Card className="border-border/60 bg-card">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField label="Dias de trâmite CHG" hint="Número de dias de processamento">
                  <Input
                    type="number"
                    min="0"
                    value={card.chgDias || ""}
                    onChange={(e) => onUpdateCard(card.id, { chgDias: Number(e.target.value) })}
                    placeholder="Ex: 3"
                    disabled={readOnly}
                  />
                </FormField>
                <FormField label="Dias impactados" hint="Períodos em que o projeto está parado">
                  <DateRangeList
                    value={card.diasImpactados || ""}
                    onChange={(v) => onUpdateCard(card.id, { diasImpactados: v })}
                    placeholder="Clique para adicionar dias"
                  />
                </FormField>
                <FormField label="Período de esteira preprod" hint="Tempo em pré-produção">
                  <DateRangeList
                    value={card.esteiraPreProd || ""}
                    onChange={(v) => onUpdateCard(card.id, { esteiraPreProd: v })}
                    placeholder="Clique para adicionar períodos"
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* Real calendar */}
          <Card className="border-border/60 bg-card">
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Calendário Real</h3>
              <div className="overflow-x-auto text-[11px]">
                <CalendarGrid
                  rows={realCalendar.rows}
                  rangeStart={realCalendar.rangeStart}
                  rangeEnd={realCalendar.rangeEnd}
                  showPeriod
                />
              </div>
              <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border/60">
                {legendItems.map((group) => (
                  <div key={group.key} className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[70px]">
                      {group.label}
                    </span>
                    {group.items.map((category) => (
                      <Legend key={category.key} category={category.key} />
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
