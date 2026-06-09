import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, ClipboardText, MagnifyingGlass, CurrencyDollar } from "@phosphor-icons/react";
import { CalculoFinanceiro } from "@/components/calculo-financeiro";
import type { AppForm } from "@/types";
import { cn } from "@/lib/utils";

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
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Cálculo Financeiro</h1>
        <p className="text-sm text-muted-foreground">Análise de custos por estimativa</p>
      </div>

      {/* Filtro */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CurrencyDollar className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Buscar Estimativa</h2>
              <p className="text-xs text-muted-foreground">Filtre por arquiteto ou demanda</p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Tipo de Filtro
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setTipoFiltro("arquiteto")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-all",
                  tipoFiltro === "arquiteto"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <User className="h-3.5 w-3.5" />
                Arquiteto
              </button>
              <button
                onClick={() => setTipoFiltro("demanda")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-all",
                  tipoFiltro === "demanda"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <ClipboardText className="h-3.5 w-3.5" />
                Demanda
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {tipoFiltro === "arquiteto" ? "Nome do Arquiteto" : "Título ou Código da Demanda"}
            </label>
            <Input
              placeholder={tipoFiltro === "arquiteto" ? "Digite o nome do arquiteto..." : "Digite o título ou código..."}
              value={valorFiltro}
              onChange={(e) => setValorFiltro(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') executarBusca(); }}
              className="h-9 text-sm"
            />
          </div>

          <Button
            onClick={executarBusca}
            disabled={carregandoFiltro || !valorFiltro.trim()}
            className="w-full gap-2"
            size="sm"
          >
            <MagnifyingGlass className="h-4 w-4" />
            {carregandoFiltro ? "Buscando..." : "Buscar"}
          </Button>

          {/* Lista de estimativas filtradas */}
          {estimativasFiltradas.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-lg border border-border/60 p-2">
              <p className="text-xs text-muted-foreground px-1">
                {estimativasFiltradas.length} estimativa{estimativasFiltradas.length !== 1 ? "s" : ""} encontrada{estimativasFiltradas.length !== 1 ? "s" : ""}
              </p>
              {estimativasFiltradas.map((est) => (
                <button
                  key={est.id}
                  onClick={() => setEstimativaFinanceiro(est)}
                  className={cn(
                    "w-full rounded-md border px-3 py-2 text-left text-sm transition-all",
                    estimativaFinanceiro?.id === est.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/40 bg-card hover:bg-accent hover:text-foreground"
                  )}
                >
                  <div className="font-medium">{est.titulo || "Sem título"}</div>
                  <div className={cn("text-xs", estimativaFinanceiro?.id === est.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {est.arquiteto} · {est.inicio ? formatDateBR(est.inicio) : "—"} → {est.releaseAlvo ? formatDateBR(est.releaseAlvo) : "—"}
                  </div>
                </button>
              ))}
            </div>
          )}

          {estimativasFiltradas.length === 0 && !carregandoFiltro && (
            <p className="text-xs text-muted-foreground">
              Selecione o tipo de filtro e clique em "Buscar", ou veja abaixo os dados da estimativa atual:{" "}
              <span className="font-medium text-foreground">{form.titulo || "sem título"}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Cálculo financeiro */}
      {estimativaFinanceiro ? (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold">{estimativaFinanceiro.titulo}</h3>
              <p className="text-xs text-muted-foreground">
                Arquiteto: <span className="font-medium text-foreground">{estimativaFinanceiro.arquiteto}</span>
              </p>
              {estimativaFinanceiro.esteiraPreProd && (
                <p className="text-xs text-muted-foreground mt-0.5">
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
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <p className="text-xs text-muted-foreground">
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
