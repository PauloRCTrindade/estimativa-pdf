import { useMemo } from "react";
import type { AppForm } from "@/types";
import {
  addDays,
  isValidDate,
  isWeekend,
  normalizeDateList,
  parseDateBR,
  sameDateBR,
  getChgDates,
  getTimelineColor,
  getTimelineLabel,
  getWorkingDays,
  isEsteiraPreProdDay,
  isHoliday,
  isPostRelease,
  parseDateRangeList,
  parseDiasParadosList,
  isParadoDay,
  isReleaseDay,
  isSameDay,
} from "@/utils";
import { COLORS } from "@/styles";
import {
  calcularTermino,
  calcDiasOvertimeTotal,
  calcTotalDiasAtuacaoPacote,
  type Pacote,
} from "@/utils/schedule";

const DEFAULT_OVERTIME = { tombamentoDates: [] as string[], feriadoDates: [] as string[], fimDeSemanaDates: [] as string[] };

export interface TimelineDay {
  date: Date;
  tipo: string;
  color: string;
  isReleaseDay: boolean;
  isEsteiraPreProd: boolean;
  isChg: boolean;
  workBorderColor?: string;
}

export interface CalculatedActivity {
  id: string;
  nome: string;
  tipo: string;
  dias: number;
  etapa: string;
  inicio: Date;
  termino: Date;
}

export interface CalculoResult {
  validDays: Date[];
  atividadesCalculadas: CalculatedActivity[];
  timeline: TimelineDay[];
  endDate: Date;
  inicioPacote: string;
}

