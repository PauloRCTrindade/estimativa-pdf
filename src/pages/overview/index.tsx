import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { DateRangeList } from "@/components/date-range-list";
import { CalendarGrid } from "@/components/kanban/shared/CalendarGrid";
import { Legend } from "@/components/legend";
import { CALENDAR_GROUPS, CALENDAR_CATEGORIES } from "@/styles";
import type { AppForm } from "@/types";
import type { CalculoResult } from "@/features/estimativa";

interface OverviewPageProps {
  form: AppForm;
  updateForm: (field: string, value: unknown) => void;
  calculoPreviaPacotes: CalculoResult;
  timelineRowsPreviaPacotes: unknown[][];
}

export function OverviewPage({
  form,
  updateForm,
  calculoPreviaPacotes,
  timelineRowsPreviaPacotes,
}: OverviewPageProps) {
  const legendItems = CALENDAR_GROUPS.map((group) => ({
    ...group,
    items: Object.values(CALENDAR_CATEGORIES).filter((c) => c.group === group.key),
  }));

  const rangeStart = calculoPreviaPacotes.timeline[0]?.date || null;
  const rangeEnd = calculoPreviaPacotes.endDate || null;

  return (
    <div className="space-y-6 pt-2">
      <Card className="w-full print:hidden border border-border/60 bg-card rounded-xl shadow-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Dias de trâmite CHG" hint="Número de dias de processamento">
              <Input type="number" min="0" value={form.chgDias || ""} onChange={(e) => updateForm("chgDias", e.target.value)} placeholder="Ex: 3" />
            </FormField>
            <FormField label="Dias impactados" hint="Períodos em que o projeto está parado">
              <DateRangeList value={form.diasParados || ""} onChange={(v) => updateForm("diasParados", v)} placeholder="Clique para adicionar dias" />
            </FormField>
            <FormField label="Período de esteira preprod" hint="Tempo em pré-produção">
              <DateRangeList value={form.esteiraPreProd || ""} onChange={(v) => updateForm("esteiraPreProd", v)} placeholder="Clique para adicionar períodos" />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Seção dedicada: Calendário de Atividades - Largura total */}
      <Card className="w-full border border-border/60 bg-card rounded-xl shadow-sm">
        <CardContent className="p-6">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Calendário de Atividades</h3>
          <div className="overflow-x-auto text-[11px]">
            <CalendarGrid
              rows={timelineRowsPreviaPacotes as any}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              showPeriod
            />
          </div>
          {/* Legenda abaixo do calendário */}
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
  );
}
