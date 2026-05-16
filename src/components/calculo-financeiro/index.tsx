import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { DollarSign, Calendar, AlertCircle } from "lucide-react"
import { parseDateBR, isValidDate, isWeekend, addDays, isSameDay } from "@/utils"

interface Atividade {
  id: string
  nome: string
  dias: number | string
  tipo: string
  etapa?: string
}

interface CalculoFinanceiroProps {
  atividades: Atividade[]
  dataInicio?: string
  dataFim?: string
  feriados?: string
}

const TIPOS = [
  { key: "desenvolvimento", label: "Desenvolvimento", color: "text-blue-600 bg-blue-50 border-blue-200" },
  { key: "testes", label: "QA / Testes internos", color: "text-green-600 bg-green-50 border-green-200" },
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

function parseFeriados(value: string | undefined): Date[] {
  if (!value) return []
  return value
    .split("\n")
    .map((line) => line.trim().slice(0, 10))
    .filter(Boolean)
    .map((dateStr) => parseDateBR(dateStr))
    .filter(isValidDate)
}

function calcularDiasUteis(inicio: string, fim: string, feriados: Date[]): { total: number; uteis: number; feriados: Date[] } {
  const startDate = parseDateBR(inicio)
  const endDate = parseDateBR(fim)

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return { total: 0, uteis: 0, feriados: [] }
  }

  let total = 0
  let uteis = 0
  const feriadosEncontrados: Date[] = []
  let current = startDate

  while (current <= endDate) {
    total++

    const isFeriado = feriados.some((f) => isSameDay(current, f))
    const isWeekendDay = isWeekend(current)

    if (isFeriado) {
      feriadosEncontrados.push(new Date(current))
    } else if (!isWeekendDay) {
      uteis++
    }

    current = addDays(current, 1)
  }

  return { total, uteis, feriados: feriadosEncontrados }
}

export function CalculoFinanceiro({ atividades, dataInicio = "", dataFim = "", feriados = "" }: CalculoFinanceiroProps) {
  const [valoresDia, setValoresDia] = useState<Record<string, string>>({
    desenvolvimento: "",
    testes: "",
  })

  const diasPorTipo = useMemo(() => {
    const map: Record<string, Record<string, number>> = {
      desenvolvimento: {},
      testes: {},
    }

    // Agrupar por tipo e etapa
    atividades.forEach((a) => {
      const tipo = a.tipo === "subida" ? "desenvolvimento" : (a.tipo || "desenvolvimento")
      const etapa = String(a.etapa || "1")
      const dias = Number(a.dias || 0)

      if (tipo in map) {
        // Manter apenas o máximo de dias para esta etapa
        if (!(etapa in map[tipo]) || map[tipo][etapa] < dias) {
          map[tipo][etapa] = dias
        }
      }
    })

    // Somar o máximo de cada etapa para cada tipo
    const totais: Record<string, number> = { desenvolvimento: 0, testes: 0 }
    Object.entries(map).forEach(([tipo, etapas]) => {
      totais[tipo] = Object.values(etapas).reduce((acc, dias) => acc + dias, 0)
    })

    return totais
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

  const feriadosParsed = useMemo(() => parseFeriados(feriados), [feriados])

  const diasUteis = useMemo(() => {
    return calcularDiasUteis(dataInicio, dataFim, feriadosParsed)
  }, [dataInicio, dataFim, feriadosParsed])

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
          {/* Informações de Data e Dias Úteis */}
          {(dataInicio || dataFim) && (
            <Card className="p-3 bg-slate-50 border-slate-200">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-slate-600" />
                  <p className="text-xs font-semibold text-slate-700">Período do Projeto</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Início</p>
                    <p className="font-semibold">{dataInicio || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Término</p>
                    <p className="font-semibold">{dataFim || "—"}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white rounded p-2 border border-slate-200">
                      <p className="text-muted-foreground">Dias totais</p>
                      <p className="text-lg font-bold text-slate-700">{diasUteis.total}</p>
                    </div>
                    <div className="bg-white rounded p-2 border border-slate-200">
                      <p className="text-muted-foreground">Dias úteis</p>
                      <p className="text-lg font-bold text-emerald-600">{diasUteis.uteis}</p>
                    </div>
                  </div>
                </div>
                
                {/* Feriados encontrados */}
                {diasUteis.feriados.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                      <p className="text-xs font-semibold text-amber-700">{diasUteis.feriados.length} Feriado{diasUteis.feriados.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="space-y-1">
                      {diasUteis.feriados.map((f, i) => (
                        <div key={i} className="text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1 text-amber-800">
                          📅 {f.toLocaleDateString("pt-BR")}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

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
