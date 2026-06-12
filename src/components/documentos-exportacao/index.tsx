import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, CalendarBlank, Eye, Download } from "@phosphor-icons/react";

interface DocumentosExportacaoProps {
  onVisualizarEstimativa: () => void;
  onBaixarEstimativa: () => void;
  onVisualizarCalendario: () => void;
  onBaixarCalendario: () => void;
}

export function DocumentosExportacao({
  onVisualizarEstimativa,
  onBaixarEstimativa,
  onVisualizarCalendario,
  onBaixarCalendario,
}: DocumentosExportacaoProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Documentos Gerados</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="p-3 border-border/60 bg-card/50">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 p-1.5 rounded-md bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <p className="text-sm font-medium text-foreground">Estimativa PDF</p>
                <p className="text-xs text-muted-foreground">Visualizar ou baixar a estimativa</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={onVisualizarEstimativa}
                  className="h-7 text-xs px-2.5"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Visualizar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onBaixarEstimativa}
                  className="h-7 text-xs px-2.5"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Baixar
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-3 border-border/60 bg-card/50">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 p-1.5 rounded-md bg-primary/10 text-primary">
              <CalendarBlank className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <p className="text-sm font-medium text-foreground">Calendário PDF</p>
                <p className="text-xs text-muted-foreground">Visualizar ou baixar o calendário</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={onVisualizarCalendario}
                  className="h-7 text-xs px-2.5"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Visualizar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onBaixarCalendario}
                  className="h-7 text-xs px-2.5"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Baixar
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
