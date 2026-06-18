import {
  parseDateBR,
  isValidDate,
  formatBR,
  isWeekend,
  isHoliday,
  isPostRelease,
  addDays,
  isParadoDay,
} from "./index";

export type OvertimeFlags = {
  tombamentoDates: string[]; // datas de tombamento selecionadas (dd/mm/yyyy)
  feriadoDates: string[]; // feriados selecionados para trabalhar (dd/mm/yyyy)
  fimDeSemanaDates: string[]; // finais de semana selecionados para trabalhar (dd/mm/yyyy)
};

export type PacoteAtividade = {
  id: string;
  demanda: string;
  nome: string;
  horas: number; // horas da atividade (step=1)
  horasOvertime?: number; // horas extras que reduzem dias no término
  tipo: string;
  etapa: string;
  inicio: string; // data de início manual dd/mm/yyyy
  overtime?: OvertimeFlags;
};

export type Pacote = {
  id: string;
  codigo: string;
  nome: string;
  collapsed?: boolean;
  atividades: PacoteAtividade[];
};

export type ParadoRange = { start: Date; end: Date };

export function sortAtividadesPorEtapa(atividades: PacoteAtividade[]): PacoteAtividade[] {
  return [...atividades].sort((a, b) => {
    const ea = Number(a.etapa) || 0;
    const eb = Number(b.etapa) || 0;
    return ea - eb;
  });
}

/**
 * Normaliza o valor da etapa garantindo que seja uma string numérica.
 * Qualquer valor não numérico cai no fallback "1".
 */
export function normalizeEtapa(value: unknown): string {
  const str = String(value || "").replace(/\D/g, "");
  return str || "1";
}

/**
 * Sincroniza os campos de planejamento compartilhados entre tarefas da mesma etapa.
 * Opcionalmente força que a atividade com `sourceId` seja a fonte dos valores da sua etapa.
 */
export function syncStageFields(
  atividades: PacoteAtividade[],
  sourceId?: string
): PacoteAtividade[] {
  if (atividades.length === 0) return atividades;

  const sourceByStage = new Map<string, PacoteAtividade>();

  for (const a of atividades) {
    const etapa = normalizeEtapa(a.etapa);
    if (!sourceByStage.has(etapa)) {
      sourceByStage.set(etapa, a);
    }
    if (sourceId && a.id === sourceId) {
      sourceByStage.set(etapa, a);
    }
  }

  return atividades.map((a) => {
    const etapa = normalizeEtapa(a.etapa);
    const source = sourceByStage.get(etapa);
    if (!source || source.id === a.id) return a;
    return {
      ...a,
      inicio: source.inicio,
      horas: source.horas,
      horasOvertime: source.horasOvertime,
      overtime: source.overtime,
    };
  });
}

/**
 * Ordena as atividades por etapa e sincroniza campos de planejamento compartilhados.
 * Útil após qualquer mutação no array de atividades.
 */
export function normalizeAtividadesPorEtapa(
  atividades: PacoteAtividade[],
  sourceId?: string
): PacoteAtividade[] {
  return syncStageFields(sortAtividadesPorEtapa(atividades), sourceId);
}

export const DEFAULT_OVERTIME: OvertimeFlags = {
  tombamentoDates: [],
  feriadoDates: [],
  fimDeSemanaDates: [],
};

export function calcWorkDays(
  startDate: Date,
  numWorkDays: number,
  feriadosList: string[],
  releasesList: string[],
  ot: OvertimeFlags,
  paradoRanges: ParadoRange[] = []
): Date[] {
  const otNorm: OvertimeFlags = {
    tombamentoDates: ot?.tombamentoDates ?? [],
    feriadoDates: ot?.feriadoDates ?? [],
    fimDeSemanaDates: ot?.fimDeSemanaDates ?? [],
  };
  const days: Date[] = [];
  let current = new Date(startDate);
  let guard = 0;
  while (days.length < numWorkDays && guard < 700) {
    const blocked =
      ((current.getDay() === 6 || current.getDay() === 0) &&
        !otNorm.fimDeSemanaDates.includes(formatBR(current))) ||
      (isPostRelease(current, releasesList) &&
        !otNorm.tombamentoDates.includes(formatBR(current))) ||
      (isHoliday(current, feriadosList) &&
        !otNorm.feriadoDates.includes(formatBR(current))) ||
      isParadoDay(current, paradoRanges, feriadosList, releasesList);
    if (!blocked) days.push(new Date(current));
    current = addDays(current, 1);
    guard++;
  }
  return days;
}

