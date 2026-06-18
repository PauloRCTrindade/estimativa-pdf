import { useState, memo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Plus, Minus } from "@phosphor-icons/react";
import { DatePicker } from "@/components/date-picker";
import { parseDateBR, isValidDate, formatBR, addDays, isWeekend, isHoliday, isPostRelease, isParadoDay } from "@/utils";
import {
  DEFAULT_OVERTIME,
  calcDiasOvertimeTotal,
  calcFeriadosNoPeriodo,
  calcFimDeSemanaNoPeriodo,
  calcTombamentosNoPeriodo,
  calcularTermino,
  getInicioDayType,
  normalizeAtividadesPorEtapa,
  normalizeEtapa,
  type Pacote,
  type PacoteAtividade,
  type ParadoRange,
} from "@/utils/schedule";

interface RealScheduleTableProps {
  pacotes: Pacote[];
  feriados: string[];
  releases: string[];
  diasParados?: ParadoRange[];
  readOnly?: boolean;
  onChange: (pacotes: Pacote[]) => void;
}

const ETAPA_COLORS = [
  { border: "border-l-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/30" },
  { border: "border-l-teal-400", bg: "bg-teal-50 dark:bg-teal-900/30" },
  { border: "border-l-rose-400", bg: "bg-rose-50 dark:bg-rose-900/30" },
  { border: "border-l-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30" },
  { border: "border-l-violet-400", bg: "bg-violet-50 dark:bg-violet-900/30" },
  { border: "border-l-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-900/30" },
  { border: "border-l-green-400", bg: "bg-green-50 dark:bg-green-900/30" },
  { border: "border-l-orange-500", bg: "bg-orange-50 dark:bg-orange-900/30" },
];

