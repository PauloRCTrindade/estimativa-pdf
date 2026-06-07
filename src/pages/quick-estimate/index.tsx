import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { FileText } from "@phosphor-icons/react";
import { FormField } from "@/components/form-field";
import { DatePicker } from "@/components/date-picker";
import { DateRangeList } from "@/components/date-range-list";
import { AtividadesList } from "@/components/atividades-list";
import { EstimativaHistorico } from "@/components/estimativa-historico";
import { PdfPreview } from "@/components/pdf-preview";
import { TimeLine } from "@/components/time-line";
import type { AppForm } from "@/types";

interface QuickEstimatePageProps {
  form: AppForm;
  updateForm: (field: string, value: unknown) => void;
  atividades: any[];
  updateAtividade: (id: string, field: string, value: unknown) => void;
  moveAtividade: (id: string, direction: number) => void;
  removeAtividade: (id: string) => void;
  addAtividade: () => void;
  salvarTemplate: () => void;
  restaurarPadrao: () => void;
  estimativas: any[];
  onLoad: (item: any) => void;
  onDelete: (id: string) => void;
  onSave: () => void;
  onAbrirPDF: () => void;
  onGerarPDF: () => void;
  onAbrirCalendario: () => void;
  onGerarPDFCalendario: () => void;
  totalDias: number;
  calculo: any;
  timelineRows: any[][];
}