export function useTimelineCalculations(form: AppForm, atividades: any[], pacotes: Pacote[]) {
  const releases = useMemo(() => normalizeDateList(form.releases), [form.releases]);
  const feriados = useMemo(() => normalizeDateList(form.feriados), [form.feriados]);
  const diasParados = useMemo(() => parseDiasParadosList(form.diasParados || ""), [form.diasParados]);
  const esteiraPreProdRanges = useMemo(() => parseDateRangeList(form.esteiraPreProd || ""), [form.esteiraPreProd]);

  // ── Cálculo legado (atividades simples) ──
  const totalDias = useMemo(() => {
    const etapas = new Map();
    atividades.forEach((atividade) => {
      const etapa = String(atividade.etapa || "1");
      const dias = Number(atividade.dias || 0);
      etapas.set(etapa, Math.max(etapas.get(etapa) || 0, dias));
    });
    return Array.from(etapas.values()).reduce((acc: number, dias: number) => acc + dias, 0);
  }, [atividades]);

  const calculo = useMemo(() => {
    const startDate = parseDateBR(form.inicio);
    const releaseTargetDate = parseDateBR(form.releaseAlvo);
    if (!isValidDate(startDate) || !isValidDate(releaseTargetDate)) {
      return { timeline: [], atividadesCalculadas: [], validDays: [], endDate: startDate, inicioPacote: "" };
    }
    const validDays = getWorkingDays(startDate, totalDias, releases, feriados, diasParados);
    const etapasOrdenadas = Array.from(new Set(atividades.map((atividade) => String(atividade.etapa || "1")))).sort((a, b) => Number(a) - Number(b));

    let cursor = 0;
    const atividadesCalculadas: any[] = [];
    etapasOrdenadas.forEach((etapa) => {
      const atividadesDaEtapa = atividades.filter((atividade) => String(atividade.etapa || "1") === etapa);
      const maiorDuracaoDaEtapa = Math.max(...atividadesDaEtapa.map((atividade) => Number(atividade.dias || 0)));
      const inicioEtapa = validDays[cursor];
      atividadesDaEtapa.forEach((atividade) => {
        const dias = Number(atividade.dias || 0);
        atividadesCalculadas.push({
          ...atividade,
          dias,
          inicio: inicioEtapa,
          termino: validDays[cursor + dias - 1],
        });
      });
      cursor += maiorDuracaoDaEtapa;
    });

    const calculatedEndDate = validDays[validDays.length - 1];
    const chgDates = getChgDates(releaseTargetDate, form.chgDias, feriados);
    const endDate = isValidDate(releaseTargetDate) && releaseTargetDate > calculatedEndDate ? releaseTargetDate : calculatedEndDate;

    const originalTimelineData: Record<string, { tipo: string; color: string; isReleaseDay: boolean; isEsteiraPreProd: boolean; isChg: boolean }> = {};
    let currentOrig = startDate;
    while (isValidDate(currentOrig) && isValidDate(endDate) && currentOrig <= endDate) {
      let tipo = "";
      let color = COLORS.white;
      if (sameDateBR(currentOrig, releaseTargetDate)) { tipo = "Release alvo"; color = COLORS.releaseTarget; }
      else if (isParadoDay(currentOrig, diasParados, feriados, releases)) { tipo = "Projeto parado"; color = COLORS.blocked; }
      else if (isWeekend(currentOrig)) { tipo = "Fim de semana"; color = COLORS.weekend; }
      else if (isHoliday(currentOrig, feriados)) { tipo = "Feriado"; color = COLORS.holiday; }
      else if (isPostRelease(currentOrig, releases)) { tipo = "Tombamento"; color = COLORS.postRelease; }
      else {
        const activity = atividadesCalculadas.find((item) => isValidDate(item.inicio) && isValidDate(item.termino) && currentOrig >= item.inicio && currentOrig <= item.termino);
        tipo = getTimelineLabel(activity?.tipo, activity?.nome);
        color = getTimelineColor(activity?.tipo);
      }
      const dateKey = currentOrig.toISOString().split("T")[0];
      originalTimelineData[dateKey] = { tipo, color, isReleaseDay: isReleaseDay(currentOrig, releases), isEsteiraPreProd: isEsteiraPreProdDay(currentOrig, esteiraPreProdRanges), isChg: chgDates.some((d) => isSameDay(d, currentOrig)) };
      currentOrig = addDays(currentOrig, 1);
    }

    const timeline: TimelineDay[] = [];
    if (!isValidDate(endDate)) {
      return { validDays: [], atividadesCalculadas: [], timeline: [], endDate: startDate, inicioPacote: "" };
    }
    let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    while (currentMonth <= lastMonth) {
      const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        const dateInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dateKey = dateInMonth.toISOString().split("T")[0];
        const data = originalTimelineData[dateKey];
        timeline.push({ date: new Date(dateInMonth), tipo: data?.tipo || "", color: data?.color || COLORS.white, isReleaseDay: data?.isReleaseDay || false, isEsteiraPreProd: data?.isEsteiraPreProd || false, isChg: data?.isChg || false });
      }
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    }
    return { validDays, atividadesCalculadas, timeline, endDate };
  }, [form.inicio, form.releaseAlvo, form.chgDias, totalDias, releases, feriados, diasParados, atividades, esteiraPreProdRanges]);

  // ── Cálculo para aba Estimativa (baseado em pacotes) ──
  const atividadesDePacotes = useMemo(() => {
    return pacotes.flatMap((pacote) =>
      pacote.atividades.map((a) => ({
        id: a.id,
        nome: a.nome,
        dias: Math.max(1, Math.ceil(Number(a.horas || 0) / 8)),
        tipo: a.tipo,
        etapa: a.etapa,
      }))
    );
  }, [pacotes]);

  const totalDiasAtuacao = useMemo(() => {
    return pacotes.reduce((acc, pacote) => acc + calcTotalDiasAtuacaoPacote(pacote, feriados, releases, diasParados), 0);
  }, [pacotes, feriados, releases, diasParados]);

  const totalHorasOvertime = useMemo(() => {
    return pacotes.reduce((acc, pacote) => {
      const horasPorEtapa = new Map<string, number>();
      for (const a of pacote.atividades) {
        const etapa = String(a.etapa || "1");
        if (horasPorEtapa.has(etapa)) continue;
        const ot = a.overtime ?? { tombamentoDates: [], feriadoDates: [], fimDeSemanaDates: [] };
        const horasOT = a.horasOvertime ?? 0;
        horasPorEtapa.set(etapa, calcDiasOvertimeTotal(a.inicio, a.horas, horasOT, feriados, releases, ot) * 8);
      }
      return acc + Array.from(horasPorEtapa.values()).reduce((sum, v) => sum + v, 0);
    }, 0);
  }, [pacotes, feriados, releases]);

  const dataInicioPacotes = useMemo(() => {
    const dates = pacotes.flatMap((p) => p.atividades.map((a) => a.inicio)).filter((d) => {
      if (!d) return false;
      const parsed = parseDateBR(d);
      return isValidDate(parsed);
    });
    if (dates.length === 0) return null;
    return dates.reduce((min, d) => {
      const date = parseDateBR(d)!;
      const minDate = parseDateBR(min)!;
      return date < minDate ? d : min;
    });
  }, [pacotes]);

  const dataTerminoPacotes = useMemo(() => {
    const terminos = pacotes.flatMap((p) => p.atividades.map((a) => {
      const ot = a.overtime ?? { tombamentoDates: [], feriadoDates: [], fimDeSemanaDates: [] };
      const horasOT = a.horasOvertime ?? 0;
      return calcularTermino(a.inicio, a.horas, feriados, releases, ot, horasOT, diasParados);
    })).filter((t) => t && t !== "—");
    if (terminos.length === 0) return null;
    return terminos.reduce((max, d) => {
      const date = parseDateBR(d)!;
      const maxDate = parseDateBR(max)!;
      return date > maxDate ? d : max;
    });
  }, [pacotes, feriados, releases, diasParados]);

  const specialWorkDatesPacotes = useMemo(() => {
    const map: Record<string, string> = {};
    for (const pacote of pacotes) {
      for (const a of pacote.atividades) {
        const color = getTimelineColor(a.tipo);
        const ot = a.overtime
          ? { ...DEFAULT_OVERTIME, ...a.overtime }
          : DEFAULT_OVERTIME;
        const horasOT = a.horasOvertime ?? 0;
        const terminoStr = calcularTermino(a.inicio, Number(a.horas || 0), feriados, releases, ot, horasOT, diasParados);
        const inicioDate = parseDateBR(a.inicio);
        const terminoDate = parseDateBR(terminoStr);
        if (!isValidDate(inicioDate) || !isValidDate(terminoDate)) continue;

        const allDates = [...(ot.feriadoDates || []), ...(ot.fimDeSemanaDates || []), ...(ot.tombamentoDates || [])];
        for (const dateStr of allDates) {
          const parsed = parseDateBR(dateStr);
          if (!isValidDate(parsed)) continue;
          if (parsed < inicioDate || parsed > terminoDate) continue;
          const key = parsed.toISOString().split("T")[0];
          if (!map[key]) map[key] = color;
        }

        const isSpecial = isWeekend(inicioDate) || isHoliday(inicioDate, feriados) || isPostRelease(inicioDate, releases);
        if (isSpecial) {
          const key = inicioDate.toISOString().split("T")[0];
          if (!map[key]) map[key] = color;
        }
      }
    }
    return map;
  }, [pacotes, feriados, releases, diasParados]);

  const totalDiasPacotes = useMemo(() => {
    const etapas = new Map<string, number>();
    atividadesDePacotes.forEach((a) => {
      const etapa = String(a.etapa || "1");
      etapas.set(etapa, Math.max(etapas.get(etapa) ?? 0, Number(a.dias || 0)));
    });
    return Array.from(etapas.values()).reduce((acc, d) => acc + d, 0);
  }, [atividadesDePacotes]);

  const calculoPacotes = useMemo(() => {
    const startDate = parseDateBR(form.inicio);
    const releaseTargetDate = parseDateBR(form.releaseAlvo);
    if (!isValidDate(startDate) || !isValidDate(releaseTargetDate)) {
      return { timeline: [], atividadesCalculadas: [], validDays: [], endDate: startDate } as CalculoResult;
    }
    const validDays = getWorkingDays(startDate, totalDiasPacotes, releases, feriados, diasParados);
    const etapasOrdenadas = Array.from(new Set(atividadesDePacotes.map((a) => String(a.etapa || "1")))).sort((a, b) => Number(a) - Number(b));

    let cursor = 0;
    const atividadesCalculadas: any[] = [];
    etapasOrdenadas.forEach((etapa) => {
      const daDaEtapa = atividadesDePacotes.filter((a) => String(a.etapa || "1") === etapa);
      const maxDias = Math.max(...daDaEtapa.map((a) => Number(a.dias || 0)));
      const inicioEtapa = validDays[cursor];
      daDaEtapa.forEach((a) => {
        const dias = Number(a.dias || 0);
        atividadesCalculadas.push({ ...a, inicio: inicioEtapa, termino: validDays[cursor + dias - 1] });
      });
      cursor += maxDias;
    });

    const calculatedEndDate = validDays[validDays.length - 1];
    const chgDates = getChgDates(releaseTargetDate, form.chgDias, feriados);
    const endDate = isValidDate(releaseTargetDate) && releaseTargetDate > calculatedEndDate ? releaseTargetDate : calculatedEndDate;

    if (!isValidDate(endDate)) {
      return { validDays: [], atividadesCalculadas, timeline: [], endDate: startDate, inicioPacote: "" };
    }

    const originalTimelineData: Record<string, { tipo: string; color: string; isReleaseDay: boolean; isEsteiraPreProd: boolean; isChg: boolean }> = {};
    let currentOrig = startDate;
    while (isValidDate(currentOrig) && currentOrig <= endDate) {
      let tipo = "";
      let color = COLORS.white;
      if (sameDateBR(currentOrig, releaseTargetDate)) { tipo = "Release alvo"; color = COLORS.releaseTarget; }
      else if (isParadoDay(currentOrig, diasParados, feriados, releases)) { tipo = "Projeto parado"; color = COLORS.blocked; }
      else if (isWeekend(currentOrig)) { tipo = "Fim de semana"; color = COLORS.weekend; }
      else if (isHoliday(currentOrig, feriados)) { tipo = "Feriado"; color = COLORS.holiday; }
      else if (isPostRelease(currentOrig, releases)) { tipo = "Tombamento"; color = COLORS.postRelease; }
      else {
        const activity = atividadesCalculadas.find((item) => isValidDate(item.inicio) && isValidDate(item.termino) && currentOrig >= item.inicio && currentOrig <= item.termino);
        tipo = getTimelineLabel(activity?.tipo, activity?.nome);
        color = getTimelineColor(activity?.tipo);
      }
      const dateKey = currentOrig.toISOString().split("T")[0];
      originalTimelineData[dateKey] = { tipo, color, isReleaseDay: isReleaseDay(currentOrig, releases), isEsteiraPreProd: isEsteiraPreProdDay(currentOrig, esteiraPreProdRanges), isChg: chgDates.some((d) => isSameDay(d, currentOrig)) };
      currentOrig = addDays(currentOrig, 1);
    }

    const timeline: TimelineDay[] = [];
    let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    while (currentMonth <= lastMonth) {
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const key = d.toISOString().split("T")[0];
        const data = originalTimelineData[key];
        timeline.push({ date: new Date(d), tipo: data?.tipo || "", color: data?.color || COLORS.white, isReleaseDay: data?.isReleaseDay || false, isEsteiraPreProd: data?.isEsteiraPreProd || false, isChg: data?.isChg || false });
      }
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    }
    return { validDays, atividadesCalculadas, timeline, endDate };
  }, [form.inicio, form.releaseAlvo, form.chgDias, totalDiasPacotes, releases, feriados, diasParados, atividadesDePacotes, esteiraPreProdRanges]);

  // ── Preview para aba Estimativa ──
  const calculoPreviaPacotes = useMemo(() => {
    const firstAtiv = pacotes[0]?.atividades[0];
    const inicioPacote = firstAtiv?.inicio || "";
    const allInicioDates = pacotes
      .flatMap((p) => p.atividades.map((a) => parseDateBR(a.inicio)))
      .filter(isValidDate);
    const startDate = allInicioDates.length > 0
      ? new Date(Math.min(...allInicioDates.map((d: Date) => d.getTime())))
      : parseDateBR(inicioPacote);

    if (!isValidDate(startDate)) return { atividadesCalculadas: [], timeline: [], endDate: startDate, inicioPacote } as CalculoResult;

    const DEFAULT_OT = { tombamentoDates: [] as string[], feriadoDates: [] as string[], fimDeSemanaDates: [] as string[] };
    const atividadesCalculadas = pacotes.flatMap((pacote) =>
      pacote.atividades.map((a) => {
        const terminoStr = calcularTermino(a.inicio, Number(a.horas || 0), feriados, releases, a.overtime ? { ...DEFAULT_OT, ...a.overtime } : DEFAULT_OT, Number(a.horasOvertime || 0), diasParados);
        const dias = Math.max(1, Math.ceil(Number(a.horas || 0) / 8));
        return {
          id: a.id,
          nome: a.nome,
          tipo: a.tipo,
          dias,
          etapa: a.etapa,
          inicio: parseDateBR(a.inicio),
          termino: parseDateBR(terminoStr),
          pacoteId: pacote.id,
          pacoteNome: pacote.nome,
          pacoteCodigo: pacote.codigo,
        };
      }).filter((a) => isValidDate(a.inicio))
    );

    const terminoDates = atividadesCalculadas.map((a) => a.termino).filter(isValidDate);
    const endDate = terminoDates.length ? new Date(Math.max(...terminoDates.map((d) => d.getTime()))) : startDate;

    const releaseTargetDatePrevia = parseDateBR(form.releaseAlvo);
    const chgDates = getChgDates(releaseTargetDatePrevia, form.chgDias, feriados);
    const timelineEnd = isValidDate(releaseTargetDatePrevia) && releaseTargetDatePrevia > endDate ? releaseTargetDatePrevia : endDate;

    const originalTimelineData: Record<string, { tipo: string; color: string; isReleaseDay: boolean; isEsteiraPreProd: boolean; isChg: boolean }> = {};
    let currentOrig = new Date(startDate);
    while (isValidDate(currentOrig) && currentOrig <= timelineEnd) {
      let tipo = "";
      let color = COLORS.white;
      if (sameDateBR(currentOrig, releaseTargetDatePrevia)) { tipo = "Release alvo"; color = COLORS.releaseTarget; }
      else if (isParadoDay(currentOrig, diasParados, feriados, releases)) { tipo = "Projeto parado"; color = COLORS.blocked; }
      else if (isWeekend(currentOrig)) { tipo = "Fim de semana"; color = COLORS.weekend; }
      else if (isHoliday(currentOrig, feriados)) { tipo = "Feriado"; color = COLORS.holiday; }
      else if (isPostRelease(currentOrig, releases)) { tipo = "Tombamento"; color = COLORS.postRelease; }
      else {
        const activity = atividadesCalculadas.find((item) => isValidDate(item.inicio) && isValidDate(item.termino) && currentOrig >= item.inicio && currentOrig <= item.termino);
        tipo = getTimelineLabel(activity?.tipo, activity?.nome);
        color = getTimelineColor(activity?.tipo);
      }
      const dateKey = currentOrig.toISOString().split("T")[0];
      originalTimelineData[dateKey] = { tipo, color, isReleaseDay: isReleaseDay(currentOrig, releases), isEsteiraPreProd: isEsteiraPreProdDay(currentOrig, esteiraPreProdRanges), isChg: chgDates.some((d) => isSameDay(d, currentOrig)) };
      currentOrig = addDays(currentOrig, 1);
    }

    const timeline: TimelineDay[] = [];
    let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const lastMonth = new Date(timelineEnd.getFullYear(), timelineEnd.getMonth(), 1);
    while (currentMonth <= lastMonth) {
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const key = d.toISOString().split("T")[0];
        const data = originalTimelineData[key];
        timeline.push({ date: new Date(d), tipo: data?.tipo || "", color: data?.color || COLORS.white, isReleaseDay: data?.isReleaseDay || false, isEsteiraPreProd: data?.isEsteiraPreProd || false, isChg: data?.isChg || false });
      }
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    }

    return { atividadesCalculadas, timeline, endDate, inicioPacote, validDays: [] };
  }, [pacotes, feriados, releases, form.releaseAlvo, form.chgDias, diasParados, esteiraPreProdRanges]);

  // ── Formatação em blocos ──
  const releaseTargetDate = parseDateBR(form.releaseAlvo);

  const timelineRows = useMemo(() => {
    let filteredTimeline = calculo.timeline;
    if (isValidDate(releaseTargetDate)) {
      filteredTimeline = calculo.timeline.filter((day) => day.date <= releaseTargetDate);
    }
    const daysCount = filteredTimeline.length;
    const baseBlockSize = 15;
    const numBlocks = Math.ceil(daysCount / baseBlockSize);
    const daysPerBlock = Math.ceil(daysCount / numBlocks);
    const rows: TimelineDay[][] = [];
    for (let i = 0; i < numBlocks; i++) {
      const startIdx = i * daysPerBlock;
      const endIdx = Math.min(startIdx + daysPerBlock, daysCount);
      const row = filteredTimeline.slice(startIdx, endIdx);
      if (row.length > 0) {
        const hasActivity = row.some((day) => day.tipo !== "" || day.color !== COLORS.white);
        if (hasActivity) {
          if (row.length < daysPerBlock) {
            let currentDate = new Date(row[row.length - 1].date);
            for (let j = row.length; j < daysPerBlock; j++) {
              currentDate.setDate(currentDate.getDate() + 1);
              row.push({ date: new Date(currentDate), tipo: "", color: COLORS.white, isReleaseDay: false, isEsteiraPreProd: false, isChg: false });
            }
          }
          rows.push(row);
        }
      }
    }
    return rows;
  }, [calculo.timeline, releaseTargetDate]);

  const timelineRowsPacotes = useMemo(() => {
    let filteredTimeline = calculoPacotes.timeline;
    if (isValidDate(releaseTargetDate)) {
      filteredTimeline = calculoPacotes.timeline.filter((day) => day.date <= releaseTargetDate);
    }
    const daysCount = filteredTimeline.length;
    const baseBlockSize = 15;
    const numBlocks = Math.ceil(daysCount / baseBlockSize);
    const daysPerBlock = Math.ceil(daysCount / Math.max(numBlocks, 1));
    const rows: TimelineDay[][] = [];
    for (let i = 0; i < numBlocks; i++) {
      const startIdx = i * daysPerBlock;
      const endIdx = Math.min(startIdx + daysPerBlock, daysCount);
      const row = filteredTimeline.slice(startIdx, endIdx);
      if (row.length > 0) {
        const hasActivity = row.some((day) => day.tipo !== "" || day.color !== COLORS.white);
        if (hasActivity) {
          if (row.length < daysPerBlock) {
            let currentDate = new Date(row[row.length - 1].date);
            for (let j = row.length; j < daysPerBlock; j++) {
              currentDate.setDate(currentDate.getDate() + 1);
              row.push({ date: new Date(currentDate), tipo: "", color: COLORS.white, isReleaseDay: false, isEsteiraPreProd: false, isChg: false });
            }
          }
          rows.push(row);
        }
      }
    }
    return rows;
  }, [calculoPacotes.timeline, releaseTargetDate]);

  const timelineRowsPreviaPacotes = useMemo(() => {
    let filteredTimeline = calculoPreviaPacotes.timeline;
    const releaseTargetDatePrevia = parseDateBR(form.releaseAlvo);
    if (isValidDate(releaseTargetDatePrevia)) {
      filteredTimeline = filteredTimeline.filter((day) => day.date <= releaseTargetDatePrevia);
    }
    const daysCountPrev = filteredTimeline.length;
    if (daysCountPrev === 0) return [];
    const baseBlock = 15;
    const numBlocksPrev = Math.ceil(daysCountPrev / baseBlock);
    const daysPerBlockPrev = Math.ceil(daysCountPrev / Math.max(numBlocksPrev, 1));
    const rows: TimelineDay[][] = [];
    for (let i = 0; i < numBlocksPrev; i++) {
      const startIdx = i * daysPerBlockPrev;
      const endIdx = Math.min(startIdx + daysPerBlockPrev, daysCountPrev);
      const row = filteredTimeline.slice(startIdx, endIdx);
      if (row.length > 0) {
        const hasActivity = row.some((day) => day.tipo !== "" || day.color !== COLORS.white);
        if (hasActivity) {
          if (row.length < daysPerBlockPrev) {
            let currentDate = new Date(row[row.length - 1].date);
            for (let j = row.length; j < daysPerBlockPrev; j++) {
              currentDate.setDate(currentDate.getDate() + 1);
              row.push({ date: new Date(currentDate), tipo: "", color: COLORS.white, isReleaseDay: false, isEsteiraPreProd: false, isChg: false });
            }
          }
          rows.push(row.map((day) => {
            const key = (day.date as Date).toISOString().split("T")[0];
            const workBorderColor = specialWorkDatesPacotes[key];
            return workBorderColor ? { ...day, workBorderColor } : day;
          }));
        }
      }
    }
    return rows;
  }, [calculoPreviaPacotes.timeline, form.releaseAlvo, specialWorkDatesPacotes]);

  return {
    releases,
    feriados,
    diasParados,
    esteiraPreProdRanges,
    totalDias,
    calculo,
    timelineRows,
    atividadesDePacotes,
    totalDiasAtuacao,
    totalHorasOvertime,
    dataInicioPacotes,
    dataTerminoPacotes,
    specialWorkDatesPacotes,
    totalDiasPacotes,
    calculoPacotes,
    timelineRowsPacotes,
    calculoPreviaPacotes,
    timelineRowsPreviaPacotes,
  };
}
