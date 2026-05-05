// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";



const STORAGE_KEY = "gerador-estimativa-template-v1";
const HISTORY_KEY = "historico-estimativas-v1";

const COLORS = {
  desenvolvimento: "#58bf63",
  subida: "#8e44ad",
  testes: "#4a90e2",
  weekend: "#bdbdbd",
  postRelease: "#ff6b6b",
  holiday: "#d32f2f",
  black: "#000000",
  white: "#ffffff",
  lightGray: "#e5e5e5",
  mediumGray: "#d4d4d4",
  orange: "#f97316",
  text: "#111111",
  blocked: "#000000",
  esteiraPreProd: "#f59e0b",
};

const RELEASES_2026 = [
  "11/01/2026",
  "08/02/2026",
  "08/03/2026",
  "12/04/2026",
  "17/05/2026",
  "14/06/2026",
  "12/07/2026",
  "16/08/2026",
  "13/09/2026",
  "11/10/2026",
  "08/11/2026",
  "13/12/2026",
].join("\n");

const FERIADOS_2026 = [
  "01/01/2026 - Confraternização Universal",
  "16/02/2026 - Carnaval",
  "17/02/2026 - Carnaval",
  "18/02/2026 - Quarta-feira de Cinzas",
  "03/04/2026 - Sexta-feira Santa",
  "21/04/2026 - Tiradentes",
  "01/05/2026 - Dia do Trabalho",
  "04/06/2026 - Corpus Christi",
  "07/09/2026 - Independência do Brasil",
  "12/10/2026 - Nossa Senhora Aparecida",
  "02/11/2026 - Finados",
  "15/11/2026 - Proclamação da República",
  "20/11/2026 - Consciência Negra",
  "25/12/2026 - Natal",
].join("\n");

const weekLabels = ["D", "S", "T", "Q", "Q", "S", "S"];