export function QuickEstimatePage({
  form,
  updateForm,
  atividades,
  updateAtividade,
  moveAtividade,
  removeAtividade,
  addAtividade,
  salvarTemplate,
  restaurarPadrao,
  estimativas,
  onLoad,
  onDelete,
  onSave,
  onAbrirPDF,
  onGerarPDF,
  onAbrirCalendario,
  onGerarPDFCalendario,
  totalDias,
  calculo,
  timelineRows,
}: QuickEstimatePageProps) {
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[400px_1fr]">
      <Card className="print:hidden">
        <CardContent className="space-y-4 p-5">
          <h1 className="text-xl font-bold">Gerador de estimativa</h1>

          {/* Informações da Estimativa - Sempre visível */}
          <Card className="border-zinc-200">
            <div className="p-4">
              <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Informações da Estimativa
              </h2>
              <div className="space-y-3">
                <FormField label="Título da estimativa" required>
                  <Input
                    value={form.titulo}
                    onChange={(event) => updateForm("titulo", event.target.value)}
                    placeholder="Ex: PTI-123"
                  />
                </FormField>
                <FormField label="Arquiteto" required>
                  <Input
                    value={form.arquiteto}
                    onChange={(event) => updateForm("arquiteto", event.target.value)}
                    placeholder="Nome do arquiteto"
                  />
                </FormField>
                <FormField label="Início" required hint="Primeiro dia útil do projeto">
                  <DatePicker
                    value={form.inicio}
                    onChange={(date) => updateForm("inicio", date)}
                    placeholder="Data de início (dd/mm/aaaa)"
                  />
                </FormField>
                <FormField label="Subida em Produção" required hint="Data prevista de release">
                  <DatePicker
                    value={form.releaseAlvo || ""}
                    onChange={(date) => updateForm("releaseAlvo", date)}
                    placeholder="Release alvo (dd/mm/aaaa)"
                  />
                </FormField>
              </div>
            </div>
          </Card>

          {/* Accordion Sections */}
          <Accordion type="single" collapsible className="w-full space-y-2">

            {/* Visão Geral */}
            <div className="border rounded-lg overflow-hidden">
              <AccordionItem value="impact-view" className="border-0">
                <AccordionTrigger className="hover:no-underline hover:bg-zinc-50 px-4">🎯 Visão Geral</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4 px-4 pb-4 border-t">
                  <FormField label="Dias de trâmite CHG" hint="Número de dias de processamento">
                    <Input
                      type="number"
                      min="0"
                      value={form.chgDias || ""}
                      onChange={(event) => updateForm("chgDias", event.target.value)}
                      placeholder="Ex: 3"
                    />
                  </FormField>
                  <FormField label="Dias impactados" hint="Períodos em que o projeto está parado">
                    <DateRangeList
                      value={form.diasParados || ""}
                      onChange={(value) => updateForm("diasParados", value)}
                      placeholder="Clique para adicionar dias"
                    />
                  </FormField>
                  <FormField label="Período de esteira preprod" hint="Tempo em pré-produção">
                    <DateRangeList
                      value={form.esteiraPreProd || ""}
                      onChange={(value) => updateForm("esteiraPreProd", value)}
                      placeholder="Clique para adicionar períodos"
                    />
                  </FormField>
                </AccordionContent>
              </AccordionItem>
            </div>

            {/* Observações */}
            <div className="border rounded-lg overflow-hidden">
              <AccordionItem value="observations" className="border-0">
                <AccordionTrigger className="hover:no-underline hover:bg-zinc-50 px-4">📝 Observações</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4 px-4 pb-4 border-t">
                  <FormField label="Pontos de atenção">
                    <Textarea
                      value={form.pontos}
                      onChange={(event) => updateForm("pontos", event.target.value)}
                      placeholder="Listee os pontos de atenção"
                      className="min-h-24"
                    />
                  </FormField>
                  <FormField label="Premissas">
                    <Textarea
                      value={form.premissas}
                      onChange={(event) => updateForm("premissas", event.target.value)}
                      placeholder="Listee as premissas do projeto"
                      className="min-h-24"
                    />
                  </FormField>
                  <FormField label="Restrições">
                    <Textarea
                      value={form.restricoes}
                      onChange={(event) => updateForm("restricoes", event.target.value)}
                      placeholder="Listee as restrições"
                      className="min-h-24"
                    />
                  </FormField>
                  <FormField label="Observações">
                    <Textarea
                      value={form.observacoes}
                      onChange={(event) => updateForm("observacoes", event.target.value)}
                      placeholder="Observações gerais"
                      className="min-h-24"
                    />
                  </FormField>
                </AccordionContent>
              </AccordionItem>
            </div>

            {/* Atividades */}
            <div className="border rounded-lg overflow-hidden">
              <AccordionItem value="activities" className="border-0">
                <AccordionTrigger className="hover:no-underline hover:bg-zinc-50 px-4">✓ Atividades</AccordionTrigger>
                <AccordionContent className="space-y-3 pt-4 px-4 pb-4 border-t">
                  <AtividadesList
                    atividades={atividades}
                    onUpdate={updateAtividade}
                    onMove={moveAtividade}
                    onRemove={removeAtividade}
                    onAdd={addAtividade}
                  />
                </AccordionContent>
              </AccordionItem>
            </div>
          </Accordion>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={salvarTemplate} size="sm">Salvar template</Button>
            <Button variant="outline" onClick={restaurarPadrao} size="sm">Restaurar padrão</Button>
          </div>

          <EstimativaHistorico
            historico={estimativas.filter(e => !e.tipo || e.tipo === 'estimativa-rapida')}
            onLoad={onLoad}
            onDelete={onDelete}
            onSave={onSave}
          />

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button className="w-full" onClick={onAbrirPDF} variant="default">Abrir Estimativa</Button>
              <Button className="w-full" onClick={onGerarPDF} variant="default">Baixar Estimativa</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button className="w-full" onClick={onAbrirCalendario} variant="default">🗓️ Abrir Calendário</Button>
              <Button className="w-full" onClick={onGerarPDFCalendario} variant="default">📅 Baixar Calendário</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <PdfPreview
        form={form}
        totalDias={totalDias}
        calculo={calculo}
        timelineRows={timelineRows}
      />
      <TimeLine
        form={form}
        timelineRows={timelineRows}
      />
    </div>
  );
}
