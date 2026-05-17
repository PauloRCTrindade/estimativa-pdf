import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Package,
  Minus,
} from "lucide-react";
import { DatePicker } from "@/components/date-picker";
import { parseDateBR, isValidDate, getWorkingDays, formatBR, isWeekend, isHoliday, isPostRelease, addDays } from "@/utils";

export type OvertimeFlags = {
  tombamentoDates: string[];   // datas de tombamento selecionadas (dd/mm/yyyy)
  feriadoDates: string[];      // feriados selecionados para trabalhar (dd/mm/yyyy)
  fimDeSemanaDates: string[];  // finais de semana selecionados para trabalhar (dd/mm/yyyy)
};

export type PacoteAtividade = {
  id: string;
  demanda: string;
  nome: string;
  horas: number;    // horas da atividade (step=1)
  horasOvertime?: number;  // horas extras que reduzem dias no término
  tipo: string;
  etapa: string;
  inicio: string;   // data de início manual dd/mm/yyyy
  overtime?: OvertimeFlags;
};

export type Pacote = {
  id: string;
  codigo: string;
  nome: string;
  collapsed?: boolean;
  atividades: PacoteAtividade[];
};

interface EstimativaPacotesTableProps {
  pacotes: Pacote[];
  feriados: string[];    // lista normalizada de feriados (dd/mm/yyyy)
  releases: string[];   // lista normalizada de releases (dd/mm/yyyy)
  onUpdatePacote: (id: string, field: string, value: string) => void;
  onTogglePacote: (id: string) => void;
  onAddPacote: () => void;
  onRemovePacote: (id: string) => void;
  onAddAtividade: (pacoteId: string) => void;
  onUpdateAtividade: (
    pacoteId: string,
    atividadeId: string,
    field: string,
    value: unknown
  ) => void;
  onRemoveAtividade: (pacoteId: string, atividadeId: string) => void;
}

const ETAPA_COLORS = [
  { border: 'border-l-indigo-400', bg: 'bg-indigo-50' },
  { border: 'border-l-teal-400',   bg: 'bg-teal-50'   },
  { border: 'border-l-rose-400',   bg: 'bg-rose-50'   },
  { border: 'border-l-amber-400',  bg: 'bg-amber-50'  },
  { border: 'border-l-violet-400', bg: 'bg-violet-50' },
  { border: 'border-l-cyan-400',   bg: 'bg-cyan-50'   },
  { border: 'border-l-green-400',  bg: 'bg-green-50'  },
  { border: 'border-l-orange-500', bg: 'bg-orange-50' },
];

const DEFAULT_OVERTIME: OvertimeFlags = { tombamentoDates: [], feriadoDates: [], fimDeSemanaDates: [] };

function calcWorkDays(
  startDate: Date,
  numWorkDays: number,
  feriadosList: string[],
  releasesList: string[],
  ot: OvertimeFlags
): Date[] {
  const days: Date[] = [];
  let current = new Date(startDate);
  let guard = 0;
  while (days.length < numWorkDays && guard < 700) {
    const blocked =
      ((current.getDay() === 6 || current.getDay() === 0) && !ot.fimDeSemanaDates.includes(formatBR(current))) ||
      (isPostRelease(current, releasesList) && !ot.tombamentoDates.includes(formatBR(current))) ||
      (isHoliday(current, feriadosList) && !ot.feriadoDates.includes(formatBR(current)));
    if (!blocked) days.push(new Date(current));
    current = addDays(current, 1);
    guard++;
  }
  return days;
}

export function calcDiasOvertimeTotal(
  inicio: string,
  horas: number,
  horasOT: number,
  feriadosList: string[],
  releasesList: string[],
  ot: OvertimeFlags
): number {
  const baseOT = (horasOT || 0) / 8;
  if (!inicio || horas <= 0) return baseOT;
  const startDate = parseDateBR(inicio);
  if (!isValidDate(startDate)) return baseOT;
  const numWorkDays = Math.max(1, Math.ceil(horas / 8) - Math.floor((horasOT || 0) / 8));
  const workDays = calcWorkDays(startDate, numWorkDays, feriadosList, releasesList, ot);
  const terminoDate = workDays[numWorkDays - 1];
  if (!terminoDate) return baseOT;
  const allSpecial = [...ot.feriadoDates, ...ot.fimDeSemanaDates];
  const specialCount = allSpecial.filter((d) => {
    const date = parseDateBR(d);
    return isValidDate(date) && date >= startDate && date <= terminoDate;
  }).length;
  return baseOT + specialCount;
}