const pdfStyles = {
  page: {
    width: "794px",
    minHeight: "1123px",
    backgroundColor: COLORS.white,
    color: COLORS.text,
    padding: "32px",
    boxSizing: "border-box",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: "12px",
  },
  blackBar: {
    backgroundColor: COLORS.black,
    color: COLORS.white,
    padding: "6px 10px",
    fontWeight: 700,
    fontSize: "13px",
  },
  header: {
    backgroundColor: COLORS.black,
    color: COLORS.white,
    padding: "20px",
  },
  title: {
    marginTop: "16px",
    textAlign: "center",
    color: COLORS.orange,
    fontSize: "24px",
    fontWeight: 700,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
  },
  infoCell: {
    border: `1px solid ${COLORS.black}`,
    backgroundColor: COLORS.lightGray,
    padding: "8px",
    verticalAlign: "top",
  },
  th: {
    border: `1px solid ${COLORS.white}`,
    backgroundColor: COLORS.mediumGray,
    padding: "8px",
    textAlign: "left",
    fontWeight: 700,
  },
  thCenter: {
    border: `1px solid ${COLORS.white}`,
    backgroundColor: COLORS.mediumGray,
    padding: "8px",
    textAlign: "center",
    fontWeight: 700,
  },
  td: {
    border: `1px solid ${COLORS.white}`,
    backgroundColor: COLORS.lightGray,
    padding: "8px",
  },
  tdCenter: {
    border: `1px solid ${COLORS.white}`,
    backgroundColor: COLORS.lightGray,
    padding: "8px",
    textAlign: "center",
    fontSize: "16px",
  },
  sectionContent: {
    backgroundColor: COLORS.lightGray,
    fontSize: "12px",
  },
  sectionLine: {
    borderBottom: `1px solid ${COLORS.white}`,
    padding: "5px 10px",
  },
  timelineTable: {
    margin: "0 auto 6px auto",
    borderCollapse: "collapse",
    fontSize: "12px",
  },
  timelineCell: {
    width: "32px",
    height: "26px",
    border: "1px solid #333",
    verticalAlign: "middle",
    textAlign: "center",
    boxSizing: "border-box",
    padding: 0,
    lineHeight: "26px",
    fontSize: "11px",
    fontWeight: 500,
    color: "#222",
  },
  timelineWeekCell: {
    width: "32px",
    height: "24px",
    border: "1px solid #333",
    verticalAlign: "middle",
    textAlign: "center",
    boxSizing: "border-box",
    padding: 0,
    lineHeight: "24px",
    fontSize: "10px",
    fontWeight: 500,
    color: "#555",
  },
  timelineColorCell: {
    width: "32px",
    height: "20px",
    border: "1px solid #333",
    boxSizing: "border-box",
    padding: 0,
  },
  legendWrapper: {
    marginTop: "20px",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "20px",
    fontSize: "12px",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  legendBox: {
    width: "28px",
    height: "28px",
    border: `1px solid ${COLORS.black}`,
    display: "inline-block",
  },
};

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseDateBR(value) {
  const cleanValue = String(value || "").trim().slice(0, 10);
  const [day, month, year] = cleanValue.split("/").map(Number);
  return new Date(year, month - 1, day);
}

function isValidDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function formatBR(date) {
  if (!isValidDate(date)) return "";
  return date.toLocaleDateString("pt-BR");
}

function sameDateBR(dateA, dateB) {
  return formatBR(dateA) === formatBR(dateB);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function isWeekend(date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

function normalizeDateList(value) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim().slice(0, 10))
    .filter(Boolean);
}

function isPostRelease(date, releases) {
  return releases.some((release) => {
    const releaseDate = parseDateBR(release);
    if (!isValidDate(releaseDate)) return false;
    const firstBlockedDay = addDays(releaseDate, 1);
    const lastBlockedDay = addDays(releaseDate, 3);
    return date >= firstBlockedDay && date <= lastBlockedDay;
  });
}

function isHoliday(date, holidays) {
  return holidays.some((holiday) => {
    const holidayDate = parseDateBR(holiday);
    return isValidDate(holidayDate) && sameDateBR(date, holidayDate);
  });
}
function isBlockedDay(date, blockedDays = []) {
  return blockedDays.some((blockedDay) => {
    const blockedDate = parseDateBR(blockedDay);
    return isValidDate(blockedDate) && sameDateBR(date, blockedDate);
  });
}
function parseDateRangeList(value) {
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

function isEsteiraPreProdDay(date, ranges = []) {
  return ranges.some(({ start, end }) => {
    return date >= start && date <= end;
  });
}

function getWorkingDays(startDate, totalDays, releases, holidays, blockedDays = []) {
  const days = [];
  let current = new Date(startDate);
  let guard = 0;

  while (days.length < totalDays && guard < 500) {
    const blocked =
      isWeekend(current) ||
      isPostRelease(current, releases) ||
      isHoliday(current, holidays) ||
      isBlockedDay(current, blockedDays);

    if (!blocked) days.push(new Date(current));

    current = addDays(current, 1);
    guard += 1;
  }

  return days;
}

function getTimelineColor(activityType) {
  if (activityType === "desenvolvimento") return COLORS.desenvolvimento;
  if (activityType === "subida") return COLORS.subida;
  if (activityType === "testes") return COLORS.testes;
  return COLORS.white;
}

function getTimelineLabel(activityType, activityName) {
  if (activityType === "desenvolvimento") return "Desenvolvimento";
  return activityName || "";
}

function defaultForm() {
  return {
    titulo: "PTI-5598 - Teste Estimativa",
    arquiteto: "Paulo Roberto Celestino Trindade",
    inicio: "05/05/2026",
    releaseAlvo: "",
    diasParados: "",
    esteiraPreProd: "",
    releases: RELEASES_2026,
    feriados: FERIADOS_2026,
    pontos: "Necessário massa para testes internos e desenvolvimento\nNecessário UX definido",
    premissas: "Atividades consideradas sequenciais para este teste\nFinal de semana, feriado e tombamento não contabilizam como desenvolvimento",
    restricoes: "Não foram informados feriados municipais/estaduais para este teste",
  };
}

function defaultAtividades() {
  return [
    { id: "front-default", nome: "Desenvolvimento Front-end", dias: 8, tipo: "desenvolvimento", etapa: "1" },
    { id: "micro-default", nome: "Desenvolvimento Microserviço", dias: 8, tipo: "desenvolvimento", etapa: "1" },
    { id: "subida-default", nome: "Subida dos repositórios em pre prod", dias: 3, tipo: "subida", etapa: "2" },
    { id: "testes-default", nome: "Testes internos", dias: 3, tipo: "testes", etapa: "3" },
  ];
}

function normalizeAtividades(items) {
  return items.map((item) => ({
    id: item.id || createId(),
    nome: item.nome || "Nova atividade",
    dias: item.dias || 1,
    tipo: item.tipo === "front" || item.tipo === "micro" ? "desenvolvimento" : item.tipo || "desenvolvimento",
    etapa: item.etapa ?? "1",
  }));
}

function sanitizeFileName(value) {
  return String(value || "estimativa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "_") || "estimativa";
}

function assertHexColor(value, label) {
  console.assert(/^#[0-9a-fA-F]{6}$/.test(value), `${label} deve estar em HEX para evitar erro de oklch no html2canvas`);
}

function runSelfTests() {
  const releases = normalizeDateList(RELEASES_2026);
  const holidays = normalizeDateList(FERIADOS_2026);

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

  const workingDays = getWorkingDays(parseDateBR("05/05/2026"), 8, releases, holidays);
  console.assert(formatBR(workingDays[0]) === "05/05/2026", "Primeiro dia útil deve ser 05/05/2026");
  console.assert(formatBR(workingDays[7]) === "14/05/2026", "Oitavo dia útil deve ser 14/05/2026");
}


if (typeof window !== "undefined") runSelfTests();

export default function GeradorEstimativaPDF() {
  const [form, setForm] = useState(defaultForm);
  const [atividades, setAtividades] = useState(defaultAtividades);
  const [status, setStatus] = useState("");
  const [historico, setHistorico] = useState<any[]>([]);
  function salvarEstimativa() {
    const novaEstimativa = {
      id: String(Date.now()),
      createdAt: new Date().toLocaleString("pt-BR"),
      form,
      atividades,
    };

    const historicoAtualizado = [novaEstimativa, ...historico];

    setHistorico(historicoAtualizado);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(historicoAtualizado));
    setStatus("Estimativa salva no histórico.");
  }

  function carregarEstimativa(item: any) {
    setForm({ ...defaultForm(), ...item.form });
    setAtividades(normalizeAtividades(item.atividades || []));
    setStatus("Estimativa carregada.");
  }

  function excluirEstimativa(id: string) {
    const historicoAtualizado = historico.filter((item) => item.id !== id);

    setHistorico(historicoAtualizado);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(historicoAtualizado));
    setStatus("Estimativa excluída do histórico.");
  }

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_KEY);

      if (savedHistory) {
        setHistorico(JSON.parse(savedHistory));
      }
    } catch {
      setStatus("Não foi possível carregar o histórico.");
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed.form) setForm({ ...defaultForm(), ...parsed.form });
      if (Array.isArray(parsed.atividades)) setAtividades(normalizeAtividades(parsed.atividades));
    } catch {
      setStatus("Não foi possível carregar o template salvo.");
    }
  }, []);

  const releases = useMemo(() => normalizeDateList(form.releases), [form.releases]);
  const feriados = useMemo(() => normalizeDateList(form.feriados), [form.feriados]);
  const diasParados = useMemo(
    () => normalizeDateList(form.diasParados || ""),
    [form.diasParados]);
  const esteiraPreProdRanges = useMemo(
    () => parseDateRangeList(form.esteiraPreProd || ""),
    [form.esteiraPreProd]
  );

  const totalDias = useMemo(() => {
    const etapas = new Map();
    atividades.forEach((atividade) => {
      const etapa = String(atividade.etapa || "1");
      const dias = Number(atividade.dias || 0);
      etapas.set(etapa, Math.max(etapas.get(etapa) || 0, dias));
    });
    return Array.from(etapas.values()).reduce((acc, dias) => acc + dias, 0);
  }, [atividades]);

  const calculo = useMemo(() => {
    const startDate = parseDateBR(form.inicio);
    const validDays = getWorkingDays(startDate, totalDias, releases, feriados, diasParados);
    const etapasOrdenadas = Array.from(new Set(atividades.map((atividade) => String(atividade.etapa || "1")))).sort((a, b) => Number(a) - Number(b));

    let cursor = 0;
    const atividadesCalculadas = [];

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

    const timeline = [];
    let current = startDate;
    const endDate = validDays[validDays.length - 1];

    while (isValidDate(current) && isValidDate(endDate) && current <= endDate) {
      let tipo = "";
      let color = COLORS.white;

      if (isBlockedDay(current, diasParados)) {
        tipo = "Projeto parado";
        color = COLORS.blocked;
      } else if (isWeekend(current)) {
        tipo = "Fim de semana";
        color = COLORS.weekend;
      }
      else if (isHoliday(current, feriados)) {
        tipo = "Feriado";
        color = COLORS.holiday;
      } else if (isPostRelease(current, releases)) {
        tipo = "Tombamento";
        color = COLORS.postRelease;
      } else {
        const activity = atividadesCalculadas.find((item) => {
          return isValidDate(item.inicio) && isValidDate(item.termino) && current >= item.inicio && current <= item.termino;
        });

        tipo = getTimelineLabel(activity?.tipo, activity?.nome);
        color = getTimelineColor(activity?.tipo);
      }

      timeline.push({
        date: new Date(current),
        tipo,
        color,
        isEsteiraPreProd: isEsteiraPreProdDay(current, esteiraPreProdRanges),
      });

      
      current = addDays(current, 1);
    }

    return { validDays, atividadesCalculadas, timeline, endDate };
  }, [form.inicio, totalDias, releases, feriados, diasParados, esteiraPreProdRanges, atividades]);;

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateAtividade(id, field, value) {
    setAtividades((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function addAtividade() {
    setAtividades((prev) => [...prev, { id: createId(), nome: "Nova atividade", dias: 1, tipo: "desenvolvimento", etapa: "1" }]);
  }

  function removeAtividade(id) {
    setAtividades((prev) => prev.filter((item) => item.id !== id));
  }

  function moveAtividade(id, direction) {
    setAtividades((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  }

  function salvarTemplate() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, atividades }));
    setStatus("Template salvo no navegador.");
  }

  function restaurarPadrao() {
    setForm(defaultForm());
    setAtividades(defaultAtividades());
    setStatus("Template padrão restaurado.");
  }

  async function criarPDF() {
    const element = document.getElementById("pdf-area");
    if (!element) {
      throw new Error("Área do PDF não encontrada.");
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      onclone: (doc) => {
        doc.documentElement.classList.remove("dark");

        // Remove CSS global do Tailwind/shadcn no clone
        doc.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
          node.remove();
        });

        // Reaplica somente uma base segura em HEX
        const safeStyle = doc.createElement("style");
        safeStyle.innerHTML = `
      html, body {
        margin: 0;
        background: #ffffff !important;
        color: #111111 !important;
        font-family: Arial, Helvetica, sans-serif !important;
      }

      table {
        border-collapse: collapse;
      }

      *, *::before, *::after {
        box-sizing: border-box;
      }
    `;
        doc.head.appendChild(safeStyle);

        const cloned = doc.getElementById("pdf-area");
        if (!cloned) return;

        cloned.style.backgroundColor = "#ffffff";
        cloned.style.color = "#111111";
      },
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf;
  }

  async function gerarPDF() {
    try {
      setStatus("Gerando PDF...");
      const pdf = await criarPDF();
      pdf.save(sanitizeFileName(form.titulo) + ".pdf");
      setStatus("PDF baixado com sucesso.");
    } catch (error) {
      console.error(error);
      setStatus("Não foi possível gerar o PDF. Verifique se a biblioteca html2canvas está instalada.");
    }
  }

  async function gerarPDFCalendario() {
    try {
      setStatus("Gerando PDF do calendário...");

      const element = document.getElementById("calendar-area");

      if (!element) {
        setStatus("Área do calendário não encontrada.");
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        onclone: (doc) => {
          // remove dark mode
          doc.documentElement.classList.remove("dark");

          // remove CSS global (onde está o oklch)
          doc.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
            node.remove();
          });

          // adiciona CSS seguro
          const safeStyle = doc.createElement("style");
          safeStyle.innerHTML = `
          html, body {
            margin: 0;
            background: #ffffff !important;
            color: #111111 !important;
            font-family: Arial, Helvetica, sans-serif !important;
          }

          table {
            border-collapse: collapse;
          }

          *, *::before, *::after {
            box-sizing: border-box;
          }
        `;
          doc.head.appendChild(safeStyle);

          const cloned = doc.getElementById("calendar-area");
          if (!cloned) return;

          cloned.style.backgroundColor = "#ffffff";
          cloned.style.color = "#111111";
        },
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`${sanitizeFileName(form.titulo)}_calendario.pdf`);

      setStatus("PDF do calendário gerado com sucesso.");
    } catch (error) {
      console.error(error);
      setStatus("Não foi possível gerar o PDF do calendário.");
    }
  }

  async function abrirPDF() {
    try {
      setStatus("Abrindo PDF...");
      const pdf = await criarPDF();
      const blob = pdf.output("blob");
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setStatus("PDF aberto em uma nova aba.");
    } catch (error) {
      console.error(error);
      setStatus("Não foi possível abrir o PDF no navegador.");
    }
  }

  const timelineRows = [];
  for (let i = 0; i < calculo.timeline.length; i += 18) {
    timelineRows.push(calculo.timeline.slice(i, i + 18));
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[400px_1fr]">
        <Card className="print:hidden">
          <CardContent className="space-y-4 p-5">
            <h1 className="text-xl font-bold">Gerador de estimativa</h1>

            <Input value={form.titulo} onChange={(event) => updateForm("titulo", event.target.value)} />
            <Input value={form.arquiteto} onChange={(event) => updateForm("arquiteto", event.target.value)} />
            <Input value={form.inicio} onChange={(event) => updateForm("inicio", event.target.value)} placeholder="Data de início (dd/mm/aaaa)" />
            <Input value={form.releaseAlvo || ""} onChange={(event) => updateForm("releaseAlvo", event.target.value)} placeholder="Release alvo (dd/mm/aaaa)" />

            <Textarea className="min-h-40" value={form.releases} onChange={(event) => updateForm("releases", event.target.value)} placeholder="Releases, uma por linha" />
            <Textarea className="min-h-56" value={form.feriados} onChange={(event) => updateForm("feriados", event.target.value)} placeholder="Feriados, um por linha. Ex: 01/01/2026 - Nome do feriado" />
            <Textarea value={form.pontos} onChange={(event) => updateForm("pontos", event.target.value)} placeholder="Pontos de atenção" />
            <Textarea value={form.premissas} onChange={(event) => updateForm("premissas", event.target.value)} placeholder="Premissas" />
            <Textarea value={form.restricoes} onChange={(event) => updateForm("restricoes", event.target.value)} placeholder="Restrições" />
            <Textarea className="min-h-32" value={form.diasParados || ""} onChange={(event) => updateForm("diasParados", event.target.value)} placeholder="Dias parados, um por linha. Ex: 10/05/2026 - Aguardando UX" />
            <Textarea
              className="min-h-32"
              value={form.esteiraPreProd || ""}
              onChange={(event) => updateForm("esteiraPreProd", event.target.value)}
              placeholder="Esteira Pre Prod, um período por linha. Ex: 10/05/2026 - 15/05/2026"
            />
            <div className="space-y-3">
              <h2 className="font-semibold">Atividades</h2>
              {atividades.map((atividade, index) => (
                <div key={atividade.id} className="grid grid-cols-[1fr_70px] gap-2 rounded-lg border p-2">
                  <Input value={atividade.nome} onChange={(event) => updateAtividade(atividade.id, "nome", event.target.value)} />
                  <Input type="number" min="1" value={atividade.dias} onChange={(event) => updateAtividade(atividade.id, "dias", event.target.value)} />
                  <Input className="col-span-2" value={atividade.etapa ?? ""} onChange={(event) => updateAtividade(atividade.id, "etapa", event.target.value)} placeholder="Etapa. Ex: 1 para atividades paralelas" />
                  <select className="col-span-2 rounded border p-2" value={atividade.tipo} onChange={(event) => updateAtividade(atividade.id, "tipo", event.target.value)}>
                    <option value="desenvolvimento">Desenvolvimento</option>
                    <option value="subida">Subida Pre Prod</option>
                    <option value="testes">Testes internos</option>
                  </select>
                  <div className="col-span-2 grid grid-cols-3 gap-2">
                    <Button variant="outline" disabled={index === 0} onClick={() => moveAtividade(atividade.id, -1)}>Subir</Button>
                    <Button variant="outline" disabled={index === atividades.length - 1} onClick={() => moveAtividade(atividade.id, 1)}>Descer</Button>
                    <Button variant="outline" onClick={() => removeAtividade(atividade.id)}>Remover</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addAtividade}>Adicionar atividade</Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={salvarTemplate}>Salvar template</Button>
              <Button variant="outline" onClick={restaurarPadrao}>Restaurar padrão</Button>
            </div>
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Histórico</h2>

                <Button variant="outline" onClick={salvarEstimativa}>
                  Salvar estimativa
                </Button>
              </div>

              {historico.length === 0 && (
                <p className="text-sm text-zinc-500">
                  Nenhuma estimativa salva.
                </p>
              )}

              {historico.map((item) => (
                <div
                  key={item.id}
                  className="space-y-2 rounded-md border bg-white p-3 text-sm"
                >
                  <div>
                    <strong>{item.form?.titulo || "Estimativa sem título"}</strong>
                    <p className="text-xs text-zinc-500">{item.createdAt}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={() => carregarEstimativa(item)}>
                      Carregar
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => excluirEstimativa(item.id)}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {status && <p className="text-xs text-zinc-600">{status}</p>}
            <div className="grid grid-cols-2 gap-2">
              <Button className="w-full" onClick={abrirPDF}>Abrir PDF</Button>
              <Button className="w-full" onClick={gerarPDF}>Baixar PDF</Button>
              <Button className="w-full col-span-2" onClick={gerarPDFCalendario}>
                Baixar PDF Calendário
              </Button>

            </div>
          </CardContent>
        </Card>

        <PdfPreview
          form={form}
          totalDias={totalDias}
          calculo={calculo}
          timelineRows={timelineRows}
        />
        <div
          id="calendar-area"
          style={{
            position: "absolute",
            left: "-9999px",
            top: 0,
            width: "1123px",
            backgroundColor: COLORS.white,
            padding: "32px",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          <div style={pdfStyles.header}>
            <div style={{ fontSize: "13px", fontWeight: 700 }}>
              LINHA DO TEMPO
            </div>
            <div style={pdfStyles.title}>{form.titulo}</div>
          </div>

          <div style={{ marginTop: "20px" }}>
            {timelineRows.map((row, rowIndex) => (
              <table key={`calendar-${rowIndex}`} style={pdfStyles.timelineTable}>
                <tbody>
                  <tr>
                    {row.map((day, index) => (
                      <td key={`cal-week-${rowIndex}-${index}`} style={pdfStyles.timelineCell}>
                        {weekLabels[day.date.getDay()]}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    {row.map((day, index) => (
                      <td key={`cal-day-${rowIndex}-${index}`} style={pdfStyles.timelineWeekCell}>
                        {String(day.date.getDate()).padStart(2, "0")}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    {row.map((day, index) => (
                      <td
                        key={`cal-color-${rowIndex}-${index}`}
                        title={day.isEsteiraPreProd ? `${day.tipo} + Esteira Pre Prod` : day.tipo}
                        style={{
                          ...pdfStyles.timelineColorCell,
                          backgroundColor: day.color,
                          border: day.isEsteiraPreProd
                            ? `3px solid ${COLORS.esteiraPreProd}`
                            : pdfStyles.timelineColorCell.border,
                        }}
                      />
                    ))}
                  </tr>
                </tbody>
              </table>
            ))}
          </div>

          <div style={pdfStyles.legendWrapper}>
            <Legend color={COLORS.desenvolvimento} label="Desenvolvimento" />
            <Legend color={COLORS.subida} label="Subida em Pre Prod" />
            <Legend color={COLORS.testes} label="QA Compass" />
            <Legend color={COLORS.weekend} label="Fim de semana" />
            <Legend color={COLORS.postRelease} label="Tombamento" />
            <Legend color={COLORS.holiday} label="Feriado" />
            <Legend color={COLORS.blocked} label="Projeto parado" />
            <Legend color={COLORS.esteiraPreProd} label="Esteira Pre Prod" />
          </div>
        </div>
      </div>
    </div>
  );
}


function PdfPreview({ form, totalDias, calculo, timelineRows }) {
  return (
    <div id="pdf-area" style={pdfStyles.page}>
      <div style={pdfStyles.header}>
        <div style={{ fontSize: "13px", fontWeight: 700 }}>ESTIMATIVA DE DESENVOLVIMENTO</div>
        <div style={pdfStyles.title}>{form.titulo}</div>
      </div>

      <table style={{ ...pdfStyles.table, marginTop: "16px" }}>
        <tbody>
          <tr>
            <td style={pdfStyles.infoCell}><b>ARQUITETO:</b> {form.arquiteto}</td>
            <td style={pdfStyles.infoCell}><b>INICIO:</b> {form.inicio}</td>
            <td style={pdfStyles.infoCell}><b>TERMINO:</b> {formatBR(calculo.endDate)}</td>
          </tr>
          <tr>
            <td style={pdfStyles.infoCell}><b>ESFORCO:</b> {totalDias} dias úteis</td>
            <td style={pdfStyles.infoCell} colSpan={2}><b>RELEASE ALVO:</b> {form.releaseAlvo || "-"}</td>
          </tr>
        </tbody>
      </table>

      <Section title="PONTOS DE ATENCAO" text={form.pontos} />
      <Section title="PREMISSAS" text={form.premissas} />
      <Section title="RESTRICOES" text={form.restricoes} />

      <div style={{ ...pdfStyles.blackBar, marginTop: "16px" }}>ATIVIDADES</div>
      <table style={pdfStyles.table}>
        <thead>
          <tr>
            <th style={pdfStyles.th}>TAREFA</th>
            <th style={pdfStyles.thCenter}>DIAS ÚTEIS</th>
            <th style={pdfStyles.thCenter}>ETAPA</th>
            <th style={pdfStyles.thCenter}>INÍCIO</th>
            <th style={pdfStyles.thCenter}>TÉRMINO</th>
          </tr>
        </thead>
        <tbody>
          {calculo.atividadesCalculadas.map((atividade) => (
            <tr key={atividade.id}>
              <td style={pdfStyles.td}>{atividade.nome}</td>
              <td style={pdfStyles.tdCenter}>{atividade.dias}</td>
              <td style={pdfStyles.tdCenter}>{atividade.etapa}</td>
              <td style={pdfStyles.tdCenter}>{formatBR(atividade.inicio)}</td>
              <td style={pdfStyles.tdCenter}>{formatBR(atividade.termino)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ ...pdfStyles.blackBar, marginTop: "20px" }}>LINHA DO TEMPO</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
        {timelineRows.map((row, rowIndex) => (
          <table key={`timeline-${rowIndex}`} style={pdfStyles.timelineTable}>
            <tbody>
              <tr>
                {row.map((day, index) => (
                  <td key={`week-${rowIndex}-${index}`} style={pdfStyles.timelineCell}>{weekLabels[day.date.getDay()]}</td>
                ))}
              </tr>
              <tr>
                {row.map((day, index) => (
                  <td key={`day-${rowIndex}-${index}`} style={pdfStyles.timelineWeekCell}>{String(day.date.getDate()).padStart(2, "0")}</td>
                ))}
              </tr>
              <tr>
                {row.map((day, index) => (
                  <td
                    key={`color-${rowIndex}-${index}`}
                    title={day.isEsteiraPreProd ? `${day.tipo} + Esteira Pre Prod` : day.tipo}
                    style={{
                      ...pdfStyles.timelineColorCell,
                      backgroundColor: day.color,
                      border: day.isEsteiraPreProd
                        ? `3px solid ${COLORS.esteiraPreProd}`
                        : pdfStyles.timelineColorCell.border,
                    }}
                  />
                ))}
              </tr>
            </tbody>
          </table>
        ))}
      </div>

      <div style={pdfStyles.legendWrapper}>
        <Legend color={COLORS.desenvolvimento} label="Desenvolvimento" />
        <Legend color={COLORS.subida} label="Subida em Pre Prod" />
        <Legend color={COLORS.testes} label="QA Compass" />
        <Legend color={COLORS.weekend} label="Fim de semana" />
        <Legend color={COLORS.postRelease} label="Tombamento" />
        <Legend color={COLORS.holiday} label="Feriado" />
        <Legend color={COLORS.blocked} label="Projeto Impactado" />
        <Legend color={COLORS.esteiraPreProd} label="Esteira Pre Prod" />
      </div>
    </div>

  );
}



function Section({ title, text }) {
  return (
    <div style={{ marginTop: "16px" }}>
      <div style={pdfStyles.blackBar}>{title}</div>
      <div style={pdfStyles.sectionContent}>
        {String(text || "").split("\n").filter(Boolean).map((line, index) => (
          <div key={`${title}-${index}`} style={pdfStyles.sectionLine}>{line}</div>
        ))}
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div style={pdfStyles.legendItem}>
      <span style={{ ...pdfStyles.legendBox, backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}



