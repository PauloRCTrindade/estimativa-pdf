import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form-field";
import { PdfPreview } from "@/components/pdf-preview";
import type { AppForm } from "@/types";

interface DocumentPageProps {
  form: AppForm;
  updateForm: (field: string, value: unknown) => void;
  calculoPreviaPacotes: { inicioPacote: string; [key: string]: unknown };
  totalDiasPacotes: number;
  timelineRowsPreviaPacotes: unknown[][];
}

export function DocumentPage({
  form,
  updateForm,
  calculoPreviaPacotes,
  totalDiasPacotes,
  timelineRowsPreviaPacotes,
}: DocumentPageProps) {
  return (
    <div className="space-y-4 pt-2">
      <Card className="w-full print:hidden">
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Pontos de atenção">
              <Textarea value={form.pontos} onChange={(e) => updateForm("pontos", e.target.value)} placeholder="Liste os pontos de atenção" className="min-h-20" />
            </FormField>
            <FormField label="Premissas">
              <Textarea value={form.premissas} onChange={(e) => updateForm("premissas", e.target.value)} placeholder="Liste as premissas do projeto" className="min-h-20" />
            </FormField>
            <FormField label="Restrições">
              <Textarea value={form.restricoes} onChange={(e) => updateForm("restricoes", e.target.value)} placeholder="Liste as restrições" className="min-h-20" />
            </FormField>
            <FormField label="Observações">
              <Textarea value={form.observacoes} onChange={(e) => updateForm("observacoes", e.target.value)} placeholder="Observações gerais" className="min-h-20" />
            </FormField>
          </div>

          {/* Preview da Estimativa de Desenvolvimento */}
          <div className="w-full rounded-lg border border-zinc-200 overflow-hidden">
            <PdfPreview
              form={{ ...form, inicio: calculoPreviaPacotes.inicioPacote }}
              totalDias={totalDiasPacotes}
              calculo={calculoPreviaPacotes}
              timelineRows={timelineRowsPreviaPacotes}
              hideTimeline={true}
              pdfId="pdf-area-screen"
              fullWidth={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