function RealScheduleTableInner({
  pacotes,
  feriados,
  releases,
  diasParados = [],
  readOnly = false,
  onChange,
}: RealScheduleTableProps) {
  const [focusedCell, setFocusedCell] = useState<string | null>(null);

  function updateAtividadeSync(
    pacoteIdx: number,
    atividadeIdx: number,
    updates: Partial<PacoteAtividade>
  ): Pacote[] {
    return pacotes.map((p, pi) => {
      if (pi !== pacoteIdx) return p;
      const atividades = [...p.atividades];
      const target = atividades[atividadeIdx];
      if (!target) return p;
      const targetEtapa = normalizeEtapa(target.etapa);
      return {
        ...p,
        atividades: normalizeAtividadesPorEtapa(
          atividades.map((a, ai) =>
            ai === atividadeIdx || normalizeEtapa(a.etapa) === targetEtapa
              ? { ...a, ...updates }
              : a
          ),
          target.id
        ),
      };
    });
  }

  function handleInicioChange(
    pacoteIdx: number,
    atividadeIdx: number,
    newDate: string
  ) {
    onChange(updateAtividadeSync(pacoteIdx, atividadeIdx, { inicio: newDate }));
  }

  function handleHorasChange(
    pacoteIdx: number,
    atividadeIdx: number,
    value: number
  ) {
    onChange(updateAtividadeSync(pacoteIdx, atividadeIdx, { horas: value }));
  }

  function handleHorasOvertimeChange(
    pacoteIdx: number,
    atividadeIdx: number,
    value: number
  ) {
    onChange(
      updateAtividadeSync(pacoteIdx, atividadeIdx, { horasOvertime: value })
    );
  }

  function handleOvertimeChange(
    pacoteIdx: number,
    atividadeIdx: number,
    nextOvertime: PacoteAtividade["overtime"]
  ) {
    onChange(
      updateAtividadeSync(pacoteIdx, atividadeIdx, { overtime: nextOvertime })
    );
  }

  function totalHorasPacote(pacote: Pacote): number {
    const horasPorEtapa = new Map<string, number>();
    for (const a of pacote.atividades) {
      const etapa = normalizeEtapa(a.etapa);
      if (!horasPorEtapa.has(etapa)) {
        horasPorEtapa.set(etapa, Number(a.horas || 0));
      }
    }
    let total = 0;
    for (const h of horasPorEtapa.values()) total += h;
    return total;
  }

  function buildAtivGroupInfo(pacote: Pacote) {
    const etapaColorIdx = new Map<string, number>();
    let colorCounter = 0;
    const result: Array<{
      colorBorder: string;
      colorBg: string;
      isFirstInGroup: boolean;
      groupSize: number;
      etapaTotalDiasNecessarios: number;
      etapaTotalDiasAtuacao: number;
    }> = [];
    let gi = 0;
    while (gi < pacote.atividades.length) {
      const etapa = String(pacote.atividades[gi].etapa || "1");
      let gj = gi;
      while (
        gj < pacote.atividades.length &&
        String(pacote.atividades[gj].etapa || "1") === etapa
      )
        gj++;
      const groupAtivs = pacote.atividades.slice(gi, gj);
      const size = gj - gi;
      if (!etapaColorIdx.has(etapa)) {
        etapaColorIdx.set(etapa, colorCounter % ETAPA_COLORS.length);
        colorCounter++;
      }
      const colorEntry = ETAPA_COLORS[etapaColorIdx.get(etapa)!];
      // Campos de planejamento são compartilhados por etapa; basta calcular uma
      // única vez usando a primeira atividade do grupo.
      const first = groupAtivs[0];
      const ot = first.overtime
        ? { ...DEFAULT_OVERTIME, ...first.overtime }
        : DEFAULT_OVERTIME;
      const horasOT = first.horasOvertime ?? 0;
      const termino = calcularTermino(
        first.inicio,
        first.horas,
        feriados,
        releases,
        ot,
        horasOT,
        diasParados
      );
      const startDate = parseDateBR(first.inicio);
      const endDate = parseDateBR(termino);
      let etapaTotalDiasNecessarios = 0;
      if (isValidDate(startDate) && isValidDate(endDate)) {
        const cur = new Date(startDate);
        while (cur <= endDate) {
          if (
            !isWeekend(cur) &&
            !isHoliday(cur, feriados) &&
            !isPostRelease(cur, releases) &&
            !isParadoDay(cur, diasParados, feriados, releases)
          )
            etapaTotalDiasNecessarios++;
          cur.setDate(cur.getDate() + 1);
        }
      } else {
        etapaTotalDiasNecessarios = Number(first.horas || 0) / 8;
      }
      const etapaTotalDiasOvertime = calcDiasOvertimeTotal(
        first.inicio,
        first.horas,
        horasOT,
        feriados,
        releases,
        ot
      );
      const etapaTotalTombamento = 0; // simplificado: dias de atuação já inclui
      const etapaTotalDiasAtuacao =
        etapaTotalDiasNecessarios + etapaTotalDiasOvertime + etapaTotalTombamento;
      for (let k = 0; k < size; k++) {
        result.push({
          colorBorder: colorEntry.border,
          colorBg: colorEntry.bg,
          isFirstInGroup: k === 0,
          groupSize: size,
          etapaTotalDiasNecessarios,
          etapaTotalDiasAtuacao,
        });
      }
      gi = gj;
    }
    return result;
  }

  let activityRowIndex = 0;

  if (!pacotes || pacotes.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">
        Nenhuma atividade disponível para remanejamento.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 shadow-sm bg-card">
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted/80 text-foreground font-semibold">
            <th className="w-32 px-2 py-2 text-center border-r border-border/40">Tipo</th>
            <th className="w-14 px-2 py-2 text-center border-r border-border/40">Etapa</th>
            <th className="px-3 py-2 text-left border-r border-border/40 min-w-64">Atividade / Pacote</th>
            <th className="w-28 px-2 py-2 text-center border-r border-border/40">Início real</th>
            <th className="w-24 px-2 py-2 text-center border-r border-border/40">Horas</th>
            <th className="w-36 px-2 py-2 text-center border-r border-border/40">Feriado</th>
            <th className="w-36 px-2 py-2 text-center border-r border-border/40">Finais de Semana</th>
            <th className="w-36 px-2 py-2 text-center border-r border-border/40">Tombamento</th>
            <th className="w-20 px-2 py-2 text-center border-r border-border/40">Dias Necessários</th>
            <th className="w-20 px-2 py-2 text-center border-r border-border/40">Dias de Overtime</th>
            <th className="w-24 px-2 py-2 text-center border-r border-border/40">Horas de Overtime</th>
            <th className="w-20 px-2 py-2 text-center border-r border-border/40">Dias de Atuação</th>
            <th className="w-24 px-2 py-2 text-center">Término real</th>
          </tr>
        </thead>
        <tbody>
          {pacotes.map((pacote, pacoteIdx) => {
            const totalHoras = totalHorasPacote(pacote);
            const ativGroupInfoList = buildAtivGroupInfo(pacote);

            return [
              <tr
                key={`pacote-${pacote.id}`}
                className="bg-muted/70 text-foreground font-semibold border-b border-border/40"
              >
                <td className="px-2 py-1.5 border-r border-border/40" />
                <td className="px-2 py-1.5 border-r border-border/40" />
                <td className="px-2 py-1.5 border-r border-border/40">
                  <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 flex-shrink-0 opacity-70 text-primary" />
                    <span className="font-semibold">
                      {pacote.codigo ? `${pacote.codigo} — ` : ""}
                      {pacote.nome}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-1.5 border-r border-border/40" />
                <td className="px-2 py-1.5 text-center border-r border-border/40 tabular-nums text-primary font-bold">
                  {totalHoras > 0 ? `${totalHoras}h` : "—"}
                </td>
                <td className="px-2 py-1.5 border-r border-border/40" />
                <td className="px-2 py-1.5 border-r border-border/40" />
                <td className="px-2 py-1.5 border-r border-border/40" />
                <td className="px-2 py-1.5 text-center border-r border-border/40 tabular-nums font-bold text-muted-foreground">
                  {(() => {
                    const total = ativGroupInfoList
                      .filter((g) => g.isFirstInGroup)
                      .reduce((sum, g) => sum + g.etapaTotalDiasNecessarios, 0);
                    return total > 0 ? total : "—";
                  })()}
                </td>
                <td className="px-2 py-1.5 border-r border-border/40" />
                <td className="px-2 py-1.5 border-r border-border/40" />
                <td className="px-2 py-1.5 text-center border-r border-border/40 tabular-nums font-bold text-muted-foreground">
                  {(() => {
                    const total = ativGroupInfoList
                      .filter((g) => g.isFirstInGroup)
                      .reduce((sum, g) => sum + g.etapaTotalDiasAtuacao, 0);
                    return total > 0 ? total : "—";
                  })()}
                </td>
                <td className="px-2 py-1.5" />
              </tr>,

              ...pacote.atividades.map((ativ, idx) => {
                activityRowIndex++;
                const ot = ativ.overtime
                  ? { ...DEFAULT_OVERTIME, ...ativ.overtime }
                  : DEFAULT_OVERTIME;
                const horasOT = ativ.horasOvertime ?? 0;
                const diasOvertimeCalc = calcDiasOvertimeTotal(
                  ativ.inicio,
                  ativ.horas,
                  horasOT,
                  feriados,
                  releases,
                  ot
                );
                const terminoCalc = calcularTermino(
                  ativ.inicio,
                  ativ.horas,
                  feriados,
                  releases,
                  ot,
                  horasOT,
                  diasParados
                );
                const groupInfo = ativGroupInfoList[idx];
                const dayType = getInicioDayType(ativ.inicio, feriados, releases);
                const colorClass =
                  dayType === "feriado"
                    ? "border-red-400 bg-red-50 text-red-700 hover:bg-red-100"
                    : dayType === "tombamento"
                    ? "border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100"
                    : dayType === "releaseSunday"
                    ? "border-blue-500 bg-blue-300 text-blue-900 hover:bg-blue-400"
                    : dayType === "weekend"
                    ? "border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "";

                return (
                  <tr
                    key={`ativ-${ativ.id}`}
                    className={`${groupInfo.colorBg} hover:bg-muted/40 transition-colors text-foreground`}
                  >
                    <td className="px-1 py-1 border-r border-border/40">
                      <Select
                        value={ativ.tipo}
                        disabled
                      >
                        <SelectTrigger className="h-6 text-xs border-transparent bg-transparent px-1.5 disabled:opacity-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desenvolvimento">Desenvolvimento</SelectItem>
                          <SelectItem value="subida">Subida Pre Prod</SelectItem>
                          <SelectItem value="testes">Testes Internos</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>

                    <td className="px-1 py-1 text-center border-r border-border/40 tabular-nums text-muted-foreground">
                      {ativ.etapa ?? "1"}
                    </td>

                    <td className="px-2 py-1 border-r border-border/40">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground tabular-nums text-xs font-medium flex-shrink-0">
                          {activityRowIndex}.
                        </span>
                        {ativ.demanda && (
                          <span className="text-muted-foreground truncate">{ativ.demanda}</span>
                        )}
                        <span className="truncate">{ativ.nome}</span>
                      </div>
                    </td>

                    {groupInfo.isFirstInGroup && (
                      <td
                        rowSpan={groupInfo.groupSize}
                        className="px-1 py-1 border-r border-border/40 align-middle"
                      >
                        <DatePicker
                          value={ativ.inicio}
                          onChange={(date) =>
                            handleInicioChange(pacoteIdx, idx, date)
                          }
                          placeholder="dd/mm/aaaa"
                          className={`h-6 text-xs ${colorClass}`}
                          feriados={feriados}
                          releases={releases}
                          disabled={readOnly}
                        />
                      </td>
                    )}

                    {groupInfo.isFirstInGroup && (
                      <td
                        rowSpan={groupInfo.groupSize}
                        className="px-1 py-1 text-center border-r border-border/40 align-middle"
                      >
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground transition-colors disabled:opacity-50"
                            onClick={() =>
                              handleHorasChange(
                                pacoteIdx,
                                idx,
                                Math.max(0, Number(ativ.horas || 0) - 1)
                              )
                            }
                            disabled={readOnly}
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className={`w-12 px-1 py-0.5 rounded text-xs outline-none border text-center tabular-nums font-medium ${
                              focusedCell === `horas-${ativ.id}`
                                ? "border-primary bg-background ring-1 ring-primary"
                                : Number(ativ.horas) > 0
                                ? "border-transparent bg-primary/10 text-primary hover:border-primary/30"
                                : "border-transparent bg-transparent hover:border-border/40"
                            }`}
                            value={ativ.horas || ""}
                            placeholder="0"
                            onChange={(e) =>
                              handleHorasChange(
                                pacoteIdx,
                                idx,
                                Math.max(0, Math.round(Number(e.target.value)))
                              )
                            }
                            onFocus={() => setFocusedCell(`horas-${ativ.id}`)}
                            onBlur={() => setFocusedCell(null)}
                            disabled={readOnly}
                          />
                          <button
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground transition-colors disabled:opacity-50"
                            onClick={() =>
                              handleHorasChange(
                                pacoteIdx,
                                idx,
                                Number(ativ.horas || 0) + 1
                              )
                            }
                            disabled={readOnly}
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </td>
                    )}

                    {groupInfo.isFirstInGroup && (
                      <td
                        rowSpan={groupInfo.groupSize}
                        className="px-2 py-1 text-center border-r border-border/40 align-middle"
                      >
                        {(() => {
                          const fs = calcFeriadosNoPeriodo(
                            ativ.inicio,
                            ativ.horas,
                            feriados,
                            releases,
                            ot,
                            horasOT
                          );
                          if (fs.length === 0)
                            return <span className="text-muted-foreground/50">—</span>;
                          return (
                            <div className="flex flex-wrap gap-0.5 justify-center">
                              {fs.map((f) => {
                                const selected = ot.feriadoDates.includes(f);
                                return (
                                  <button
                                    key={f}
                                    title={
                                      readOnly
                                        ? ""
                                        : selected
                                        ? "Clique para bloquear"
                                        : "Clique para trabalhar neste feriado"
                                    }
                                    onClick={() => {
                                      if (readOnly) return;
                                      const next = selected
                                        ? ot.feriadoDates.filter((d) => d !== f)
                                        : [...ot.feriadoDates, f];
                                      handleOvertimeChange(pacoteIdx, idx, {
                                        ...ot,
                                        feriadoDates: next,
                                      });
                                    }}
                                    className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium tabular-nums cursor-pointer transition-colors ${
                                      selected
                                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                        : "bg-red-100 text-red-700 hover:bg-red-200"
                                    } ${readOnly ? "cursor-not-allowed opacity-60" : ""}`}
                                  >
                                    {f}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </td>
                    )}

                    {groupInfo.isFirstInGroup && (
                      <td
                        rowSpan={groupInfo.groupSize}
                        className="px-2 py-1 text-center border-r border-border/40 align-middle"
                      >
                        {(() => {
                          const ws = calcFimDeSemanaNoPeriodo(
                            ativ.inicio,
                            ativ.horas,
                            feriados,
                            releases,
                            ot,
                            horasOT
                          );
                          if (ws.length === 0)
                            return <span className="text-muted-foreground/50">—</span>;
                          return (
                            <div className="flex flex-wrap gap-0.5 justify-center">
                              {ws.map((w) => {
                                const selected = ot.fimDeSemanaDates.includes(w);
                                const dateW = parseDateBR(w);
                                const isReleaseSunday =
                                  isValidDate(dateW) &&
                                  dateW.getDay() === 0 &&
                                  (releases.includes(w) ||
                                    releases.includes(formatBR(addDays(dateW, 1))));
                                return (
                                  <button
                                    key={w}
                                    title={
                                      readOnly
                                        ? ""
                                        : selected
                                        ? "Clique para bloquear"
                                        : "Clique para trabalhar neste dia"
                                    }
                                    onClick={() => {
                                      if (readOnly) return;
                                      const next = selected
                                        ? ot.fimDeSemanaDates.filter((d) => d !== w)
                                        : [...ot.fimDeSemanaDates, w];
                                      handleOvertimeChange(pacoteIdx, idx, {
                                        ...ot,
                                        fimDeSemanaDates: next,
                                      });
                                    }}
                                    className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium tabular-nums cursor-pointer transition-colors ${
                                      selected
                                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                        : isReleaseSunday
                                        ? "bg-blue-300 text-blue-900 hover:bg-blue-400"
                                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                    } ${readOnly ? "cursor-not-allowed opacity-60" : ""}`}
                                  >
                                    {w}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </td>
                    )}

                    {groupInfo.isFirstInGroup && (
                      <td
                        rowSpan={groupInfo.groupSize}
                        className="px-2 py-1 text-center border-r border-border/40 align-middle"
                      >
                        {(() => {
                          const ts = calcTombamentosNoPeriodo(
                            ativ.inicio,
                            ativ.horas,
                            feriados,
                            releases,
                            ot,
                            horasOT
                          );
                          if (ts.length === 0)
                            return <span className="text-muted-foreground/50">—</span>;
                          return (
                            <div className="flex flex-wrap gap-0.5 justify-center">
                              {ts.map((t) => {
                                const selected = ot.tombamentoDates.includes(t);
                                return (
                                  <button
                                    key={t}
                                    title={
                                      readOnly
                                        ? ""
                                        : selected
                                        ? "Clique para bloquear"
                                        : "Clique para trabalhar neste dia"
                                    }
                                    onClick={() => {
                                      if (readOnly) return;
                                      const next = selected
                                        ? ot.tombamentoDates.filter((d) => d !== t)
                                        : [...ot.tombamentoDates, t];
                                      handleOvertimeChange(pacoteIdx, idx, {
                                        ...ot,
                                        tombamentoDates: next,
                                      });
                                    }}
                                    className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium tabular-nums cursor-pointer transition-colors ${
                                      selected
                                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                        : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                                    } ${readOnly ? "cursor-not-allowed opacity-60" : ""}`}
                                  >
                                    {t}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </td>
                    )}

                    {groupInfo.isFirstInGroup && (
                      <td
                        rowSpan={groupInfo.groupSize}
                        className="px-2 py-1 text-center border-r border-border/40 align-middle"
                      >
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs tabular-nums font-semibold ${
                            groupInfo.etapaTotalDiasNecessarios > 0
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {groupInfo.etapaTotalDiasNecessarios > 0
                            ? groupInfo.etapaTotalDiasNecessarios
                            : "—"}
                        </span>
                      </td>
                    )}

                    {groupInfo.isFirstInGroup && (
                      <td
                        rowSpan={groupInfo.groupSize}
                        className="px-2 py-1 text-center border-r border-border/40 align-middle"
                      >
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs tabular-nums font-semibold ${
                            diasOvertimeCalc > 0
                              ? "bg-purple-100 text-purple-800"
                              : "text-muted-foreground"
                          }`}
                        >
                          {diasOvertimeCalc > 0 ? diasOvertimeCalc : "—"}
                        </span>
                      </td>
                    )}

                    {groupInfo.isFirstInGroup && (
                      <td
                        rowSpan={groupInfo.groupSize}
                        className="px-1 py-1 text-center border-r border-border/40 align-middle"
                      >
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground transition-colors disabled:opacity-50"
                            onClick={() =>
                              handleHorasOvertimeChange(
                                pacoteIdx,
                                idx,
                                Math.max(0, horasOT - 1)
                              )
                            }
                            disabled={readOnly}
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className={`w-12 px-1 py-0.5 rounded text-xs outline-none border text-center tabular-nums font-medium ${
                              focusedCell === `horasot-${ativ.id}`
                                ? "border-primary bg-background ring-1 ring-primary"
                                : horasOT > 0
                                ? "border-transparent bg-purple-50 text-purple-700 hover:border-purple-200"
                                : "border-transparent bg-transparent hover:border-border/40"
                            }`}
                            value={horasOT || ""}
                            placeholder="0"
                            onChange={(e) =>
                              handleHorasOvertimeChange(
                                pacoteIdx,
                                idx,
                                Math.max(0, Math.round(Number(e.target.value)))
                              )
                            }
                            onFocus={() => setFocusedCell(`horasot-${ativ.id}`)}
                            onBlur={() => setFocusedCell(null)}
                            disabled={readOnly}
                          />
                          <button
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground transition-colors disabled:opacity-50"
                            onClick={() =>
                              handleHorasOvertimeChange(
                                pacoteIdx,
                                idx,
                                horasOT + 1
                              )
                            }
                            disabled={readOnly}
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </td>
                    )}

                    {groupInfo.isFirstInGroup && (
                      <td
                        rowSpan={groupInfo.groupSize}
                        className="px-2 py-1 text-center border-r border-border/40 align-middle"
                      >
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs tabular-nums font-semibold ${
                            groupInfo.etapaTotalDiasAtuacao > 0
                              ? "bg-emerald-100 text-emerald-800"
                              : "text-muted-foreground"
                          }`}
                        >
                          {groupInfo.etapaTotalDiasAtuacao > 0
                            ? groupInfo.etapaTotalDiasAtuacao
                            : "—"}
                        </span>
                      </td>
                    )}

                    {groupInfo.isFirstInGroup && (
                      <td
                        rowSpan={groupInfo.groupSize}
                        className="px-2 py-1 text-center border-r border-border/40 align-middle tabular-nums"
                      >
                        <span
                          className={
                            terminoCalc !== "—"
                              ? "text-foreground font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {terminoCalc}
                        </span>
                      </td>
                    )}
                  </tr>
                );
              }),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

export const RealScheduleTable = memo(RealScheduleTableInner);
