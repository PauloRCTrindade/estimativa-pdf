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
    <div className="space-y-6 pt-2">
      <Card className="w-full print:hidden border border-border/60 bg-card rounded-xl shadow-sm">
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Pontos de atenção">
              <Textarea value={form.pontos} onChange={(e) => updateForm("pontos", e.target.value)} placeholder="Liste os pontos de atenção" className="min-h-20 border-0 bg-muted/30" />
            </FormField>
            <FormField label="Premissas">
              <Textarea value={form.premissas} onChange={(e) => updateForm("premissas", e.target.value)} placeholder="Liste as premissas do projeto" className="min-h-20 border-0 bg-muted/30" />
            </FormField>
            <FormField label="Restrições">
              <Textarea value={form.restricoes} onChange={(e) => updateForm("restricoes", e.target.value)} placeholder="Liste as restrições" className="min-h-20 border-0 bg-muted/30" />
            </FormField>
            <FormField label="Observações">
              <Textarea value={form.observacoes} onChange={(e) => updateForm("observacoes", e.target.value)} placeholder="Observações gerais" className="min-h-20 border-0 bg-muted/30" />
            </FormField>
          </div>

          {/* Preview da Estimativa de Desenvolvimento */}
          <div className="w-full rounded-xl border border-border/60 overflow-hidden">
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
