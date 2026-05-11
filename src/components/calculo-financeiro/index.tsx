import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { DollarSign } from "lucide-react"

interface Atividade {
  id: string
  nome: string
  dias: number | string
  tipo: string
  etapa?: string
}

interface CalculoFinanceiroProps {
  atividades: Atividade[]
}

const TIPOS = [
  { key: "desenvolvimento", label: "Desenvolvimento", color: "text-blue-600 bg-blue-50 border-blue-200" },
  { key: "testes", label: "QA / Testes internos", color: "text-green-600 bg-green-50 border-green-200" },
  { key: "subida", label: "Subida Pre Prod", color: "text-orange-600 bg-orange-50 border-orange-200" },
]

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function parseInputValue(raw: string): number {
  // Remove R$, spaces, dots (thousand sep) and replace comma with dot
  const cleaned = raw.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".")
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

export function CalculoFinanceiro({ atividades }: CalculoFinanceiroProps) {
  const [valoresDia, setValoresDia] = useState<Record<string, string>>({
    desenvolvimento: "",
    testes: "",
    subida: "",
  })

  const diasPorTipo = useMemo(() => {
    const map: Record<string, number> = { desenvolvimento: 0, testes: 0, subida: 0 }
    atividades.forEach((a) => {
      const tipo = a.tipo || "desenvolvimento"
      const dias = Number(a.dias || 0)
      if (tipo in map) map[tipo] += dias
    })
    return map
  }, [atividades])

  const totalAtividades = useMemo(
    () => atividades.reduce((acc, a) => acc + Number(a.dias || 0), 0),
    [atividades]
  )

  const custoPorTipo = useMemo(() => {
    const map: Record<string, number> = {}
    TIPOS.forEach(({ key }) => {
      const dias = diasPorTipo[key] || 0
      const valorDia = parseInputValue(valoresDia[key] || "")
      map[key] = dias * valorDia
    })
    return map
  }, [diasPorTipo, valoresDia])

  const custoTotal = useMemo(
    () => Object.values(custoPorTipo).reduce((acc, v) => acc + v, 0),
    [custoPorTipo]
  )

  const handleValorChange = (tipo: string, raw: string) => {
    setValoresDia((prev) => ({ ...prev, [tipo]: raw }))
  }

  const temAtividades = atividades.length > 0

  return (
    <div className="space-y-4">
      {!temAtividades && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Adicione atividades na seção de atividades para calcular os custos.
        </p>
      )}

      {temAtividades && (
        <>
          {/* Resumo de dias */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Dias por tipo de atividade
            </p>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS.map(({ key, label, color }) => (
                <div key={key} className={`rounded-lg border p-2 text-center ${color}`}>
                  <p className="text-lg font-bold">{diasPorTipo[key] ?? 0}</p>
                  <p className="text-xs leading-tight mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground text-right">
              Total de dias somados: <span className="font-semibold text-foreground">{totalAtividades}</span>
            </div>
          </div>

          <Separator />

          {/* Valor por dia */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Valor por dia (R$)
            </p>
            {TIPOS.map(({ key, label }) => {
              const dias = diasPorTipo[key] || 0
              const custo = custoPorTipo[key] || 0
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">{label}</label>
                    <span className="text-xs text-muted-foreground">{dias} dia{dias !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        placeholder="0,00"
                        value={valoresDia[key]}
                        onChange={(e) => handleValorChange(key, e.target.value)}
                        className="pl-7 text-sm"
                        disabled={dias === 0}
                      />
                    </div>
                    <div className="w-36 text-right">
                      {custo > 0 ? (
                        <span className="text-sm font-semibold text-emerald-600">{formatBRL(custo)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <Separator />

          {/* Total */}
          <Card className="p-3 bg-zinc-900 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">Custo total estimado</p>
                <p className="text-xl font-bold">{formatBRL(custoTotal)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-400">Total de dias</p>
                <p className="text-lg font-semibold">{totalAtividades}</p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
