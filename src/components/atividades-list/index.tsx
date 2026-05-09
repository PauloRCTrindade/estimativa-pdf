import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react"

interface AtividadeItemProps {
  atividade: any
  index: number
  totalItems: number
  onUpdate: (id: string, field: string, value: unknown) => void
  onMove: (id: string, direction: number) => void
  onRemove: (id: string) => void
}

export function AtividadeItem({
  atividade,
  index,
  totalItems,
  onUpdate,
  onMove,
  onRemove,
}: AtividadeItemProps) {
  return (
    <Card className="p-3 border-zinc-200">
      <div className="space-y-2">
        <Input
          value={atividade.nome}
          onChange={(e) => onUpdate(atividade.id, "nome", e.target.value)}
          placeholder="Nome da atividade"
          className="text-sm"
        />
        
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Input
              type="number"
              min="1"
              value={atividade.dias}
              onChange={(e) => onUpdate(atividade.id, "dias", e.target.value)}
              placeholder="Dias"
              className="text-sm"
            />
            <label className="text-xs text-zinc-500 mt-0.5 block">Dias úteis</label>
          </div>
          
          <div>
            <Input
              value={atividade.etapa ?? ""}
              onChange={(e) => onUpdate(atividade.id, "etapa", e.target.value)}
              placeholder="Etapa"
              className="text-sm"
            />
            <label className="text-xs text-zinc-500 mt-0.5 block">Etapa</label>
          </div>
          
          <div>
            <Select value={atividade.tipo} onValueChange={(value) => onUpdate(atividade.id, "tipo", value)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desenvolvimento">Desenvolvimento</SelectItem>
                <SelectItem value="subida">Subida Pre Prod</SelectItem>
                <SelectItem value="testes">Testes internos</SelectItem>
              </SelectContent>
            </Select>
            <label className="text-xs text-zinc-500 mt-0.5 block">Tipo</label>
          </div>
        </div>

        <div className="flex gap-1 pt-1">
          <Button
            variant="outline"
            size="sm"
            disabled={index === 0}
            onClick={() => onMove(atividade.id, -1)}
            className="flex-1 h-8"
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={index === totalItems - 1}
            onClick={() => onMove(atividade.id, 1)}
            className="flex-1 h-8"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemove(atividade.id)}
            className="flex-1 h-8 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

interface AtividadesListProps {
  atividades: any[]
  onUpdate: (id: string, field: string, value: unknown) => void
  onMove: (id: string, direction: number) => void
  onRemove: (id: string) => void
  onAdd: () => void
}

export function AtividadesList({
  atividades,
  onUpdate,
  onMove,
  onRemove,
  onAdd,
}: AtividadesListProps) {
  return (
    <div className="space-y-3">
      <ScrollArea className="h-96 border rounded-lg p-4 bg-white">
        <div className="space-y-2 pr-4">
          {atividades.map((atividade, index) => (
            <AtividadeItem
              key={atividade.id}
              atividade={atividade}
              index={index}
              totalItems={atividades.length}
              onUpdate={onUpdate}
              onMove={onMove}
              onRemove={onRemove}
            />
          ))}
        </div>
      </ScrollArea>
      <Button variant="outline" className="w-full" onClick={onAdd}>
        <Plus className="h-4 w-4 mr-2" />
        Adicionar atividade
      </Button>
    </div>
  )
}