export function calcularTermino(
  inicio: string,
  horas: number,
  feriadosList: string[],
  releasesList: string[],
  ot: OvertimeFlags,
  horasOvertime: number,
  paradoRanges: ParadoRange[] = []
): string {
  if (!inicio || horas <= 0) return "—";
  const startDate = parseDateBR(inicio);
  if (!isValidDate(startDate)) return "—";
  const numWorkDays = Math.max(
    1,
    Math.ceil(horas / 8) - Math.floor((horasOvertime || 0) / 8)
  );
  const workDays = calcWorkDays(
    startDate,
    numWorkDays,
    feriadosList,
    releasesList,
    ot,
    paradoRanges
  );
  const termino = workDays[numWorkDays - 1];
  return termino ? formatBR(termino) : "—";
}

export function calcDiasOvertimeTotal(
  inicio: string,
  horas: number,
  horasOT: number,
  feriadosList: string[],
  releasesList: string[],
  ot: OvertimeFlags
): number {
  const otNorm: OvertimeFlags = {
    tombamentoDates: ot?.tombamentoDates ?? [],
    feriadoDates: ot?.feriadoDates ?? [],
    fimDeSemanaDates: ot?.fimDeSemanaDates ?? [],
  };
  const baseOT = (horasOT || 0) / 8;
  if (!inicio || horas <= 0) return baseOT;
  const startDate = parseDateBR(inicio);
  if (!isValidDate(startDate)) return baseOT;
  const numWorkDays = Math.max(
    1,
    Math.ceil(horas / 8) - Math.floor((horasOT || 0) / 8)
  );
  const workDays = calcWorkDays(
    startDate,
    numWorkDays,
    feriadosList,
    releasesList,
    otNorm
  );
  const terminoDate = workDays[numWorkDays - 1];
  if (!terminoDate) return baseOT;
  const allSpecial = [...otNorm.feriadoDates, ...otNorm.fimDeSemanaDates];
  const specialCount = allSpecial.filter((d) => {
    const date = parseDateBR(d);
    return isValidDate(date) && date >= startDate && date <= terminoDate;
  }).length;
  return baseOT + specialCount;
}

export function calcDiasAtuacaoTotal(
  inicio: string,
  horas: number,
  horasOT: number,
  feriadosList: string[],
  releasesList: string[],
  ot: OvertimeFlags,
  paradoRanges: ParadoRange[] = []
): number {
  const otNorm: OvertimeFlags = {
    tombamentoDates: ot?.tombamentoDates ?? [],
    feriadoDates: ot?.feriadoDates ?? [],
    fimDeSemanaDates: ot?.fimDeSemanaDates ?? [],
  };
  const baseDays = (horas + (horasOT || 0)) / 8;
  if (!inicio || horas <= 0) return baseDays;
  const startDate = parseDateBR(inicio);
  if (!isValidDate(startDate)) return baseDays;
  const termino = calcularTermino(
    inicio,
    horas,
    feriadosList,
    releasesList,
    otNorm,
    horasOT,
    paradoRanges
  );
  if (termino === "—") return baseDays;
  const endDate = parseDateBR(termino);
  const allSelected = [
    ...otNorm.feriadoDates,
    ...otNorm.fimDeSemanaDates,
    ...otNorm.tombamentoDates,
  ];
  const specialCount = allSelected.filter((d) => {
    const date = parseDateBR(d);
    return isValidDate(date) && date >= startDate && date <= endDate;
  }).length;
  return baseDays + specialCount;
}

