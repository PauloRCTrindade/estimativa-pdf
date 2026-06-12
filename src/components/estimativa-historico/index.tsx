import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Download, Trash, ClipboardText, Spinner, Plus, CheckCircle } from "@phosphor-icons/react"

function formatarDataBR(valor: string | undefined | null): string | null {
  if (!valor) return null;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [ano, mes, dia] = valor.split("-");
    return `${dia}/${mes}/${ano}`;
  }
  // dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
    return valor;
  }
  return null;
}

function resumoEstimativa(item: any) {
  const pacotes = Array.isArray(item.pacotes) ? item.pacotes : [];
  const atividadesLegado = Array.isArray(item.atividades) ? item.atividades : [];

  const qtdPacotes = pacotes.length;
  const qtdAtividades = pacotes.length > 0
    ? pacotes.reduce((acc: number, p: any) => acc + (Array.isArray(p.atividades) ? p.atividades.length : 0), 0)
    : atividadesLegado.length;

  const totalHoras = pacotes.length > 0
    ? pacotes.reduce((acc: number, p: any) => {
        const ativs = Array.isArray(p.atividades) ? p.atividades : [];
        return acc + ativs.reduce((s: number, a: any) => s + Number(a.horas || 0), 0);
      }, 0)
    : atividadesLegado.reduce((s: number, a: any) => s + Number(a.horas || 0), 0);

  const inicio = formatarDataBR(item.inicio || item.inicioestimativa);
  const fim = formatarDataBR(item.releaseAlvo || item.releasealvo || item.termino);

  return { qtdPacotes, qtdAtividades, totalHoras, inicio, fim };
}

interface EstimativaItemProps {
  item: any
  onLoad: () => void
  onDelete: () => void
  onFavorite: () => void
  isFavorited?: boolean
  isAdding?: boolean
}

export function EstimativaHistoricoItem({ item, onLoad, onDelete, onFavorite, isFavorited, isAdding }: EstimativaItemProps) {
  const titulo = item.titulo || "Estimativa sem título";
  const { qtdPacotes, qtdAtividades, totalHoras, inicio, fim } = resumoEstimativa(item);

  const temPeriodo = Boolean(inicio && fim);

  return (
    <Card className="p-3 border-border/60 hover:border-border/90 hover:shadow-sm transition-all bg-card">
      <div className="space-y-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate" title={titulo}>
            {titulo}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {qtdPacotes} {qtdPacotes === 1 ? "pacote" : "pacotes"} · {qtdAtividades} {qtdAtividades === 1 ? "atividade" : "atividades"} · {totalHoras}h
          </p>
          {temPeriodo && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {inicio} → {fim}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={onLoad}
              className="h-7 text-xs px-2.5"
            >
              <Download className="h-3 w-3 mr-1" />
              Carregar
            </Button>
            {isFavorited ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-3 w-3" />
                No Kanban
              </span>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={onFavorite}
                disabled={isAdding}
                className="h-7 text-xs px-2.5"
              >
                {isAdding ? (
                  <Spinner className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3 mr-1" />
                )}
                {isAdding ? "Adicionando..." : "Incluir no Kanban"}
              </Button>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="h-7 text-xs px-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <Trash className="h-3 w-3 mr-1" />
            Remover
          </Button>
        </div>
      </div>
    </Card>
  )
}

interface EstimativaHistoricoProps {
  historico: any[]
  onLoad: (item: any) => void
  onDelete: (id: string) => void
  onFavorite: (item: any) => void
  favoriteIds?: string[]
  isAddingFavorite?: (id: string) => boolean
}

export function EstimativaHistorico({ historico, onLoad, onDelete, onFavorite, favoriteIds, isAddingFavorite }: EstimativaHistoricoProps) {
  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardText className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Histórico</h3>
        </div>

        {historico.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Nenhuma estimativa salva.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {historico.map((item) => (
              <EstimativaHistoricoItem
                key={item.id}
                item={item}
                onLoad={() => onLoad(item)}
                onDelete={() => onDelete(item.id)}
                onFavorite={() => onFavorite(item)}
                isFavorited={favoriteIds?.includes(item.id)}
                isAdding={isAddingFavorite?.(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
