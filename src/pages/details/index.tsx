import { Card, CardContent } from "@/components/ui/card";
import { EstimativaPacotesTable } from "@/components/estimativa-pacotes";
import type { Pacote } from "@/utils/schedule";

import { Package, ChartBar } from "@phosphor-icons/react";

interface DetailsPageProps {
  pacotes: Pacote[];
  feriados: string[];
  releases: string[];
  diasParados: Array<{ start: Date; end: Date }>;
  onUpdatePacote: (id: string, field: string, value: string) => void;
  onTogglePacote: (id: string) => void;
  onAddPacote: () => void;
  onRemovePacote: (id: string) => void;
  onAddAtividade: (pacoteId: string) => void;
  onUpdateAtividade: (pacoteId: string, atividadeId: string, field: string, value: unknown) => void;
  onRemoveAtividade: (pacoteId: string, atividadeId: string) => void;
  totalHorasOvertime: number;
  totalDiasAtuacao: number;
  dataInicioPacotes: string | null;
  dataTerminoPacotes: string | null;
}

export function DetailsPage({
  pacotes,
  feriados,
  releases,
  diasParados,
  onUpdatePacote,
  onTogglePacote,
  onAddPacote,
  onRemovePacote,
  onAddAtividade,
  onUpdateAtividade,
  onRemoveAtividade,
  totalHorasOvertime,
  totalDiasAtuacao,
  dataInicioPacotes,
  dataTerminoPacotes,
}: DetailsPageProps) {
  return (
    <div className="space-y-6 pt-2">
      {/* Pacotes e Atividades — largura total */}
      <Card className="w-full border border-border/60 bg-card rounded-xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Pacotes e Atividades
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Clique nas células para editar • Datas calculadas automaticamente
              </p>
            </div>
          </div>
          <EstimativaPacotesTable
            pacotes={pacotes}
            feriados={feriados}
            releases={releases}
            diasParados={diasParados}
            onUpdatePacote={onUpdatePacote}
            onTogglePacote={onTogglePacote}
            onAddPacote={onAddPacote}
            onRemovePacote={onRemovePacote}
            onAddAtividade={onAddAtividade}
            onUpdateAtividade={onUpdateAtividade}
            onRemoveAtividade={onRemoveAtividade}
          />
        </CardContent>
      </Card>

      {/* Resumo da Estimativa — largura total */}
      <Card className="w-full border border-border/60 bg-card rounded-xl shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold tracking-tight mb-4 flex items-center gap-2">
            <ChartBar className="h-5 w-5 text-primary" />
            Resumo da Estimativa
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="bg-muted/50 border border-border/60 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{pacotes.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Pacotes</p>
            </div>
            <div className="bg-muted/50 border border-border/60 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-foreground">
                {pacotes.reduce((acc, p) => acc + p.atividades.length, 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Atividades</p>
            </div>
            <div className="bg-muted/50 border border-border/60 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-foreground">
                {pacotes.reduce((acc, p) => {
                  const horasPorEtapa = new Map<string, number>();
                  for (const a of p.atividades) {
                    const etapa = String(a.etapa || "1");
                    if (!horasPorEtapa.has(etapa)) horasPorEtapa.set(etapa, Number(a.horas || 0));
                  }
                  return acc + Array.from(horasPorEtapa.values()).reduce((sum, h) => sum + h, 0);
                }, 0)}h
              </p>
              <p className="text-xs text-muted-foreground mt-1">Horas totais</p>
            </div>
            <div className="bg-muted/50 border border-border/60 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-foreground">
                {(() => {
                  const dias = Math.floor(totalHorasOvertime / 8);
                  const horas = totalHorasOvertime % 8;
                  if (dias === 0 && horas === 0) return "—";
                  if (dias === 0) return `${horas}h`;
                  if (horas === 0) return `${dias}d`;
                  return `${dias}d ${horas}h`;
                })()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Horas de Overtime</p>
            </div>
            <div className="bg-muted/50 border border-border/60 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{Math.round(totalDiasAtuacao)}</p>
              <p className="text-xs text-muted-foreground mt-1">Dias de Atuação</p>
            </div>
            <div className="bg-muted/50 border border-border/60 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-foreground tabular-nums">{dataInicioPacotes ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">Início</p>
            </div>
            <div className="bg-muted/50 border border-border/60 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-foreground tabular-nums">{dataTerminoPacotes ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">Término</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
