import { holydaysYear, releasesYear } from '@/data';
import { COLORS, pdfStyles } from '../styles'

export function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Parse date from either ISO format (yyyy-mm-dd) or BR format (dd/mm/yyyy)
 * @param value - Date string to parse
 * @returns Parsed Date object or invalid date if parsing fails
 */
export function parseDateBR(value) {
  // Handle null/undefined/empty
  if (!value || typeof value !== 'string') {
    return new Date(NaN);
  }
  
  const cleanValue = String(value).trim().slice(0, 10);
  if (!cleanValue) {
    return new Date(NaN);
  }
  
  let year = NaN, month = NaN, day = NaN;
  
  // Try ISO format first (yyyy-mm-dd)
  if (cleanValue.includes("-")) {
    const parts = cleanValue.split("-").map(p => parseInt(p, 10));
    if (parts.length === 3 && !parts.some(isNaN)) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    }
  }
  // Fall back to BR format (dd/mm/yyyy)
  else if (cleanValue.includes("/")) {
    const parts = cleanValue.split("/").map(p => parseInt(p, 10));
    if (parts.length === 3 && !parts.some(isNaN)) {
      day = parts[0];
      month = parts[1];
      year = parts[2];
    }
  }
  
  // Only create date if all parts are valid numbers
  if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
    return new Date(year, month - 1, day);
  }
  
  return new Date(NaN);
}

export function isValidDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

export function formatBR(date) {
  if (!isValidDate(date)) return "";
  return date.toLocaleDateString("pt-BR");
}

export function sameDateBR(dateA, dateB) {
  return formatBR(dateA) === formatBR(dateB);
}

export function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function isWeekend(date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

export function normalizeDateList(value) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim().slice(0, 10))
    .filter(Boolean);
}
export function getTimelineBorder(day) {
  if (day.isChg) {
    return `3px solid ${COLORS.chg}`;
  }

  if (day.isEsteiraPreProd) {
    return `3px solid ${COLORS.esteiraPreProd}`;
  }

  return pdfStyles.timelineColorCell.border;
}

export function isPostRelease(date, releases) {
  return releases.some((release) => {
    const releaseDate = parseDateBR(release);
    if (!isValidDate(releaseDate)) return false;
    const firstBlockedDay = addDays(releaseDate, 1);
    const lastBlockedDay = addDays(releaseDate, 3);
    return date >= firstBlockedDay && date <= lastBlockedDay;
  });
}

export function isHoliday(date, holidays) {
  return holidays.some((holiday) => {
    const holidayDate = parseDateBR(holiday);
    return isValidDate(holidayDate) && sameDateBR(date, holidayDate);
  });
}
export function isReleaseDay(date, releases = []) {
  return releases.some((release) => {
    const releaseDate = parseDateBR(release);
    return isValidDate(releaseDate) && isSameDay(date, releaseDate);
  });
}
export function isBlockedDay(date, blockedDays = []) {
  return blockedDays.some((blockedDay) => {
    const blockedDate = parseDateBR(blockedDay);
    return isValidDate(blockedDate) && sameDateBR(date, blockedDate);
  });
}
export function parseDateRangeList(value) {
  return String(value || "")
    .split("\n")
    .map((line) => {
      const matches = line.match(/\d{2}\/\d{2}\/\d{4}/g);

      if (!matches || matches.length === 0) return null;

      const start = parseDateBR(matches[0]);
      const end = parseDateBR(matches[1] || matches[0]);

      return { start, end };
    })
    .filter((range) => range && isValidDate(range.start) && isValidDate(range.end));
}

export function isEsteiraPreProdDay(date, ranges = []) {
  return ranges.some(({ start, end }) => {
    return date >= start && date <= end;
  });
}

export function parseDiasParadosList(value) {
  return String(value || "")
    .split("\n")
    .map((line) => {
      const matches = line.match(/\d{2}\/\d{2}\/\d{4}/g);

      if (!matches || matches.length === 0) return null;

      const start = parseDateBR(matches[0]);
      const end = parseDateBR(matches[1] || matches[0]);

      return { start, end };
    })
    .filter((range) => range && isValidDate(range.start) && isValidDate(range.end));
}

export function isParadoDay(date, paradoRanges = [], holidays = [], releases = []) {
  // Ignore weekends, holidays, and post-release days
  if (isWeekend(date) || isHoliday(date, holidays) || isPostRelease(date, releases)) {
    return false;
  }

  return paradoRanges.some(({ start, end }) => {
    return date >= start && date <= end;
  });
}

export function getWorkingDays(startDate, totalDays, releases, holidays, paradoRanges = []) {
  const days = [];
  let current = new Date(startDate);
  let guard = 0;

  while (days.length < totalDays && guard < 500) {
    const blocked =
      isWeekend(current) ||
      isPostRelease(current, releases) ||
      isHoliday(current, holidays) ||
      isParadoDay(current, paradoRanges, holidays, releases);

    if (!blocked) days.push(new Date(current));

    current = addDays(current, 1);
    guard += 1;
  }

  return days;
}


