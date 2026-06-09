import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { DatePicker } from "@/components/date-picker";
import type { AppForm } from "@/types";

interface InformationPageProps {
  form: AppForm;
  updateForm: (field: string, value: unknown) => void;
  feriados: string[];
  releases: string[];
}

export function InformationPage({ form, updateForm, feriados, releases }: InformationPageProps) {
  return (
    <div className="space-y-6 pt-2">
      <Card className="w-full print:hidden border border-border/60 bg-card rounded-xl shadow-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Título da estimativa" required>
              <Input value={form.titulo} onChange={(e) => updateForm("titulo", e.target.value)} placeholder="Ex: PTI-123" />
            </FormField>
            <FormField label="Arquiteto" required>
              <Input value={form.arquiteto} onChange={(e) => updateForm("arquiteto", e.target.value)} placeholder="Nome do arquiteto" />
            </FormField>
            <FormField label="Subida em Produção" hint="Data prevista">
              <DatePicker value={form.releaseAlvo || ""} onChange={(date) => updateForm("releaseAlvo", date)} placeholder="dd/mm/aaaa" feriados={feriados} releases={releases} />
            </FormField>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
