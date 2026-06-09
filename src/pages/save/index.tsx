import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Download } from "@phosphor-icons/react";
import { EstimativaHistorico } from "@/components/estimativa-historico";
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
  form,
  timelineRows,
}: SavePageProps) {
  return (
    <div className="space-y-6 pt-2">
      <Card className="w-full print:hidden border border-border/60 bg-card rounded-xl shadow-sm">
        <CardContent className="p-6 space-y-6">
          <EstimativaHistorico
            historico={(estimativas as any[]).filter(e => e.tipo === 'estimativa-pacotes')}
            onLoad={onLoad}
            onDelete={onDelete}
            onSave={onSave}
            onFavorite={onFavorite}
            favoriteIds={favoriteIds}
          />

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button className="w-full" onClick={onAbrirPDF} variant="default">Abrir Estimativa</Button>
              <Button className="w-full" onClick={onGerarPDF} variant="default">Baixar Estimativa</Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button className="w-full" onClick={onAbrirCalendario} variant="default">
                <Calendar className="mr-2 h-4 w-4" />
                Abrir Calendário
              </Button>
              <Button className="w-full" onClick={onGerarPDFCalendario} variant="default">
                <Download className="mr-2 h-4 w-4" />
                Baixar Calendário
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <TimeLine
        form={form}
        timelineRows={timelineRows}
      />
    </div>
  );
}
