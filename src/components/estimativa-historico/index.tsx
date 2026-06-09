import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Download, Trash, ClipboardText, Star, Spinner } from "@phosphor-icons/react"

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
  const criado = item.created_at 
    ? new Date(item.created_at).toLocaleString("pt-BR")
    : "Data indisponível";
  
  return (
    <Card className="p-3 border-border/60 hover:border-border transition-colors bg-card shadow-sm">
      <div className="space-y-2">
        <div>
          <p className="font-medium text-sm truncate">{titulo}</p>
          <p className="text-xs text-muted-foreground">{criado}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={onLoad}
            className="flex-1 h-7 text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            Carregar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="flex-1 h-7 text-xs text-red-600 hover:text-red-700"
          >
            <Trash className="h-3 w-3 mr-1" />
            Remover
          </Button>
          <Button
            size="sm"
            variant={isFavorited ? "outline" : "default"}
            onClick={onFavorite}
            disabled={isFavorited || isAdding}
            className="flex-1 h-7 text-xs"
          >
            {isAdding ? (
              <Spinner className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Star className="h-3 w-3 mr-1" />
            )}
            {isFavorited ? "No Kanban" : isAdding ? "Adicionando..." : "Incluir no Kanban"}
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
  onSave: () => void
  onFavorite: (item: any) => void
  favoriteIds?: string[]
  isAddingFavorite?: (id: string) => boolean
}

export function EstimativaHistorico({ historico, onLoad, onDelete, onSave, onFavorite, favoriteIds, isAddingFavorite }: EstimativaHistoricoProps) {
  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardText className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Histórico</h3>
          </div>
          <Button size="sm" onClick={onSave} className="h-7 text-xs">
            Salvar estimativa
          </Button>
        </div>

        {historico.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Nenhuma estimativa salva.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
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
