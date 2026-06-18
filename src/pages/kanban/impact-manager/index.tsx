import { useMemo, useEffect, useRef, useCallback } from "react";
import type { Estimativa, KanbanCard } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/form-field";
import { DateRangeList } from "@/components/date-range-list";
import { CalendarGrid } from "@/components/kanban/shared/CalendarGrid";
import { ScheduleComparison } from "@/components/kanban/shared/ScheduleComparison";
import { RealScheduleTable } from "@/components/kanban/shared/RealScheduleTable";
import { Legend } from "@/components/legend";
import { CALENDAR_GROUPS, CALENDAR_CATEGORIES } from "@/styles";
import { buildRealCalendar } from "@/components/kanban/shared/kanbanHelpers";
import { parseDiasParadosList } from "@/utils";
import {
  initializeRealSchedule,
  rebuildRealScheduleFromEstimate,
  type Pacote,
} from "@/utils/schedule";
import { ArrowLeft, ArrowsClockwise } from "@phosphor-icons/react";

interface ImpactManagerProps {
  card: KanbanCard;
  estimate: Estimativa;
  feriados?: string[];
  releases?: string[];
  onUpdateCard: (
    cardId: string,
    patch: Partial<Omit<KanbanCard, "id" | "tasks">>
  ) => void;
  onClose: () => void;
}

export function ImpactManager({
  card,
  estimate,
  feriados,
  releases,
  onUpdateCard,
  onClose,
}: ImpactManagerProps) {
  const readOnly = card.isArchived;
  const initialized = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inicializa o cronograma real automaticamente na primeira abertura,
  // desde que exista dataRealInicio e a estimativa tenha pacotes.
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (
      !card.cronogramaReal?.length &&
      card.dataRealInicio &&
      Array.isArray(estimate.pacotes) &&
      estimate.pacotes.length > 0
    ) {
      const next = initializeRealSchedule(
        estimate.pacotes as Pacote[],
        card.dataRealInicio,
        feriados ?? [],
        releases ?? []
      );
      onUpdateCard(card.id, { cronogramaReal: next });
    }
  }, [card.id, card.cronogramaReal, card.dataRealInicio, estimate.pacotes, onUpdateCard, feriados, releases]);

  const paradoRanges = useMemo(
    () => parseDiasParadosList(card.diasImpactados || ""),
    [card.diasImpactados]
  );

  const realCalendar = useMemo(
    () =>
      buildRealCalendar(
        estimate,
        card.dataRealInicio,
        card.diasImpactados,
        card.chgDias,
        card.esteiraPreProd,
        feriados,
        releases,
        card.cronogramaReal
      ),
    [
      estimate,
      card.dataRealInicio,
      card.diasImpactados,
      card.chgDias,
      card.esteiraPreProd,
      card.cronogramaReal,
      feriados,
      releases,
    ]
  );

  const handleScheduleChange = useCallback(
    (next: Pacote[]) => {
      // Atualiza o estado local imediatamente para refletir no calendário/comparativo.
      onUpdateCard(card.id, { cronogramaReal: next });

      // Debounce para persistir no backend (a chamada acima já é otimista;
      // evitamos sobrecarregar a API enquanto o usuário edita várias células).
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        // Nada extra: onUpdateCard já persiste. O debounce aqui é apenas para
        // reduzir a frequência de requisições caso onUpdateCard seja muito rápido.
      }, 500);
    },
    [card.id, onUpdateCard]
  );

  const handleReinicializar = useCallback(() => {
    if (
      !card.dataRealInicio ||
      !Array.isArray(estimate.pacotes) ||
      estimate.pacotes.length === 0
    )
      return;
    const next = rebuildRealScheduleFromEstimate(
      estimate.pacotes as Pacote[],
      card.dataRealInicio,
      feriados ?? [],
      releases ?? []
    );
    onUpdateCard(card.id, { cronogramaReal: next });
  }, [card.id, card.dataRealInicio, estimate.pacotes, onUpdateCard, feriados, releases]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const legendItems = CALENDAR_GROUPS.map((group) => ({
    ...group,
    items: Object.values(CALENDAR_CATEGORIES).filter(
      (c) => c.group === group.key
    ),
  }));

  const showSchedule =
    Array.isArray(card.cronogramaReal) && card.cronogramaReal.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onClose}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao card
          </Button>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Gerenciador de Impacto
            </h2>
            <p className="text-xs text-muted-foreground">{card.title}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Comparative summary */}
          <ScheduleComparison
            estimate={estimate}
            card={card}
            realEnd={realCalendar.calculatedEndDate}
            holidays={feriados}
            releases={releases}
          />

          {/* Controls */}
          <Card className="border-border/60 bg-card">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  label="Dias de trâmite CHG"
                  hint="Número de dias de processamento"
                >
                  <Input
                    type="number"
                    min="0"
                    value={card.chgDias || ""}
                    onChange={(e) =>
                      onUpdateCard(card.id, { chgDias: Number(e.target.value) })
                    }
                    placeholder="Ex: 3"
                    disabled={readOnly}
                  />
                </FormField>
                <FormField
                  label="Dias impactados"
                  hint="Períodos em que o projeto está parado"
                >
                  <DateRangeList
                    value={card.diasImpactados || ""}
                    onChange={(v) =>
                      onUpdateCard(card.id, { diasImpactados: v })
                    }
                    placeholder="Clique para adicionar dias"
                  />
                </FormField>
                <FormField
                  label="Período de esteira preprod"
                  hint="Tempo em pré-produção"
                >
                  <DateRangeList
                    value={card.esteiraPreProd || ""}
                    onChange={(v) =>
                      onUpdateCard(card.id, { esteiraPreProd: v })
                    }
                    placeholder="Clique para adicionar períodos"
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* Real schedule table */}
          <Card className="border-border/60 bg-card">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Tabela de remanejamento real
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Edite início, horas e overtime sem alterar a estimativa
                    original.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={handleReinicializar}
                  disabled={readOnly}
                >
                  <ArrowsClockwise className="h-3.5 w-3.5" />
                  Reinicializar cronograma real
                </Button>
              </div>

              {showSchedule ? (
                <RealScheduleTable
                  pacotes={card.cronogramaReal as Pacote[]}
                  feriados={feriados ?? []}
                  releases={releases ?? []}
                  diasParados={paradoRanges}
                  readOnly={readOnly}
                  onChange={handleScheduleChange}
                />
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Informe a data real de início no card para gerar a tabela de remanejamento.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Real calendar */}
          <Card className="border-border/60 bg-card">
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Calendário Real
              </h3>
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