export function getTimelineColor(activityType) {
  if (activityType === "desenvolvimento") return COLORS.desenvolvimento;
  if (activityType === "subida") return COLORS.subida;
  if (activityType === "testes") return COLORS.testes;
  return COLORS.white;
}

export function getTimelineLabel(activityType, activityName) {
  if (activityType === "desenvolvimento") return "Desenvolvimento";
  return activityName || "";
}
export function getChgDates(releaseDate, chgDias, holidays) {
  const total = Number(chgDias || 0);
  if (!isValidDate(releaseDate) || total <= 0) return [];

  const result = [];
  let current = addDays(releaseDate, -1);
  let guard = 0;

  while (result.length < total && guard < 365) {
    const blocked = isWeekend(current) || isHoliday(current, holidays);

    if (!blocked) {
      result.push(new Date(current));
    }

    current = addDays(current, -1);
    guard += 1;
  }

  return result;
}

export function defaultAtividades() {
  return [
    { id: "front-default", nome: "Desenvolvimento Front-end", dias: 1, tipo: "desenvolvimento", etapa: "1" },
    { id: "micro-default", nome: "Desenvolvimento Microserviço", dias: 1, tipo: "desenvolvimento", etapa: "1" },
    { id: "subida-default", nome: "Subida dos repositórios em pre prod", dias: 1, tipo: "subida", etapa: "2" },
    { id: "testes-default", nome: "Testes internos", dias: 1, tipo: "testes", etapa: "3" },
  ];
}

export function normalizeAtividades(items) {
  return items.map((item) => ({
    id: item.id || createId(),
    nome: item.nome || "Nova atividade",
    dias: item.dias || 1,
    tipo: item.tipo === "front" || item.tipo === "micro" ? "desenvolvimento" : item.tipo || "desenvolvimento",
    etapa: item.etapa ?? "1",
  }));
}

export function sanitizeFileName(value) {
  return String(value || "estimativa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "_") || "estimativa";
}

export function assertHexColor(value, label) {
  console.assert(/^#[0-9a-fA-F]{6}$/.test(value), `${label} deve estar em HEX para evitar erro de oklch no html2canvas`);
}
export function isSameDay(dateA, dateB) {
  return (
    dateA.getDate() === dateB.getDate() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getFullYear() === dateB.getFullYear()
  );
}

export function runSelfTests() {
  const releases = normalizeDateList(releasesYear);
  const holidays = normalizeDateList(holydaysYear);

  console.assert(isPostRelease(parseDateBR("18/05/2026"), releases), "18/05/2026 deve ser tombamento");
  console.assert(isPostRelease(parseDateBR("20/05/2026"), releases), "20/05/2026 deve ser tombamento");
  console.assert(!isPostRelease(parseDateBR("21/05/2026"), releases), "21/05/2026 não deve ser tombamento");
  console.assert(isHoliday(parseDateBR("01/05/2026"), holidays), "01/05/2026 deve ser feriado");
  console.assert(getTimelineColor("desenvolvimento") === COLORS.desenvolvimento, "Desenvolvimento deve usar cor correta");
  console.assert(getTimelineLabel("desenvolvimento", "Qualquer desenvolvimento") === "Desenvolvimento", "Timeline deve agrupar como Desenvolvimento");
  console.assert(normalizeAtividades([{ tipo: "front" }])[0].tipo === "desenvolvimento", "Tipo antigo front deve migrar para desenvolvimento");
  console.assert(normalizeAtividades([{ tipo: "micro" }])[0].tipo === "desenvolvimento", "Tipo antigo micro deve migrar para desenvolvimento");
  console.assert(sanitizeFileName("PTI-5598 - Teste Estimativa") === "PTI-5598_-_Teste_Estimativa", "Nome do PDF deve ser sanitizado");

  Object.entries(COLORS).forEach(([key, value]) => assertHexColor(value, key));

  const workingDays = getWorkingDays(parseDateBR(""), 1, releases, holidays);
  console.assert(formatBR(workingDays[0]) === "05/05/2026", "Primeiro dia útil deve ser 05/05/2026");
  console.assert(formatBR(workingDays[7]) === "14/05/2026", "Oitavo dia útil deve ser 14/05/2026");
}
export function defaultForm() {
  return {
    titulo: "PTI-",
    arquiteto: "Paulo Roberto Celestino Trindade",
    inicio: "",
    releaseAlvo: "",
    diasParados: "",
    esteiraPreProd: "",
    chgDias: "",
    releases: releasesYear,
    feriados: holydaysYear,
    pontos: "",
    premissas: "Necessário massa para testes internos e desenvolvimento",
    restricoes: "",
    observacoes: "",
  };
}