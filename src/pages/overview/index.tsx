import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { DateRangeList } from "@/components/date-range-list";
import { TimeLine } from "@/components/time-line";
import { Legend } from "@/components/legend";
import { COLORS } from "@/styles";
import type { AppForm } from "@/types";
import type { CalculoResult } from "@/features/estimativa";
import { Rocket, X, Minus } from "@phosphor-icons/react";

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

      {/* Seção dedicada: Linha do Tempo - Largura total */}
      <Card className="w-full border border-border/60 bg-card rounded-xl shadow-sm">
        <CardContent className="p-6">
          <TimeLine
            form={{ ...form, inicio: calculoPreviaPacotes.inicioPacote }}
            timelineRows={timelineRowsPreviaPacotes}
            visible={true}
          />
          {/* Legenda abaixo da linha do tempo */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 pt-4 border-t border-border/60">
            <Legend color={COLORS.desenvolvimento} label="✓ Desenvolvimento" />
            <Legend color={COLORS.subida} label="✓ Subida em Pre Prod" />
            <Legend color={COLORS.testes} label="✓ QA Compass" />
            <Legend color={COLORS.weekend} label="✗ Fim de semana" />
            <Legend color={COLORS.postRelease} label="✗ Tombamento" />
            <Legend color={COLORS.holiday} label="Feriado" icon={<X className="h-3 w-3" />} />
            <Legend color={COLORS.blocked} label="Projeto Impactado" icon={<X className="h-3 w-3" />} />
            <Legend color={COLORS.releaseTarget} label="Subida em Produção" icon={<Rocket className="h-3 w-3" />} />
            <Legend color={COLORS.esteiraPreProd} label="Esteira Pre Prod" type="border" icon={<Minus className="h-3 w-3" />} />
            <Legend color={COLORS.chg} label="Trâmite CHG" type="border" icon={<Minus className="h-3 w-3" />} />
            <Legend color={COLORS.releaseDay} label="● Domingo da release" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