function calcTombamentosWorkedCount(
  inicio: string,
  horas: number,
  horasOT: number,
  feriadosList: string[],
  releasesList: string[],
  ot: OvertimeFlags
): number {
  if (!inicio || horas <= 0 || ot.tombamentoDates.length === 0) return 0;
  const startDate = parseDateBR(inicio);
  if (!isValidDate(startDate)) return 0;
  const numWorkDays = Math.max(1, Math.ceil(horas / 8) - Math.floor((horasOT || 0) / 8));
  const workDays = calcWorkDays(startDate, numWorkDays, feriadosList, releasesList, ot);
  const terminoDate = workDays[numWorkDays - 1];
  if (!terminoDate) return 0;
  return ot.tombamentoDates.filter((d) => {
    const date = parseDateBR(d);
    return isValidDate(date) && date >= startDate && date <= terminoDate;
  }).length;
}

export function calcTotalDiasAtuacaoPacote(
  pacote: Pacote,
  feriadosList: string[],
  releasesList: string[]
): number {
  let gi = 0;
  let total = 0;
  while (gi < pacote.atividades.length) {
    const etapa = String(pacote.atividades[gi].etapa || "1");
    let gj = gi;
    while (gj < pacote.atividades.length && String(pacote.atividades[gj].etapa || "1") === etapa) gj++;
    const groupAtivs = pacote.atividades.slice(gi, gj);
    const gStarts = groupAtivs.map(a => parseDateBR(a.inicio)).filter((d): d is Date => isValidDate(d));
    const gTerminos = groupAtivs.map(a => {
      const ot = a.overtime ?? DEFAULT_OVERTIME;
      const horasOT = a.horasOvertime ?? 0;
      const t = calcularTermino(a.inicio, a.horas, feriadosList, releasesList, ot, horasOT);
      if (t === "—") return null;
      const d = parseDateBR(t);
      return isValidDate(d) ? d : null;
    }).filter((d): d is Date => d !== null);
    let etapaTotalDiasNecessarios = 0;
    if (gStarts.length > 0 && gTerminos.length > 0) {
      const minStart = gStarts.reduce((min, d) => d < min ? d : min);
      const maxEnd = gTerminos.reduce((max, d) => d > max ? d : max);
      const cur = new Date(minStart);
      while (cur <= maxEnd) {
        if (!isWeekend(cur) && !isHoliday(cur, feriadosList) && !isPostRelease(cur, releasesList)) etapaTotalDiasNecessarios++;
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      etapaTotalDiasNecessarios = groupAtivs.reduce((sum, a) => sum + Number(a.horas || 0) / 8, 0);
    }
    const etapaTotalDiasOvertime = groupAtivs.reduce(
      (sum, a) => sum + calcDiasOvertimeTotal(a.inicio, a.horas, a.horasOvertime ?? 0, feriadosList, releasesList, a.overtime ?? DEFAULT_OVERTIME), 0
    );
    const etapaTotalTombamento = groupAtivs.reduce(
      (sum, a) => sum + calcTombamentosWorkedCount(a.inicio, a.horas, a.horasOvertime ?? 0, feriadosList, releasesList, a.overtime ?? DEFAULT_OVERTIME), 0
    );
    total += etapaTotalDiasNecessarios + etapaTotalDiasOvertime + etapaTotalTombamento;
    gi = gj;
  }
  return total;
}

function calcTombamentosNoPeriodo(
  inicio: string,
  horas: number,
  feriadosList: string[],
  releasesList: string[],
  ot: OvertimeFlags,
  horasOvertime: number
): string[] {
  if (!inicio || releasesList.length === 0) return [];
  const startDate = parseDateBR(inicio);
  if (!isValidDate(startDate)) return [];
  const numWorkDays = Math.max(1, Math.ceil(horas / 8) - Math.floor((horasOvertime || 0) / 8));
  const workDays = calcWorkDays(startDate, numWorkDays, feriadosList, releasesList, ot);
  const terminoDate = workDays[numWorkDays - 1];
  if (!terminoDate) return [];
  const result: string[] = [];
  let current = new Date(startDate);
  while (current <= terminoDate) {
    if (isPostRelease(current, releasesList)) result.push(formatBR(current));
    current = addDays(current, 1);
  }
  return result;
}

function calcFimDeSemanaNoPeriodo(
  inicio: string,
  horas: number,
  feriadosList: string[],
  releasesList: string[],
  ot: OvertimeFlags,
  horasOvertime: number
): string[] {
  if (!inicio || horas <= 0) return [];
  const startDate = parseDateBR(inicio);
  if (!isValidDate(startDate)) return [];
  const numWorkDays = Math.max(1, Math.ceil(horas / 8) - Math.floor((horasOvertime || 0) / 8));
  const workDays = calcWorkDays(startDate, numWorkDays, feriadosList, releasesList, ot);
  const terminoDate = workDays[numWorkDays - 1];
  if (!terminoDate) return [];
  const result: string[] = [];
  let current = new Date(startDate);
  while (current <= terminoDate) {
    if (current.getDay() === 6 || current.getDay() === 0) result.push(formatBR(current));
    current = addDays(current, 1);
  }
  return result;
}

function calcFeriadosNoPeriodo(
  inicio: string,
  horas: number,
  feriadosList: string[],
  releasesList: string[],
  ot: OvertimeFlags,
  horasOvertime: number
): string[] {
  if (!inicio || horas <= 0 || feriadosList.length === 0) return [];
  const startDate = parseDateBR(inicio);
  if (!isValidDate(startDate)) return [];
  const numWorkDays = Math.max(1, Math.ceil(horas / 8) - Math.floor((horasOvertime || 0) / 8));
  const workDays = calcWorkDays(startDate, numWorkDays, feriadosList, releasesList, ot);
  const terminoDate = workDays[numWorkDays - 1];
  if (!terminoDate) return [];
  return feriadosList
    .filter((f) => {
      const fd = parseDateBR(f);
      return isValidDate(fd) && fd >= startDate && fd <= terminoDate;
    })
    .map((f) => formatBR(parseDateBR(f)));
}

export function calcularTermino(
  inicio: string,
  horas: number,
  feriadosList: string[],
  releasesList: string[],
  ot: OvertimeFlags,
  horasOvertime: number
): string {
  if (!inicio || horas <= 0) return "—";
  const startDate = parseDateBR(inicio);
  if (!isValidDate(startDate)) return "—";
  const numWorkDays = Math.max(1, Math.ceil(horas / 8) - Math.floor((horasOvertime || 0) / 8));
  const workDays = calcWorkDays(startDate, numWorkDays, feriadosList, releasesList, ot);
  const termino = workDays[numWorkDays - 1];
  return termino ? formatBR(termino) : "—";
}

function calcDiasAtuacaoTotal(
  inicio: string,
  horas: number,
  horasOT: number,
  feriadosList: string[],
  releasesList: string[],
  ot: OvertimeFlags
): number {
  const baseDays = (horas + (horasOT || 0)) / 8;
  if (!inicio || horas <= 0) return baseDays;
  const startDate = parseDateBR(inicio);
  if (!isValidDate(startDate)) return baseDays;
  const termino = calcularTermino(inicio, horas, feriadosList, releasesList, ot, horasOT);
  if (termino === "—") return baseDays;
  const endDate = parseDateBR(termino);
  const allSelected = [...ot.feriadoDates, ...ot.fimDeSemanaDates, ...ot.tombamentoDates];
  const specialCount = allSelected.filter((d) => {
    const date = parseDateBR(d);
    return isValidDate(date) && date >= startDate && date <= endDate;
  }).length;
  return baseDays + specialCount;
}

export function EstimativaPacotesTable({
  pacotes,
  feriados,
  releases,
  onUpdatePacote,
  onTogglePacote,
  onAddPacote,
  onRemovePacote,
  onAddAtividade,
  onUpdateAtividade,
  onRemoveAtividade,
}: EstimativaPacotesTableProps) {
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const onUpdateAtividadeRef = useRef(onUpdateAtividade);
  onUpdateAtividadeRef.current = onUpdateAtividade;

  // Auto-popula o início de cada atividade (índice > 0) como termino_anterior + 1 dia
  useEffect(() => {
    pacotes.forEach((pacote) => {
      for (let i = 1; i < pacote.atividades.length; i++) {
        const prev = pacote.atividades[i - 1];
        const curr = pacote.atividades[i];
        const prevTermino = calcularTermino(
          prev.inicio,
          Number(prev.horas || 0),
          feriados,
          releases,
          prev.overtime || DEFAULT_OVERTIME,
          Number(prev.horasOvertime || 0)
        );
        if (prevTermino !== "—") {
          const prevTerminoDate = parseDateBR(prevTermino);
          if (isValidDate(prevTerminoDate) && !curr.inicio) {
            const autoInicio = formatBR(addDays(prevTerminoDate, 1));
            onUpdateAtividadeRef.current(pacote.id, curr.id, "inicio", autoInicio);
          }
        }
      }
    });
  }, [pacotes, feriados, releases]);

  // Recalcula início de todas as atividades subsequentes ao índice informado.
  // `overrides` permite passar o novo valor da atividade âncora antes do estado atualizar.
  function cascadeFrom(pacote: Pacote, atividadeIdx: number, overrides: Partial<PacoteAtividade> = {}) {
    const atividades = pacote.atividades;
    const base = { ...atividades[atividadeIdx], ...overrides };

    let prevInicio = base.inicio;
    let prevHoras = Number(base.horas || 0);
    let prevHorasOT = Number(base.horasOvertime || 0);
    let prevOT = base.overtime || DEFAULT_OVERTIME;

    for (let i = atividadeIdx + 1; i < atividades.length; i++) {
      const prevTermino = calcularTermino(prevInicio, prevHoras, feriados, releases, prevOT, prevHorasOT);
      if (prevTermino === "\u2014") break;
      const prevTerminoDate = parseDateBR(prevTermino);
      if (!isValidDate(prevTerminoDate)) break;

      const nextInicio = formatBR(addDays(prevTerminoDate, 1));
      const curr = atividades[i];
      onUpdateAtividade(pacote.id, curr.id, "inicio", nextInicio);

      prevInicio = nextInicio;
      prevHoras = Number(curr.horas || 0);
      prevHorasOT = Number(curr.horasOvertime || 0);
      prevOT = curr.overtime || DEFAULT_OVERTIME;
    }
  }

  function handleInicioChange(pacote: Pacote, atividadeIdx: number, newDate: string) {
    onUpdateAtividade(pacote.id, pacote.atividades[atividadeIdx].id, "inicio", newDate);
    cascadeFrom(pacote, atividadeIdx, { inicio: newDate });
  }

  function getInicioDayType(inicioBR: string): 'tombamento' | 'feriado' | 'releaseSunday' | 'weekend' | null {
    const date = parseDateBR(inicioBR);
    if (!isValidDate(date)) return null;
    if (isPostRelease(date, releases)) return 'tombamento';
    if (isHoliday(date, feriados)) return 'feriado';
    if (date.getDay() === 0) {
      const nextDay = new Date(date.getTime());
      nextDay.setDate(nextDay.getDate() + 1);
      if (isPostRelease(nextDay, releases)) return 'releaseSunday';
    }
    if (isWeekend(date)) return 'weekend';
    return null;
  }

  function calcDias(horas: number): number {
    return Number(horas || 0) / 8;
  }

  function totalHorasPacote(pacote: Pacote): number {
    return pacote.atividades.reduce((acc, a) => acc + Number(a.horas || 0), 0);
  }

  function totalDiasPacote(pacote: Pacote): number {
    return pacote.atividades.reduce((total, a) => {
      const ot = a.overtime ?? DEFAULT_OVERTIME;
      const horasOT = a.horasOvertime ?? 0;
      return total + calcDiasAtuacaoTotal(a.inicio, a.horas, horasOT, feriados, releases, ot);
    }, 0);
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
      while (gj < pacote.atividades.length && String(pacote.atividades[gj].etapa || "1") === etapa) gj++;
      const groupAtivs = pacote.atividades.slice(gi, gj);
      const size = gj - gi;
      if (!etapaColorIdx.has(etapa)) {
        etapaColorIdx.set(etapa, colorCounter % ETAPA_COLORS.length);
        colorCounter++;
      }
      const colorEntry = ETAPA_COLORS[etapaColorIdx.get(etapa)!];
      // Dias Necessários: span de dias úteis (sem fins de semana, feriados e tombamentos)
      // entre o início da 1ª tarefa e o término da última tarefa da etapa
      const gStarts = groupAtivs.map(a => parseDateBR(a.inicio)).filter((d): d is Date => isValidDate(d));
      const gTerminos = groupAtivs.map(a => {
        const ot = a.overtime ?? DEFAULT_OVERTIME;
        const horasOT = a.horasOvertime ?? 0;
        const t = calcularTermino(a.inicio, a.horas, feriados, releases, ot, horasOT);
        if (t === "\u2014") return null;
        const d = parseDateBR(t);
        return isValidDate(d) ? d : null;
      }).filter((d): d is Date => d !== null);
      let etapaTotalDiasNecessarios = 0;
      if (gStarts.length > 0 && gTerminos.length > 0) {
        const minStart = gStarts.reduce((min, d) => d < min ? d : min);
        const maxEnd = gTerminos.reduce((max, d) => d > max ? d : max);
        const cur = new Date(minStart);
        while (cur <= maxEnd) {
          if (!isWeekend(cur) && !isHoliday(cur, feriados) && !isPostRelease(cur, releases)) etapaTotalDiasNecessarios++;
          cur.setDate(cur.getDate() + 1);
        }
      } else {
        etapaTotalDiasNecessarios = groupAtivs.reduce((sum, a) => sum + Number(a.horas || 0) / 8, 0);
      }
      const etapaTotalDiasOvertime = groupAtivs.reduce(
        (sum, a) => sum + calcDiasOvertimeTotal(a.inicio, a.horas, a.horasOvertime ?? 0, feriados, releases, a.overtime ?? DEFAULT_OVERTIME), 0
      );
      const etapaTotalTombamento = groupAtivs.reduce(
        (sum, a) => sum + calcTombamentosWorkedCount(a.inicio, a.horas, a.horasOvertime ?? 0, feriados, releases, a.overtime ?? DEFAULT_OVERTIME), 0
      );
      const etapaTotalDiasAtuacao = etapaTotalDiasNecessarios + etapaTotalDiasOvertime + etapaTotalTombamento;
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

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 shadow-sm bg-white">
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr className="bg-zinc-800 text-white">
            <th className="w-28 px-3 py-2 text-left border-r border-zinc-700">Demanda</th>
            <th className="w-32 px-2 py-2 text-center border-r border-zinc-700">Tipo</th>
            <th className="w-14 px-2 py-2 text-center border-r border-zinc-700">Etapa</th>
            <th className="px-3 py-2 text-left border-r border-zinc-700 min-w-64">Atividade / Pacote</th>
            <th className="w-28 px-2 py-2 text-center border-r border-zinc-700">Início</th>
            <th className="w-24 px-2 py-2 text-center border-r border-zinc-700">Horas</th>
            <th className="w-36 px-2 py-2 text-center border-r border-zinc-700">Feriado</th>
            <th className="w-36 px-2 py-2 text-center border-r border-zinc-700">Finais de Semana</th>
            <th className="w-36 px-2 py-2 text-center border-r border-zinc-700">Tombamento</th>
            <th className="w-20 px-2 py-2 text-center border-r border-zinc-700">Dias Necessários</th>
            <th className="w-20 px-2 py-2 text-center border-r border-zinc-700">Dias de Overtime</th>
            <th className="w-24 px-2 py-2 text-center border-r border-zinc-700">Horas de Overtime</th>
            <th className="w-20 px-2 py-2 text-center border-r border-zinc-700">Dias de Atuação</th>
            <th className="w-24 px-2 py-2 text-center border-r border-zinc-700">Término</th>
            <th className="w-16 px-2 py-2 text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {pacotes.map((pacote) => {
            const totalDias = totalDiasPacote(pacote);
            const totalHoras = totalHorasPacote(pacote);
            const collapsed = pacote.collapsed ?? false;
            const ativGroupInfoList = buildAtivGroupInfo(pacote);

            return [
              <tr key={`pacote-${pacote.id}`} className="bg-orange-500 text-white font-semibold">
                {}
                <td className="px-2 py-1.5 border-r border-orange-400">
                  <div className="flex items-center gap-1">
                    <button onClick={() => onTogglePacote(pacote.id)} className="hover:opacity-80 transition-opacity flex-shrink-0">
                      {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    <input
                      className="bg-transparent text-white placeholder-orange-200 font-semibold w-full outline-none focus:bg-orange-600 rounded px-1"
                      value={pacote.codigo}
                      placeholder="Código"
                      onChange={(e) => onUpdatePacote(pacote.id, "codigo", e.target.value)}
                    />
                  </div>
                </td>
                {}
                <td className="px-2 py-1.5 border-r border-orange-400" />
                {}
                <td className="px-2 py-1.5 border-r border-orange-400" />
                {}
                <td className="px-2 py-1.5 border-r border-orange-400">
                  <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 flex-shrink-0 opacity-80" />
                    <input
                      className="bg-transparent text-white placeholder-orange-200 font-semibold flex-1 outline-none focus:bg-orange-600 rounded px-1 min-w-0"
                      value={pacote.nome}
                      placeholder="Nome do pacote"
                      onChange={(e) => onUpdatePacote(pacote.id, "nome", e.target.value)}
                    />
                  </div>
                </td>
                {}
                <td className="px-2 py-1.5 border-r border-orange-400" />
                {}
                <td className="px-2 py-1.5 text-center border-r border-orange-400 tabular-nums">
                  {totalHoras > 0 ? `${totalHoras}h` : "—"}
                </td>
                {}
                <td className="px-2 py-1.5 border-r border-orange-400" />
                {}
                <td className="px-2 py-1.5 border-r border-orange-400" />
                {}
                <td className="px-2 py-1.5 border-r border-orange-400" />
                {}
                <td className="px-2 py-1.5 text-center border-r border-orange-400 tabular-nums font-bold">
                  {(() => {
                    const total = ativGroupInfoList.filter(g => g.isFirstInGroup).reduce((sum, g) => sum + g.etapaTotalDiasNecessarios, 0);
                    return total > 0 ? total : "—";
                  })()}
                </td>
                {}
                <td className="px-2 py-1.5 border-r border-orange-400" />
                {}
                <td className="px-2 py-1.5 border-r border-orange-400" />
                {}
                <td className="px-2 py-1.5 text-center border-r border-orange-400 tabular-nums font-bold">
                  {(() => {
                    const total = ativGroupInfoList.filter(g => g.isFirstInGroup).reduce((sum, g) => sum + g.etapaTotalDiasAtuacao, 0);
                    return total > 0 ? total : "—";
                  })()}
                </td>
                {}
                <td className="px-2 py-1.5 border-r border-orange-400" />
                {}
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => onAddAtividade(pacote.id)} title="Adicionar atividade" className="p-1 hover:bg-orange-600 rounded transition-colors">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => onRemovePacote(pacote.id)} title="Remover pacote" className="p-1 hover:bg-red-600 rounded transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>,

              ...(!collapsed
                ? pacote.atividades.map((ativ, idx) => {
                    activityRowIndex++;
                    const ot = ativ.overtime ?? DEFAULT_OVERTIME;
                    const horasOT = ativ.horasOvertime ?? 0;
                    const diasCalc = calcDiasAtuacaoTotal(ativ.inicio, ativ.horas, horasOT, feriados, releases, ot);
                    const diasOvertimeCalc = calcDiasOvertimeTotal(ativ.inicio, ativ.horas, horasOT, feriados, releases, ot);
                    const terminoCalc = calcularTermino(ativ.inicio, ativ.horas, feriados, releases, ot, horasOT);
                    const groupInfo = ativGroupInfoList[idx];

                    return (
                      <tr
                        key={`ativ-${ativ.id}`}
                        className={`${groupInfo.colorBg} hover:bg-blue-50 transition-colors`}
                      >
                        {}
                        <td className={`px-2 py-1 border-r border-zinc-200 select-none border-l-4 ${groupInfo.colorBorder}`}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-400 tabular-nums text-xs font-medium flex-shrink-0">{activityRowIndex}.</span>
                            {ativ.demanda && <span className="text-zinc-500 truncate">{ativ.demanda}</span>}
                          </div>
                        </td>

                        {}
                        <td className="px-1 py-1 border-r border-zinc-200">
                          <Select
                            value={ativ.tipo}
                            onValueChange={(v) => onUpdateAtividade(pacote.id, ativ.id, "tipo", v)}
                          >
                            <SelectTrigger className="h-6 text-xs border-transparent bg-transparent hover:border-zinc-200 focus:border-blue-400 px-1.5">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="desenvolvimento">Desenvolvimento</SelectItem>
                              <SelectItem value="subida">Subida Pre Prod</SelectItem>
                              <SelectItem value="testes">Testes Internos</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        {}
                        <td className="px-1 py-1 text-center border-r border-zinc-200">
                          <input
                            className={`w-full px-1 py-0.5 rounded text-xs outline-none border text-center tabular-nums ${
                              focusedCell === `etapa-${ativ.id}`
                                ? "border-blue-400 bg-white"
                                : "border-transparent bg-transparent hover:border-zinc-200"
                            }`}
                            value={ativ.etapa ?? ""}
                            placeholder="1"
                            onChange={(e) => onUpdateAtividade(pacote.id, ativ.id, "etapa", e.target.value)}
                            onFocus={() => setFocusedCell(`etapa-${ativ.id}`)}
                            onBlur={() => setFocusedCell(null)}
                          />
                        </td>

                        {}
                        <td className="px-1 py-1 border-r border-zinc-200">
                          <input
                            className={`w-full px-1.5 py-0.5 rounded text-xs outline-none border ${
                              focusedCell === `nome-${ativ.id}`
                                ? "border-blue-400 bg-white"
                                : "border-transparent bg-transparent hover:border-zinc-200"
                            }`}
                            value={ativ.nome}
                            placeholder="Nome da atividade"
                            onChange={(e) => onUpdateAtividade(pacote.id, ativ.id, "nome", e.target.value)}
                            onFocus={() => setFocusedCell(`nome-${ativ.id}`)}
                            onBlur={() => setFocusedCell(null)}
                          />
                        </td>

                        {}
                        <td className="px-1 py-1 border-r border-zinc-200">
                          {(() => {
                            const dayType = getInicioDayType(ativ.inicio);
                            const colorClass =
                              dayType === 'feriado' ? 'border-red-400 bg-red-50 text-red-700 hover:bg-red-100' :
                              dayType === 'tombamento' ? 'border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100' :
                              dayType === 'releaseSunday' ? 'border-blue-500 bg-blue-300 text-blue-900 hover:bg-blue-400' :
                              dayType === 'weekend' ? 'border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100' : '';
                            return (
                              <DatePicker
                                value={ativ.inicio}
                                onChange={(date) => handleInicioChange(pacote, idx, date)}
                                placeholder="dd/mm/aaaa"
                                className={`h-6 text-xs ${colorClass}`}
                                feriados={feriados}
                                releases={releases}
                              />
                            );
                          })()}
                        </td>

                        {}
                        <td className="px-1 py-1 text-center border-r border-zinc-200">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-200 text-zinc-500 transition-colors"
                              onClick={() => { const v = Math.max(0, Number(ativ.horas || 0) - 1); onUpdateAtividade(pacote.id, ativ.id, "horas", v); cascadeFrom(pacote, idx, { horas: v }); }}
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className={`w-12 px-1 py-0.5 rounded text-xs outline-none border text-center tabular-nums font-medium ${
                                focusedCell === `horas-${ativ.id}`
                                  ? "border-blue-400 bg-white"
                                  : Number(ativ.horas) > 0
                                  ? "border-transparent bg-blue-50 text-blue-700 hover:border-blue-200"
                                  : "border-transparent bg-transparent hover:border-zinc-200"
                              }`}
                              value={ativ.horas || ""}
                              placeholder="0"
                              onChange={(e) => { const v = Math.max(0, Math.round(Number(e.target.value))); onUpdateAtividade(pacote.id, ativ.id, "horas", v); cascadeFrom(pacote, idx, { horas: v }); }}
                              onFocus={() => setFocusedCell(`horas-${ativ.id}`)}
                              onBlur={() => setFocusedCell(null)}
                            />
                            <button
                              className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-200 text-zinc-500 transition-colors"
                              onClick={() => { const v = Number(ativ.horas || 0) + 1; onUpdateAtividade(pacote.id, ativ.id, "horas", v); cascadeFrom(pacote, idx, { horas: v }); }}
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </td>

                        {}
                        <td className="px-2 py-1 text-center border-r border-zinc-200">
                          {(() => {
                            const fs = calcFeriadosNoPeriodo(ativ.inicio, ativ.horas, feriados, releases, ot, horasOT);
                            if (fs.length === 0) return <span className="text-zinc-300">—</span>;
                            return (
                              <div className="flex flex-wrap gap-0.5 justify-center">
                                {fs.map((f) => {
                                  const selected = ot.feriadoDates.includes(f);
                                  return (
                                    <button
                                      key={f}
                                      title={selected ? "Clique para bloquear" : "Clique para trabalhar neste feriado"}
                                      onClick={() => {
                                        const next = selected
                                          ? ot.feriadoDates.filter((d) => d !== f)
                                          : [...ot.feriadoDates, f];
                                        const newOT = { ...ot, feriadoDates: next }; onUpdateAtividade(pacote.id, ativ.id, "overtime", newOT); cascadeFrom(pacote, idx, { overtime: newOT });
                                      }}
                                      className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium tabular-nums cursor-pointer transition-colors ${
                                        selected
                                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                                          : "bg-red-100 text-red-700 hover:bg-red-200"
                                      }`}
                                    >
                                      {f}
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </td>

                        {}
                        <td className="px-2 py-1 text-center border-r border-zinc-200">
                          {(() => {
                            const ws = calcFimDeSemanaNoPeriodo(ativ.inicio, ativ.horas, feriados, releases, ot, horasOT);
                            if (ws.length === 0) return <span className="text-zinc-300">—</span>;
                            return (
                              <div className="flex flex-wrap gap-0.5 justify-center">
                                {ws.map((w) => {
                                  const selected = ot.fimDeSemanaDates.includes(w);
                                  const dateW = parseDateBR(w);
                                  const isReleaseSunday = isValidDate(dateW) && dateW.getDay() === 0 && (
                                    releases.includes(w) ||
                                    releases.includes(formatBR(addDays(dateW, 1)))
                                  );
                                  return (
                                    <button
                                      key={w}
                                      title={selected ? "Clique para bloquear" : "Clique para trabalhar neste dia"}
                                      onClick={() => {
                                        const next = selected
                                          ? ot.fimDeSemanaDates.filter((d) => d !== w)
                                          : [...ot.fimDeSemanaDates, w];
                                        const newOT = { ...ot, fimDeSemanaDates: next }; onUpdateAtividade(pacote.id, ativ.id, "overtime", newOT); cascadeFrom(pacote, idx, { overtime: newOT });
                                      }}
                                      className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium tabular-nums cursor-pointer transition-colors ${
                                        selected
                                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                                          : isReleaseSunday
                                          ? "bg-blue-300 text-blue-900 hover:bg-blue-400"
                                          : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                      }`}
                                    >
                                      {w}
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </td>

                        {}
                        <td className="px-2 py-1 text-center border-r border-zinc-200">
                          {(() => {
                            const ts = calcTombamentosNoPeriodo(ativ.inicio, ativ.horas, feriados, releases, ot, horasOT);
                            if (ts.length === 0) return <span className="text-zinc-300">—</span>;
                            return (
                              <div className="flex flex-wrap gap-0.5 justify-center">
                                {ts.map((t) => {
                                  const selected = ot.tombamentoDates.includes(t);
                                  return (
                                    <button
                                      key={t}
                                      title={selected ? "Clique para bloquear" : "Clique para trabalhar neste dia"}
                                      onClick={() => {
                                        const next = selected
                                          ? ot.tombamentoDates.filter((d) => d !== t)
                                          : [...ot.tombamentoDates, t];
                                        const newOT = { ...ot, tombamentoDates: next }; onUpdateAtividade(pacote.id, ativ.id, "overtime", newOT); cascadeFrom(pacote, idx, { overtime: newOT });
                                      }}
                                      className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium tabular-nums cursor-pointer transition-colors ${
                                        selected
                                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                                          : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                                      }`}
                                    >
                                      {t}
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </td>

                        {groupInfo.isFirstInGroup && (
                          <td rowSpan={groupInfo.groupSize} className="px-2 py-1 text-center border-r border-zinc-200 align-middle">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs tabular-nums font-semibold ${groupInfo.etapaTotalDiasNecessarios > 0 ? "bg-zinc-100 text-zinc-700" : "text-zinc-400"}`}>
                              {groupInfo.etapaTotalDiasNecessarios > 0 ? groupInfo.etapaTotalDiasNecessarios : "—"}
                            </span>
                          </td>
                        )}

                        {}
                        <td className="px-2 py-1 text-center border-r border-zinc-200">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs tabular-nums font-semibold ${diasOvertimeCalc > 0 ? "bg-purple-100 text-purple-800" : "text-zinc-400"}`}>
                            {diasOvertimeCalc > 0 ? diasOvertimeCalc : "—"}
                          </span>
                        </td>

                        {}
                        <td className="px-1 py-1 text-center border-r border-zinc-200">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-200 text-zinc-500 transition-colors"
                              onClick={() => { const v = Math.max(0, horasOT - 1); onUpdateAtividade(pacote.id, ativ.id, "horasOvertime", v); cascadeFrom(pacote, idx, { horasOvertime: v }); }}
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className={`w-12 px-1 py-0.5 rounded text-xs outline-none border text-center tabular-nums font-medium ${
                                focusedCell === `horasot-${ativ.id}`
                                  ? "border-blue-400 bg-white"
                                  : horasOT > 0
                                  ? "border-transparent bg-purple-50 text-purple-700 hover:border-purple-200"
                                  : "border-transparent bg-transparent hover:border-zinc-200"
                              }`}
                              value={horasOT || ""}
                              placeholder="0"
                              onChange={(e) => { const v = Math.max(0, Math.round(Number(e.target.value))); onUpdateAtividade(pacote.id, ativ.id, "horasOvertime", v); cascadeFrom(pacote, idx, { horasOvertime: v }); }}
                              onFocus={() => setFocusedCell(`horasot-${ativ.id}`)}
                              onBlur={() => setFocusedCell(null)}
                            />
                            <button
                              className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-200 text-zinc-500 transition-colors"
                              onClick={() => { const v = horasOT + 1; onUpdateAtividade(pacote.id, ativ.id, "horasOvertime", v); cascadeFrom(pacote, idx, { horasOvertime: v }); }}
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </td>

                        {groupInfo.isFirstInGroup && (
                          <td rowSpan={groupInfo.groupSize} className="px-2 py-1 text-center border-r border-zinc-200 align-middle">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs tabular-nums font-semibold ${groupInfo.etapaTotalDiasAtuacao > 0 ? "bg-green-100 text-green-800" : "text-zinc-400"}`}>
                              {groupInfo.etapaTotalDiasAtuacao > 0 ? groupInfo.etapaTotalDiasAtuacao : "—"}
                            </span>
                          </td>
                        )}

                        {}
                        <td className="px-2 py-1 text-center border-r border-zinc-200 tabular-nums">
                          <span className={terminoCalc !== "—" ? "text-zinc-700 font-medium" : "text-zinc-400"}>
                            {terminoCalc}
                          </span>
                        </td>

                        {}
                        <td className="px-2 py-1 text-center">
                          <button
                            onClick={() => onRemoveAtividade(pacote.id, ativ.id)}
                            title="Remover atividade"
                            className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                : []),
            ];
          })}

          {}
          <tr>
            <td colSpan={15} className="px-3 py-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400"
                onClick={onAddPacote}
              >
                <Plus className="h-3.5 w-3.5 mr-2" />
                Adicionar pacote
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
