import { Card, CardContent } from "@/components/ui/card";
import { EstimativaPacotesTable } from "@/components/estimativa-pacotes";
import type { Pacote } from "@/components/estimativa-pacotes";

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
    <div className="space-y-4 pt-2">
      {/* Pacotes e Atividades — largura total */}
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              📦 Pacotes e Atividades
            </h2>
            <p className="text-xs text-zinc-500">
              Clique nas células para editar • Datas calculadas automaticamente
            </p>
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
      <Card className="w-full">
        <CardContent className="p-5">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            📊 Resumo da Estimativa
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-orange-700">{pacotes.length}</p>
              <p className="text-xs text-orange-600 mt-1">Pacotes</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">
                {pacotes.reduce((acc, p) => acc + p.atividades.length, 0)}
              </p>
              <p className="text-xs text-blue-600 mt-1">Atividades</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-700">
                {pacotes.reduce((acc, p) => acc + p.atividades.reduce((a, b) => a + Number(b.horas || 0), 0), 0)}h
              </p>
              <p className="text-xs text-purple-600 mt-1">Horas totais</p>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-rose-700">
                {(() => {
                  const dias = Math.floor(totalHorasOvertime / 8);
                  const horas = totalHorasOvertime % 8;
                  if (dias === 0 && horas === 0) return "—";
                  if (dias === 0) return `${horas}h`;
                  if (horas === 0) return `${dias}d`;
                  return `${dias}d ${horas}h`;
                })()}
              </p>
              <p className="text-xs text-rose-600 mt-1">Horas de Overtime</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{Math.round(totalDiasAtuacao)}</p>
              <p className="text-xs text-green-600 mt-1">Dias de Atuação</p>
            </div>
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-cyan-700 tabular-nums">{dataInicioPacotes ?? "—"}</p>
              <p className="text-xs text-cyan-600 mt-1">Início</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-slate-700 tabular-nums">{dataTerminoPacotes ?? "—"}</p>
              <p className="text-xs text-slate-600 mt-1">Término</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
