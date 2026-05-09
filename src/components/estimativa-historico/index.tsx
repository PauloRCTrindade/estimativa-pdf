import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Download, Trash2 } from "lucide-react"

interface EstimativaItemProps {
  item: any
  onLoad: () => void
  onDelete: () => void
}

export function EstimativaHistoricoItem({ item, onLoad, onDelete }: EstimativaItemProps) {
  const titulo = item.titulo || "Estimativa sem título";
  const criado = item.created_at 
    ? new Date(item.created_at).toLocaleString("pt-BR")
    : "Data indisponível";
  
  return (
    <Card className="p-3 border-zinc-200 hover:border-zinc-300 transition-colors">
      <div className="space-y-2">
        <div>
          <p className="font-medium text-sm truncate">{titulo}</p>
          <p className="text-xs text-zinc-500">{criado}</p>
        </div>
        <div className="flex gap-2">
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
            <Trash2 className="h-3 w-3 mr-1" />
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
  onSave: () => void
}

export function EstimativaHistorico({ historico, onLoad, onDelete, onSave }: EstimativaHistoricoProps) {
  return (
    <Card className="border-zinc-200">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">📋 Histórico</h3>
          <Button size="sm" onClick={onSave} className="h-7 text-xs">
            Salvar estimativa
          </Button>
        </div>

        {historico.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4 text-center">
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
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
