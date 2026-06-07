import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalculoFinanceiro } from "@/components/calculo-financeiro";
import type { AppForm } from "@/types";

function formatDateBR(dataYYYYMMDD: string): string {
  if (!dataYYYYMMDD) return '';
  const [ano, mes, dia] = dataYYYYMMDD.split('-');
  if (!dia || !mes || !ano) return '';
  return `${dia}/${mes}/${ano}`;
}

interface FinancialPageProps {
  tipoFiltro: "arquiteto" | "demanda";
  setTipoFiltro: (v: "arquiteto" | "demanda") => void;
  valorFiltro: string;
  setValorFiltro: (v: string) => void;
  estimativasFiltradas: any[];
  carregandoFiltro: boolean;
  executarBusca: () => void;
  estimativaFinanceiro: any | null;
  setEstimativaFinanceiro: (v: any | null) => void;
  form: AppForm;
  atividades: any[];
}

export function FinancialPage({
  tipoFiltro,
  setTipoFiltro,
  valorFiltro,
  setValorFiltro,
  estimativasFiltradas,
  carregandoFiltro,
  executarBusca,
  estimativaFinanceiro,
  setEstimativaFinanceiro,
  form,
  atividades,
}: FinancialPageProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Filtro por arquiteto */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-bold mb-3">💰 Cálculo Financeiro</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-zinc-700 block mb-2">
                Tipo de Filtro
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTipoFiltro("arquiteto")}
                  className={`flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                    tipoFiltro === "arquiteto"
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-white hover:bg-zinc-50 border-zinc-200"
                  }`}
                >
                  👤 Arquiteto
                </button>
                <button
                  onClick={() => setTipoFiltro("demanda")}
                  className={`flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                    tipoFiltro === "demanda"
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-white hover:bg-zinc-50 border-zinc-200"
                  }`}
                >
                  📋 Demanda
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-700 block mb-1">
                {tipoFiltro === "arquiteto" ? "Nome do Arquiteto" : "Título ou Código da Demanda"}
              </label>
              <Input
                placeholder={tipoFiltro === "arquiteto" ? "Digite o nome do arquiteto..." : "Digite o título ou código..."}
                value={valorFiltro}
                onChange={(e) => setValorFiltro(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    executarBusca();
                  }
                }}
              />
            </div>
            <Button
              onClick={executarBusca}
              disabled={carregandoFiltro || !valorFiltro.trim()}
              className="w-full"
              size="sm"
            >
              {carregandoFiltro ? "🔍 Buscando..." : "🔍 Buscar"}
            </Button>

            {/* Lista de estimativas filtradas */}
            {estimativasFiltradas.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-1">
                  {estimativasFiltradas.length} estimativa{estimativasFiltradas.length !== 1 ? "s" : ""} encontrada{estimativasFiltradas.length !== 1 ? "s" : ""}
                </p>
                {estimativasFiltradas.map((est) => (
                  <button
                    key={est.id}
                    onClick={() => setEstimativaFinanceiro(est)}
                    className={`w-full text-left px-3 py-2 rounded-md border text-sm transition-colors ${
                      estimativaFinanceiro?.id === est.id
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "bg-white hover:bg-zinc-50 border-zinc-200"
                    }`}
                  >
                    <div className="font-medium">{est.titulo || "Sem título"}</div>
                    <div className={`text-xs ${estimativaFinanceiro?.id === est.id ? "text-zinc-300" : "text-muted-foreground"}`}>
                      {est.arquiteto} · {est.inicio ? formatDateBR(est.inicio) : "—"} → {est.releaseAlvo ? formatDateBR(est.releaseAlvo) : "—"}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Sem filtro: mostrar estimativa atual */}
            {estimativasFiltradas.length === 0 && !carregandoFiltro && (
              <p className="text-xs text-muted-foreground">
                Selecione o tipo de filtro ({tipoFiltro === "arquiteto" ? "Arquiteto" : "Demanda"}) e clique em "Buscar" para selecionar uma estimativa, ou veja abaixo os dados da estimativa atual:{" "}
                <span className="font-medium text-foreground">{form.titulo || "sem título"}</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cálculo financeiro da estimativa selecionada */}
      {estimativaFinanceiro ? (
        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-sm">{estimativaFinanceiro.titulo}</h3>
              <p className="text-xs text-muted-foreground">
                Arquiteto: <span className="font-medium text-foreground">{estimativaFinanceiro.arquiteto}</span>
              </p>
              {estimativaFinanceiro.esteiraPreProd && (
                <p className="text-xs text-muted-foreground mt-1">
                  Esteira Preprod: <span className="font-medium text-foreground">{estimativaFinanceiro.esteiraPreProd}</span>
                </p>
              )}
            </div>
            <CalculoFinanceiro
              atividades={estimativaFinanceiro.atividades || []}
              dataInicio={formatDateBR(estimativaFinanceiro.inicio)}
              dataFim={formatDateBR(estimativaFinanceiro.releaseAlvo)}
              feriados={estimativaFinanceiro.feriados || ""}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground mb-4">
              Baseado nas atividades da estimativa atual:{" "}
              <span className="font-medium text-foreground">{form.titulo || "sem título"}</span>
            </p>
            <CalculoFinanceiro
              atividades={atividades}
              dataInicio={form.inicio}
              dataFim={form.releaseAlvo}
              feriados={form.feriados}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