export function calcTombamentosWorkedCount(
  inicio: string,
  horas: number,
  horasOT: number,
  feriadosList: string[],
  releasesList: string[],
  ot: OvertimeFlags
): number {
  const otNorm: OvertimeFlags = {
    tombamentoDates: ot?.tombamentoDates ?? [],
    feriadoDates: ot?.feriadoDates ?? [],
    fimDeSemanaDates: ot?.fimDeSemanaDates ?? [],
  };
  if (!inicio || horas <= 0 || otNorm.tombamentoDates.length === 0) return 0;
  const startDate = parseDateBR(inicio);
  if (!isValidDate(startDate)) return 0;
  const numWorkDays = Math.max(
    1,
    Math.ceil(horas / 8) - Math.floor((horasOT || 0) / 8)
  );
  const workDays = calcWorkDays(
    startDate,
    numWorkDays,
    feriadosList,
    releasesList,
    otNorm
  );
  const terminoDate = workDays[numWorkDays - 1];
  if (!terminoDate) return 0;
  return otNorm.tombamentoDates.filter((d) => {
    const date = parseDateBR(d);
    return isValidDate(date) && date >= startDate && date <= terminoDate;
  }).length;
}

export function calcTotalDiasAtuacaoPacote(
  pacote: Pacote,
  feriadosList: string[],
  releasesList: string[],
  paradoRanges: ParadoRange[] = []
): number {
  let gi = 0;
  let total = 0;
  while (gi < pacote.atividades.length) {
    const etapa = String(pacote.atividades[gi].etapa || "1");
    let gj = gi;
    while (
      gj < pacote.atividades.length &&
      String(pacote.atividades[gj].etapa || "1") === etapa
    )
      gj++;
    const groupAtivs = pacote.atividades.slice(gi, gj);
    // Campos de planejamento são compartilhados por etapa; calcula uma única vez.
    const first = groupAtivs[0];
    const ot = first.overtime ?? DEFAULT_OVERTIME;
    const horasOT = first.horasOvertime ?? 0;
    const termino = calcularTermino(
      first.inicio,
      first.horas,
      feriadosList,
      releasesList,
      ot,
      horasOT,
      paradoRanges
    );
    const startDate = parseDateBR(first.inicio);
    const endDate = parseDateBR(termino);
    let etapaTotalDiasNecessarios = 0;
    if (isValidDate(startDate) && isValidDate(endDate)) {
      const cur = new Date(startDate);
      while (cur <= endDate) {
        if (
          !isWeekend(cur) &&
          !isHoliday(cur, feriadosList) &&
          !isPostRelease(cur, releasesList) &&
          !isParadoDay(cur, paradoRanges, feriadosList, releasesList)
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
      feriadosList,
      releasesList,
      ot
    );
    const etapaTotalTombamento = calcTombamentosWorkedCount(
      first.inicio,
      first.horas,
      horasOT,
      feriadosList,
      releasesList,
      ot
    );
    total +=
      etapaTotalDiasNecessarios + etapaTotalDiasOvertime + etapaTotalTombamento;
    gi = gj;
  }
  return total;
}

export function calcTombamentosNoPeriodo(
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
  const numWorkDays = Math.max(
    1,
    Math.ceil(horas / 8) - Math.floor((horasOvertime || 0) / 8)
  );
  const workDays = calcWorkDays(
    startDate,
    numWorkDays,
    feriadosList,
    releasesList,
    ot
  );
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

export function calcFimDeSemanaNoPeriodo(
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
  const numWorkDays = Math.max(
    1,
    Math.ceil(horas / 8) - Math.floor((horasOvertime || 0) / 8)
  );
  const workDays = calcWorkDays(
    startDate,
    numWorkDays,
    feriadosList,
    releasesList,
    ot
  );
  const terminoDate = workDays[numWorkDays - 1];
  if (!terminoDate) return [];
  const result: string[] = [];
  let current = new Date(startDate);
  while (current <= terminoDate) {
    if (current.getDay() === 6 || current.getDay() === 0)
      result.push(formatBR(current));
    current = addDays(current, 1);
  }
  return result;
}

export function calcFeriadosNoPeriodo(
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
  const numWorkDays = Math.max(
    1,
    Math.ceil(horas / 8) - Math.floor((horasOvertime || 0) / 8)
  );
  const workDays = calcWorkDays(
    startDate,
    numWorkDays,
    feriadosList,
    releasesList,
    ot
  );
  const terminoDate = workDays[numWorkDays - 1];
  if (!terminoDate) return [];
  return feriadosList
    .filter((f) => {
      const fd = parseDateBR(f);
      return isValidDate(fd) && fd >= startDate && fd <= terminoDate;
    })
    .map((f) => formatBR(parseDateBR(f)));
}

export function getInicioDayType(
  inicioBR: string,
  feriadosList: string[],
  releasesList: string[]
): "tombamento" | "feriado" | "releaseSunday" | "weekend" | null {
  const date = parseDateBR(inicioBR);
  if (!isValidDate(date)) return null;
  if (isPostRelease(date, releasesList)) return "tombamento";
  if (isHoliday(date, feriadosList)) return "feriado";
  if (date.getDay() === 0) {
    const nextDay = new Date(date.getTime());
    nextDay.setDate(nextDay.getDate() + 1);
    if (isPostRelease(nextDay, releasesList)) return "releaseSunday";
  }
  if (isWeekend(date)) return "weekend";
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Cronograma real (Gerenciador de Impacto)
   ═══════════════════════════════════════════════════════════════════════════ */

function deepClonePacotes(pacotes: Pacote[] | undefined): Pacote[] {
  if (!pacotes) return [];
  return pacotes.map((p) => ({
    ...p,
    atividades: p.atividades.map((a) => ({
      ...a,
      inicio: a.inicio || "",
      horas: Number(a.horas || 0),
      horasOvertime: Number(a.horasOvertime || 0),
      tipo: a.tipo || "desenvolvimento",
      etapa: a.etapa ?? "1",
      overtime: a.overtime ? { ...a.overtime } : { ...DEFAULT_OVERTIME },
    })),
  }));
}

/**
 * Inicializa o cronograma real a partir dos pacotes da estimativa.
 * Preserva a estrutura de inícios da estimativa, aplicando apenas o offset
 * global entre o primeiro início original e `dataRealInicio`. Assim, quando
 * `dataRealInicio` coincide com o início da estimativa, o calendário real fica
 * idêntico ao calendário da estimativa. Atividades sem início válido usam o
 * término anterior + 1 dia como fallback.
 */
export function initializeRealSchedule(
  pacotes: Pacote[] | undefined,
  dataRealInicio: string,
  feriados: string[] = [],
  releases: string[] = []
): Pacote[] {
  const cloned = deepClonePacotes(pacotes);
  if (cloned.length === 0) return cloned;

  const realStart = parseDateBR(dataRealInicio);
  if (!isValidDate(realStart)) return cloned;

  // Encontra a primeira atividade com início válido entre todos os pacotes
  let firstOriginalStart: Date | null = null;
  for (const pacote of cloned) {
    for (const ativ of pacote.atividades) {
      const d = parseDateBR(ativ.inicio);
      if (isValidDate(d)) {
        if (!firstOriginalStart || d < firstOriginalStart) {
          firstOriginalStart = d;
        }
      }
    }
  }
  if (!firstOriginalStart) return cloned;

  const offsetDays = Math.round(
    (realStart.getTime() - firstOriginalStart.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  for (const pacote of cloned) {
    let previousTermino: Date | null = null;
    for (let i = 0; i < pacote.atividades.length; i++) {
      const ativ = pacote.atividades[i];
      const originalStart = parseDateBR(ativ.inicio);
      if (isValidDate(originalStart)) {
        // Preserva o início relativo da estimativa aplicando o offset global
        ativ.inicio = formatBR(addDays(originalStart, offsetDays));
      } else if (previousTermino) {
        // Fallback: início = término anterior + 1 dia
        ativ.inicio = formatBR(addDays(previousTermino, 1));
      } else {
        ativ.inicio = formatBR(realStart);
      }
      const terminoStr = calcularTermino(
        ativ.inicio,
        Number(ativ.horas || 0),
        feriados,
        releases,
        ativ.overtime ?? DEFAULT_OVERTIME,
        Number(ativ.horasOvertime || 0)
      );
      previousTermino = parseDateBR(terminoStr);
      if (!isValidDate(previousTermino)) previousTermino = null;
    }
  }

  return cloned.map((p) => ({
    ...p,
    atividades: normalizeAtividadesPorEtapa(p.atividades),
  }));
}

/**
 * Recria o cronograma real a partir da estimativa, perdendo remanejamentos
 * manuais. Usado pelo botão "Reinicializar cronograma real".
 */
export function rebuildRealScheduleFromEstimate(
  pacotes: Pacote[] | undefined,
  dataRealInicio: string,
  feriados: string[] = [],
  releases: string[] = []
): Pacote[] {
  return initializeRealSchedule(pacotes, dataRealInicio, feriados, releases);
}
