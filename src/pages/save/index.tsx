import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FloppyDisk } from "@phosphor-icons/react";
import { EstimativaHistorico } from "@/components/estimativa-historico";
import { DocumentosExportacao } from "@/components/documentos-exportacao";
import { TimeLine } from "@/components/time-line";
import type { AppForm } from "@/types";

interface SavePageProps {
  estimativas: unknown[];
  onLoad: (item: unknown) => void;
  onDelete: (id: string) => void;
  onSave: () => void;
  onAbrirPDF: () => void;
  onGerarPDF: () => void;
  onAbrirCalendario: () => void;
  onGerarPDFCalendario: () => void;
  onFavorite: (item: any) => void;
  favoriteIds: string[];
  isAddingFavorite?: (id: string) => boolean;
  form: AppForm;
  timelineRows: any[][];
}

export function SavePage({
  estimativas,
  onLoad,
  onDelete,
  onSave,
  onAbrirPDF,
  onGerarPDF,
  onAbrirCalendario,
  onGerarPDFCalendario,
  onFavorite,
  favoriteIds,
  isAddingFavorite,
  form,
  timelineRows,
}: SavePageProps) {
  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Salvar</h2>
        <Button size="sm" onClick={onSave} className="h-8 text-xs">
          <FloppyDisk className="mr-1.5 h-3.5 w-3.5" />
          Salvar estimativa
        </Button>
      </div>

      <Card className="w-full print:hidden border border-border/60 bg-card rounded-xl shadow-sm">
        <CardContent className="p-6 space-y-6">
          <EstimativaHistorico
            historico={(estimativas as any[]).filter(e => e.tipo === 'estimativa-pacotes')}
            onLoad={onLoad}
            onDelete={onDelete}
            onFavorite={onFavorite}
            favoriteIds={favoriteIds}
            isAddingFavorite={isAddingFavorite}
          />

          <DocumentosExportacao
            onVisualizarEstimativa={onAbrirPDF}
            onBaixarEstimativa={onGerarPDF}
            onVisualizarCalendario={onAbrirCalendario}
            onBaixarCalendario={onGerarPDFCalendario}
          />
        </CardContent>
      </Card>

      <TimeLine
        form={form}
        timelineRows={timelineRows}
      />
    </div>
  );
}
