import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, FileText, DollarSign } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { COLORS } from './styles';
import { STORAGE_KEY } from './data';
import { PdfPreview } from "./components/pdf-preview";
import { DatePicker } from "./components/date-picker";
import { DateRangeList } from "./components/date-range-list";
import { FormField } from "./components/form-field";
import { AtividadesList } from "./components/atividades-list";
import { EstimativaHistorico } from "./components/estimativa-historico";
import {
  addDays,
  createId,
  isValidDate,
  isWeekend,
  normalizeDateList,
  parseDateBR,
  sameDateBR,
  getChgDates,
  getTimelineColor,
  getTimelineLabel,
  getWorkingDays,
  isBlockedDay,
  isEsteiraPreProdDay,
  isHoliday,
  isPostRelease,
  parseDateRangeList,
  parseDiasParadosList,
  isParadoDay,
  defaultAtividades,
  isSameDay,
  normalizeAtividades,
  runSelfTests,
  sanitizeFileName,
  defaultForm,
  isReleaseDay
} from './utils';
import { TimeLine } from "./components/time-line";
import { CalculoFinanceiro } from "./components/calculo-financeiro";
import { useAuth } from "./hooks/useAuth";
import { useEstimativas } from "./hooks/useEstimativas";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AuthPage } from "./components/auth/AuthPage";
import { EstimativaPacotesTable, calcularTermino, calcDiasOvertimeTotal, calcTotalDiasAtuacaoPacote } from "./components/estimativa-pacotes";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { Pacote, PacoteAtividade } from "./components/estimativa-pacotes";

if (typeof window !== "undefined") runSelfTests();

function GeradorEstimativaPDF({ page, setPage, openSettings, setOpenSettings }: {
  page: "estimativa" | "estimativa-rapida" | "financeiro";
  setPage: (p: "estimativa" | "estimativa-rapida" | "financeiro") => void;
  openSettings: boolean;
  setOpenSettings: (v: boolean) => void;
}) {
  const { estimativas, listar, criar, deletar, buscarComFiltros } = useEstimativas();
  const [form, setForm] = useState(defaultForm);
  const [atividades, setAtividades] = useState(defaultAtividades);
  const [status, setStatus] = useState("");
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState<"arquiteto" | "demanda">("arquiteto");
  const [valorFiltro, setValorFiltro] = useState("");
  const [estimativaFinanceiro, setEstimativaFinanceiro] = useState<any | null>(null);
  const [estimativasFiltradas, setEstimativasFiltradas] = useState<any[]>([]);
  const [carregandoFiltro, setCarregandoFiltro] = useState(false);

  // ── Estado de Pacotes (aba Estimativa detalhada) ──
  const [pacotes, setPacotes] = useState<Pacote[]>(() => defaultPacotes());

  function defaultPacotes(): Pacote[] {
    return [
      {
        id: createId(),
        codigo: "PTI-",
        nome: "Novo pacote",
        collapsed: false,
        atividades: [
          { id: createId(), demanda: "", nome: "Desenvolvimento Front-end", horas: 8, horasOvertime: 0, tipo: "desenvolvimento", etapa: "1", inicio: "", overtime: { tombamentoDates: [], feriadoDates: [], fimDeSemanaDates: [] } },
          { id: createId(), demanda: "", nome: "Desenvolvimento Microserviço", horas: 8, horasOvertime: 0, tipo: "desenvolvimento", etapa: "1", inicio: "", overtime: { tombamentoDates: [], feriadoDates: [], fimDeSemanaDates: [] } },
          { id: createId(), demanda: "", nome: "Subida dos repositórios em pre prod", horas: 8, horasOvertime: 0, tipo: "subida", etapa: "2", inicio: "", overtime: { tombamentoDates: [], feriadoDates: [], fimDeSemanaDates: [] } },
          { id: createId(), demanda: "", nome: "Testes internos", horas: 8, horasOvertime: 0, tipo: "testes", etapa: "3", inicio: "", overtime: { tombamentoDates: [], feriadoDates: [], fimDeSemanaDates: [] } },
        ],
      },
    ];
  }

  function addPacote() {
    setPacotes((prev) => [
      ...prev,
      { id: createId(), codigo: "PTI-", nome: "Novo pacote", collapsed: false, atividades: [] },
    ]);
  }

  function removePacote(id: string) {
    setPacotes((prev) => prev.filter((p) => p.id !== id));
  }

  function updatePacote(id: string, field: string, value: string) {
    setPacotes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  }

  function togglePacote(id: string) {
    setPacotes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, collapsed: !p.collapsed } : p))
    );
  }

  function addAtividadePacote(pacoteId: string) {
    const nova: PacoteAtividade = {
      id: createId(),
      demanda: "",
      nome: "Nova atividade",
      horas: 0,
      horasOvertime: 0,
      tipo: "desenvolvimento",
      etapa: "1",
      inicio: "",
      overtime: { tombamentoDates: [], feriadoDates: [], fimDeSemanaDates: [] },
    };
    setPacotes((prev) =>
      prev.map((p) =>
        p.id === pacoteId ? { ...p, atividades: [...p.atividades, nova] } : p
      )
    );
  }

  function updateAtividadePacote(pacoteId: string, atividadeId: string, field: string, value: unknown) {
    setPacotes((prev) =>
      prev.map((p) =>
        p.id === pacoteId
          ? {
              ...p,
              atividades: p.atividades.map((a) =>
                a.id === atividadeId ? { ...a, [field]: value } : a
              ),
            }
          : p
      )
    );
  }

  function removeAtividadePacote(pacoteId: string, atividadeId: string) {
    setPacotes((prev) =>
      prev.map((p) =>
        p.id === pacoteId
          ? { ...p, atividades: p.atividades.filter((a) => a.id !== atividadeId) }
          : p
      )
    );
  }
  
  // Converter data de dd/mm/yyyy para yyyy-mm-dd (para enviar ao backend)
  function converterData(dataDDMMYYYY: string): string {
    if (!dataDDMMYYYY) return '';
    const [dia, mes, ano] = dataDDMMYYYY.split('/');
    if (!dia || !mes || !ano) return '';
    return `${ano}-${mes}-${dia}`;
  }

  // Converter data de yyyy-mm-dd para dd/mm/yyyy (ao trazer do backend)
  function converterDataDoBackend(dataYYYYMMDD: string): string {
    if (!dataYYYYMMDD) return '';
    const [ano, mes, dia] = dataYYYYMMDD.split('-');
    if (!dia || !mes || !ano) return '';
    return `${dia}/${mes}/${ano}`;
  }

  async function salvarEstimativa(tipo: 'estimativa-rapida' | 'estimativa-pacotes') {
    try {
      setStatus("Salvando estimativa...");
      
      const novaEstimativa = {
        titulo: form.titulo,
        arquiteto: form.arquiteto,
        inicio: converterData(form.inicio) || converterData(dataInicioPacotes || "") || null,
        releaseAlvo: converterData(form.releaseAlvo) || null,
        feriados: form.feriados,
        releases: form.releases,
        premissas: form.premissas,
        restricoes: form.restricoes,
        observacoes: form.observacoes,
        atividades,
        pacotes,
        tipo,
        pontos: form.pontos,
        chgDias: parseInt(form.chgDias) || 0,
        esteiraPreProd: form.esteiraPreProd,
        diasParados: form.diasParados,
      };

      await criar(novaEstimativa);
      await listar(); // Recarregar lista
      setStatus("✅ Estimativa salva com sucesso!");
    } catch (erro) {
      console.error("Erro ao salvar:", erro);
      setStatus("❌ Erro ao salvar estimativa.");
    }
  }

  function carregarEstimativa(item: any) {
    try {
      setForm({ 
        ...defaultForm(), 
        titulo: item.titulo ?? "",
        arquiteto: item.arquiteto ?? "",
        inicio: converterDataDoBackend(item.inicio ?? ""),
        releaseAlvo: converterDataDoBackend(item.releaseAlvo ?? ""),
        feriados: item.feriados ?? "",
        releases: item.releases ?? "",
        premissas: item.premissas ?? "",
        restricoes: item.restricoes ?? "",
        observacoes: item.observacoes ?? "",
        pontos: item.pontos ?? "",
        chgDias: String(item.chgDias ?? 0),
        esteiraPreProd: item.esteiraPreProd ?? "",
        diasParados: item.diasParados ?? "",
      });
      setAtividades(normalizeAtividades(item.atividades ?? []));
      if (Array.isArray(item.pacotes) && item.pacotes.length > 0) {
        setPacotes(item.pacotes.map((p: any) => ({
          ...p,
          collapsed: false,
          atividades: Array.isArray(p.atividades)
            ? p.atividades.map((a: any) => ({
                id: a.id ?? createId(),
                demanda: a.demanda ?? "",
                nome: a.nome ?? "",
                horas: Number(a.horas ?? 0),
                horasOvertime: Number(a.horasOvertime ?? 0),
                tipo: a.tipo ?? "desenvolvimento",
                etapa: a.etapa ?? "1",
                inicio: a.inicio ?? "",
                overtime: {
                  tombamentoDates: Array.isArray(a.overtime?.tombamentoDates) ? a.overtime.tombamentoDates : [],
                  feriadoDates: Array.isArray(a.overtime?.feriadoDates) ? a.overtime.feriadoDates : [],
                  fimDeSemanaDates: Array.isArray(a.overtime?.fimDeSemanaDates) ? a.overtime.fimDeSemanaDates : [],
                },
              }))
            : [],
        })));
      }
      setStatus("✅ Estimativa carregada.");
    } catch (err) {
      console.error("Erro ao carregar estimativa:", err);
      setStatus("❌ Erro ao carregar estimativa.");
    }
  }

  async function excluirEstimativa(id: string) {
    try {
      setStatus("Excluindo estimativa...");
      await deletar(id);
      await listar(); // Recarregar lista
      setStatus("✅ Estimativa excluída com sucesso!");
    } catch (erro) {
      console.error("Erro ao excluir:", erro);
      setStatus("❌ Erro ao excluir estimativa.");
    }
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    listar().catch(erro => {
      console.error("Erro ao carregar histórico:", erro);
      setStatus("Não foi possível carregar o histórico.");
    });
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

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

  // Função para buscar estimativas por tipo de filtro (acionada pelo botão)
  const executarBusca = async () => {
    if (!valorFiltro.trim()) {
      setEstimativasFiltradas([]);
      setEstimativaFinanceiro(null);
      return;
    }

    setCarregandoFiltro(true);
    try {
      const resultados = await buscarComFiltros({
        arquiteto: tipoFiltro === "arquiteto" ? valorFiltro.trim() : undefined,
        titulo: tipoFiltro === "demanda" ? valorFiltro.trim() : undefined,
      });
      setEstimativasFiltradas(resultados);
    } catch (erro) {
      console.error("Erro ao buscar estimativas:", erro);
      setEstimativasFiltradas([]);
    } finally {
      setCarregandoFiltro(false);
    }
  };

  const releases = useMemo(() => normalizeDateList(form.releases), [form.releases]);
  const feriados = useMemo(() => normalizeDateList(form.feriados), [form.feriados]);
  const diasParados = useMemo(
    () => parseDiasParadosList(form.diasParados || ""),
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
    return Array.from(etapas.values()).reduce((acc: number, dias: number) => acc + dias, 0);
  }, [atividades]);

  const calculo = useMemo(() => {
    const startDate = parseDateBR(form.inicio);
    const releaseTargetDate = parseDateBR(form.releaseAlvo);
    
    // Safely handle invalid dates
    if (!isValidDate(startDate) || !isValidDate(releaseTargetDate)) {
      return { timeline: [], atividadesCalculadas: [], timeline2d: [] };
    }
    
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
    const calculatedEndDate = validDays[validDays.length - 1];
    const chgDates = getChgDates(releaseTargetDate, form.chgDias, feriados);

    const endDate =
      isValidDate(releaseTargetDate) && releaseTargetDate > calculatedEndDate
        ? releaseTargetDate
        : calculatedEndDate;

    // Build a map of dates from the original timeline for quick lookup
    const originalTimelineData: Record<string, { tipo: string; color: string; isReleaseDay: boolean; isEsteiraPreProd: boolean; isChg: boolean }> = {};
    let currentOrig = startDate;
    while (isValidDate(currentOrig) && isValidDate(endDate) && currentOrig <= endDate) {
      let tipo = "";
      let color = COLORS.white;

      if (sameDateBR(currentOrig, releaseTargetDate)) {
        tipo = "Release alvo";
        color = COLORS.releaseTarget;
      } else if (isParadoDay(currentOrig, diasParados, feriados, releases)) {
        tipo = "Projeto parado";
        color = COLORS.blocked;
      } else if (isWeekend(currentOrig)) {
        tipo = "Fim de semana";
        color = COLORS.weekend;
      }
      else if (isHoliday(currentOrig, feriados)) {
        tipo = "Feriado";
        color = COLORS.holiday;
      } else if (isPostRelease(currentOrig, releases)) {
        tipo = "Tombamento";
        color = COLORS.postRelease;
      } else {
        const activity = atividadesCalculadas.find((item) => {
          return isValidDate(item.inicio) && isValidDate(item.termino) && currentOrig >= item.inicio && currentOrig <= item.termino;
        });

        tipo = getTimelineLabel(activity?.tipo, activity?.nome);
        color = getTimelineColor(activity?.tipo);
      }

      const dateKey = currentOrig.toISOString().split('T')[0];
      originalTimelineData[dateKey] = {
        tipo,
        color,
        isReleaseDay: isReleaseDay(currentOrig, releases),
        isEsteiraPreProd: isEsteiraPreProdDay(currentOrig, esteiraPreProdRanges),
        isChg: chgDates.some((d) => isSameDay(d, currentOrig)),
      };

      currentOrig = addDays(currentOrig, 1);
    }

    // Get all months from start to end date
    if (!isValidDate(endDate)) {
      return { validDays: [], atividadesCalculadas: [], timeline: [], endDate: startDate };
    }
    
    let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    
    while (currentMonth <= lastMonth) {
      // Get the last day of the month
      const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      // Iterate through all days of the month (01 to 31/30/28/29)
      for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        const dateInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dateKey = dateInMonth.toISOString().split('T')[0];
        
        // Get data if it exists in the original timeline, otherwise use empty/white
        const data = originalTimelineData[dateKey];
        
        timeline.push({
          date: new Date(dateInMonth),
          tipo: data?.tipo || "",
          color: data?.color || COLORS.white,
          isReleaseDay: data?.isReleaseDay || false,
          isEsteiraPreProd: data?.isEsteiraPreProd || false,
          isChg: data?.isChg || false,
        });
      }
      
      // Move to next month
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
    return pacotes.reduce((acc, pacote) =>
      acc + pacote.atividades.reduce((sum, a) => {
        const ot = a.overtime ?? { tombamentoDates: [], feriadoDates: [], fimDeSemanaDates: [] };
        const horasOT = a.horasOvertime ?? 0;
        return sum + calcDiasOvertimeTotal(a.inicio, a.horas, horasOT, feriados, releases, ot) * 8;
      }, 0)
    , 0);
  }, [pacotes, feriados, releases]);

  const dataInicioPacotes = useMemo(() => {
    const dates = pacotes.flatMap(p => p.atividades.map(a => a.inicio)).filter(d => {
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
    const terminos = pacotes.flatMap(p => p.atividades.map(a => {
      const ot = a.overtime ?? { tombamentoDates: [], feriadoDates: [], fimDeSemanaDates: [] };
      const horasOT = a.horasOvertime ?? 0;
      return calcularTermino(a.inicio, a.horas, feriados, releases, ot, horasOT, diasParados);
    })).filter(t => t && t !== '—');
    if (terminos.length === 0) return null;
    return terminos.reduce((max, d) => {
      const date = parseDateBR(d)!;
      const maxDate = parseDateBR(max)!;
      return date > maxDate ? d : max;
    });
  }, [pacotes, feriados, releases, diasParados]);

  // Mapa de datas especiais (feriado/fim-de-semana/tombamento) em que há atuação nos pacotes
  const specialWorkDatesPacotes = useMemo(() => {
    const map: Record<string, string> = {};
    for (const pacote of pacotes) {
      for (const a of pacote.atividades) {
        const color = getTimelineColor(a.tipo);

        // 1. Datas de overtime explicitamente selecionadas
        const ot = a.overtime;
        if (ot) {
          const allDates = [
            ...(ot.feriadoDates || []),
            ...(ot.fimDeSemanaDates || []),
            ...(ot.tombamentoDates || []),
          ];
          for (const dateStr of allDates) {
            const parsed = parseDateBR(dateStr);
            if (!isValidDate(parsed)) continue;
            const key = (parsed as Date).toISOString().split('T')[0];
            if (!map[key]) map[key] = color;
          }
        }

        // 2. Data de inicio quando cai em dia especial (FDS, feriado ou tombamento)
        if (a.inicio) {
          const inicioDate = parseDateBR(a.inicio);
          if (isValidDate(inicioDate)) {
            const isSpecial =
              isWeekend(inicioDate) ||
              isHoliday(inicioDate, feriados) ||
              isPostRelease(inicioDate, releases);
            if (isSpecial) {
              const key = (inicioDate as Date).toISOString().split('T')[0];
              if (!map[key]) map[key] = color;
            }
          }
        }
      }
    }
    return map;
  }, [pacotes, feriados, releases]);

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
      return { timeline: [], atividadesCalculadas: [], validDays: [], endDate: startDate };
    }
    const validDays = getWorkingDays(startDate, totalDiasPacotes, releases, feriados, diasParados);
    const etapasOrdenadas = Array.from(
      new Set(atividadesDePacotes.map((a) => String(a.etapa || "1")))
    ).sort((a, b) => Number(a) - Number(b));

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
    const endDate =
      isValidDate(releaseTargetDate) && releaseTargetDate > calculatedEndDate
        ? releaseTargetDate
        : calculatedEndDate;

    if (!isValidDate(endDate)) {
      return { validDays: [], atividadesCalculadas, timeline: [], endDate: startDate };
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
        const activity = atividadesCalculadas.find((item) =>
          isValidDate(item.inicio) && isValidDate(item.termino) && currentOrig >= item.inicio && currentOrig <= item.termino
        );
        tipo = getTimelineLabel(activity?.tipo, activity?.nome);
        color = getTimelineColor(activity?.tipo);
      }
      const dateKey = currentOrig.toISOString().split("T")[0];
      originalTimelineData[dateKey] = {
        tipo, color,
        isReleaseDay: isReleaseDay(currentOrig, releases),
        isEsteiraPreProd: isEsteiraPreProdDay(currentOrig, esteiraPreProdRanges),
        isChg: chgDates.some((d) => isSameDay(d, currentOrig)),
      };
      currentOrig = addDays(currentOrig, 1);
    }

    const timeline: any[] = [];
    let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    while (currentMonth <= lastMonth) {
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const key = d.toISOString().split("T")[0];
        const data = originalTimelineData[key];
        timeline.push({
          date: new Date(d),
          tipo: data?.tipo || "",
          color: data?.color || COLORS.white,
          isReleaseDay: data?.isReleaseDay || false,
          isEsteiraPreProd: data?.isEsteiraPreProd || false,
          isChg: data?.isChg || false,
        });
      }
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    }
    return { validDays, atividadesCalculadas, timeline, endDate };
  }, [form.inicio, form.releaseAlvo, form.chgDias, totalDiasPacotes, releases, feriados, diasParados, atividadesDePacotes, esteiraPreProdRanges]);

  function updateForm(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateAtividade(id: string, field: string, value: unknown) {
    setAtividades((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function addAtividade() {
    setAtividades((prev) => [...prev, { id: createId(), nome: "Nova atividade", dias: 1, tipo: "desenvolvimento", etapa: "1" }]);
  }

  function removeAtividade(id: string) {
    setAtividades((prev) => prev.filter((item) => item.id !== id));
  }

  function moveAtividade(id: string, direction: number) {
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

  async function buscarFeriadosDoAno() {
    try {
      setLoadingHolidays(true);
      setStatus("Buscando feriados do ano...");
      
      const ano = new Date().getFullYear();
      const resposta = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${ano}/BR`);
      
      if (!resposta.ok) {
        throw new Error(`Erro na API: ${resposta.status}`);
      }
      
      const dados = await resposta.json();
      
      // Formatar feriados como "DD/MM/YYYY - Nome do feriado"
      const feriadosFormatados = dados
        .map((feriado: { date: string; localName: string }) => {
          const [ano, mes, dia] = feriado.date.split('-');
          return `${dia}/${mes}/${ano} - ${feriado.localName}`;
        })
        .join('\n');
      
      updateForm("feriados", feriadosFormatados);
      setStatus(`✅ ${dados.length} feriados de ${ano} carregados com sucesso!`);
      setLoadingHolidays(false);
    } catch (erro) {
      console.error("Erro ao buscar feriados:", erro);
      setStatus("❌ Erro ao buscar feriados. Tente novamente.");
      setLoadingHolidays(false);
    }
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
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Calculate number of pages needed
      const pagesNeeded = Math.ceil(imgHeight / pageHeight);

      // Add image to PDF with multi-page support
      if (pagesNeeded === 1) {
        // Single page - add normally
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      } else {
        // Multi-page - divide image and add to each page
        const pixelsPerPage = (canvas.height * pageHeight) / imgHeight;
        
        for (let page = 0; page < pagesNeeded; page++) {
          if (page > 0) {
            pdf.addPage();
          }

          // Calculate crop area for this page
          const startPixel = page * pixelsPerPage;
          const endPixel = Math.min((page + 1) * pixelsPerPage, canvas.height);
          const cropHeight = endPixel - startPixel;
          
          // Create temporary canvas for cropped image
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = canvas.width;
          tempCanvas.height = cropHeight;
          
          const ctx = tempCanvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(
              canvas,
              0,
              startPixel,
              canvas.width,
              cropHeight,
              0,
              0,
              canvas.width,
              cropHeight
            );
            
            const croppedImgData = tempCanvas.toDataURL("image/png");
            const pageImgHeight = (cropHeight * imgWidth) / canvas.width;
            pdf.addImage(croppedImgData, "PNG", 0, 0, imgWidth, pageImgHeight);
          }
        }
      }

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

  const releaseTargetDate = parseDateBR(form.releaseAlvo);
  
  // Filtrar timeline para manter apenas dias até a release
  let filteredTimeline = calculo.timeline;
  if (isValidDate(releaseTargetDate)) {
    filteredTimeline = calculo.timeline.filter(day => day.date <= releaseTargetDate);
  }

  // Calcular o número de blocos necessários e o tamanho de cada bloco
  const daysCount = filteredTimeline.length;
  const baseBlockSize = 15;
  const numBlocks = Math.ceil(daysCount / baseBlockSize);
  
  // Distribuir os dias uniformemente entre os blocos
  const daysPerBlock = Math.ceil(daysCount / numBlocks);
  
  // Criar os blocos com tamanho distribuído uniformemente
  const timelineRows = [];
  for (let i = 0; i < numBlocks; i++) {
    const startIdx = i * daysPerBlock;
    const endIdx = Math.min(startIdx + daysPerBlock, daysCount);
    const row = filteredTimeline.slice(startIdx, endIdx);
    
    if (row.length > 0) {
      const hasActivity = row.some(day => day.tipo !== "" || day.color !== COLORS.white);
      
      if (hasActivity) {
        if (row.length < daysPerBlock) {
          let currentDate = new Date(row[row.length - 1].date);
          for (let j = row.length; j < daysPerBlock; j++) {
            currentDate.setDate(currentDate.getDate() + 1);
            row.push({ date: new Date(currentDate), tipo: "", color: COLORS.white, isReleaseDay: false, isEsteiraPreProd: false, isChg: false });
          }
        }
        timelineRows.push(row);
      }
    }
  }

  // Timeline rows para aba Estimativa (pacotes)
  let filteredTimelinePacotes = calculoPacotes.timeline;
  if (isValidDate(releaseTargetDate)) {
    filteredTimelinePacotes = calculoPacotes.timeline.filter((day: any) => day.date <= releaseTargetDate);
  }
  const daysCountP = filteredTimelinePacotes.length;
  const numBlocksP = Math.ceil(daysCountP / baseBlockSize);
  const daysPerBlockP = Math.ceil(daysCountP / Math.max(numBlocksP, 1));
  const timelineRowsPacotes: any[][] = [];
  for (let i = 0; i < numBlocksP; i++) {
    const startIdx = i * daysPerBlockP;
    const endIdx = Math.min(startIdx + daysPerBlockP, daysCountP);
    const row = filteredTimelinePacotes.slice(startIdx, endIdx);
    if (row.length > 0) {
      const hasActivity = row.some((day: any) => day.tipo !== "" || day.color !== COLORS.white);
      if (hasActivity) {
        if (row.length < daysPerBlockP) {
          let currentDate = new Date(row[row.length - 1].date);
          for (let j = row.length; j < daysPerBlockP; j++) {
            currentDate.setDate(currentDate.getDate() + 1);
            row.push({ date: new Date(currentDate), tipo: "", color: COLORS.white, isReleaseDay: false, isEsteiraPreProd: false, isChg: false });
          }
        }
        timelineRowsPacotes.push(row);
      }
    }
  }

  // Preview para aba Estimativa: usa o inicio da primeira atividade do primeiro pacote
  const calculoPreviaPacotes = useMemo(() => {
    const firstAtiv = pacotes[0]?.atividades[0];
    const inicioPacote = firstAtiv?.inicio || "";

    // startDate = menor inicio entre todas as atividades de todos os pacotes
    const allInicioDates = pacotes
      .flatMap(p => p.atividades.map(a => parseDateBR(a.inicio)))
      .filter(isValidDate);
    const startDate = allInicioDates.length > 0
      ? new Date(Math.min(...allInicioDates.map((d: Date) => d.getTime())))
      : parseDateBR(inicioPacote);

    if (!isValidDate(startDate)) return { atividadesCalculadas: [], timeline: [], endDate: startDate, inicioPacote };

    const DEFAULT_OT = { tombamentoDates: [] as string[], feriadoDates: [] as string[], fimDeSemanaDates: [] as string[] };
    const atividadesCalculadas = pacotes.flatMap((pacote) =>
      pacote.atividades.map((a) => {
        const terminoStr = calcularTermino(a.inicio, Number(a.horas || 0), feriados, releases, a.overtime || DEFAULT_OT, Number(a.horasOvertime || 0), diasParados);
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
        const activity = atividadesCalculadas.find((item) =>
          isValidDate(item.inicio) && isValidDate(item.termino) && currentOrig >= item.inicio && currentOrig <= item.termino
        );
        tipo = getTimelineLabel(activity?.tipo, activity?.nome);
        color = getTimelineColor(activity?.tipo);
      }
      const dateKey = currentOrig.toISOString().split("T")[0];
      originalTimelineData[dateKey] = {
        tipo, color,
        isReleaseDay: isReleaseDay(currentOrig, releases),
        isEsteiraPreProd: isEsteiraPreProdDay(currentOrig, esteiraPreProdRanges),
        isChg: chgDates.some((d) => isSameDay(d, currentOrig)),
      };
      currentOrig = addDays(currentOrig, 1);
    }

    const timeline: any[] = [];
    let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const lastMonth = new Date(timelineEnd.getFullYear(), timelineEnd.getMonth(), 1);
    while (currentMonth <= lastMonth) {
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const key = d.toISOString().split("T")[0];
        const data = originalTimelineData[key];
        timeline.push({
          date: new Date(d),
          tipo: data?.tipo || "",
          color: data?.color || COLORS.white,
          isReleaseDay: data?.isReleaseDay || false,
          isEsteiraPreProd: data?.isEsteiraPreProd || false,
          isChg: data?.isChg || false,
        });
      }
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    }

    return { atividadesCalculadas, timeline, endDate, inicioPacote };
  }, [pacotes, feriados, releases, form.releaseAlvo, form.chgDias, diasParados, esteiraPreProdRanges]);

  // Timeline rows para o preview da aba Estimativa
  const timelineRowsPreviaPacotes = useMemo(() => {
    let filteredTimeline = calculoPreviaPacotes.timeline;
    const releaseTargetDatePrevia = parseDateBR(form.releaseAlvo);
    if (isValidDate(releaseTargetDatePrevia)) {
      filteredTimeline = filteredTimeline.filter((day: any) => day.date <= releaseTargetDatePrevia);
    }
    const daysCountPrev = filteredTimeline.length;
    if (daysCountPrev === 0) return [];
    const baseBlock = 15;
    const numBlocksPrev = Math.ceil(daysCountPrev / baseBlock);
    const daysPerBlockPrev = Math.ceil(daysCountPrev / Math.max(numBlocksPrev, 1));
    const rows: any[][] = [];
    for (let i = 0; i < numBlocksPrev; i++) {
      const startIdx = i * daysPerBlockPrev;
      const endIdx = Math.min(startIdx + daysPerBlockPrev, daysCountPrev);
      const row = filteredTimeline.slice(startIdx, endIdx);
      if (row.length > 0) {
        const hasActivity = row.some((day: any) => day.tipo !== "" || day.color !== COLORS.white);
        if (hasActivity) {
          if (row.length < daysPerBlockPrev) {
            let currentDate = new Date(row[row.length - 1].date);
            for (let j = row.length; j < daysPerBlockPrev; j++) {
              currentDate.setDate(currentDate.getDate() + 1);
              row.push({ date: new Date(currentDate), tipo: "", color: COLORS.white, isReleaseDay: false, isEsteiraPreProd: false, isChg: false });
            }
          }
          rows.push(row.map((day: any) => {
            const key = (day.date as Date).toISOString().split('T')[0];
            const workBorderColor = specialWorkDatesPacotes[key];
            return workBorderColor ? { ...day, workBorderColor } : day;
          }));
        }
      }
    }
    return rows;
  }, [calculoPreviaPacotes.timeline, form.releaseAlvo, specialWorkDatesPacotes]);

  return (
    <div className="min-h-screen bg-zinc-100 p-6">
      {/* Página: Cálculo Financeiro */}
      {page === "financeiro" && (
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Filtro por arquiteto */}
          <Card>
            <CardContent className="p-4">
              <h2 className="text-lg font-bold mb-3">💰 Cálculo Financeiro</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-2">
                    Tipo de Filtro
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTipoFiltro("arquiteto")}
                      className={`flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                        tipoFiltro === "arquiteto"
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "bg-white hover:bg-zinc-50 border-zinc-200"
                      }`}
                    >
                      👤 Arquiteto
                    </button>
                    <button
                      onClick={() => setTipoFiltro("demanda")}
                      className={`flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                        tipoFiltro === "demanda"
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "bg-white hover:bg-zinc-50 border-zinc-200"
                      }`}
                    >
                      📋 Demanda
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-700 block mb-1">
                    {tipoFiltro === "arquiteto" ? "Nome do Arquiteto" : "Título ou Código da Demanda"}
                  </label>
                  <Input
                    placeholder={tipoFiltro === "arquiteto" ? "Digite o nome do arquiteto..." : "Digite o título ou código..."}
                    value={valorFiltro}
                    onChange={(e) => setValorFiltro(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        executarBusca();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={executarBusca}
                  disabled={carregandoFiltro || !valorFiltro.trim()}
                  className="w-full"
                  size="sm"
                >
                  {carregandoFiltro ? "🔍 Buscando..." : "🔍 Buscar"}
                </Button>

                {/* Lista de estimativas filtradas */}
                {estimativasFiltradas.length > 0 && (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    <p className="text-xs text-muted-foreground mb-1">
                      {estimativasFiltradas.length} estimativa{estimativasFiltradas.length !== 1 ? "s" : ""} encontrada{estimativasFiltradas.length !== 1 ? "s" : ""}
                    </p>
                    {estimativasFiltradas.map((est) => (
                      <button
                        key={est.id}
                        onClick={() => setEstimativaFinanceiro(est)}
                        className={`w-full text-left px-3 py-2 rounded-md border text-sm transition-colors ${
                          estimativaFinanceiro?.id === est.id
                            ? "bg-zinc-900 text-white border-zinc-900"
                            : "bg-white hover:bg-zinc-50 border-zinc-200"
                        }`}
                      >
                        <div className="font-medium">{est.titulo || "Sem título"}</div>
                        <div className={`text-xs ${estimativaFinanceiro?.id === est.id ? "text-zinc-300" : "text-muted-foreground"}`}>
                          {est.arquiteto} · {est.inicio ? converterDataDoBackend(est.inicio) : "—"} → {est.releaseAlvo ? converterDataDoBackend(est.releaseAlvo) : "—"}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Sem filtro: mostrar estimativa atual */}
                {estimativasFiltradas.length === 0 && !carregandoFiltro && (
                  <p className="text-xs text-muted-foreground">
                    Selecione o tipo de filtro ({tipoFiltro === "arquiteto" ? "Arquiteto" : "Demanda"}) e clique em "Buscar" para selecionar uma estimativa, ou veja abaixo os dados da estimativa atual:{" "}
                    <span className="font-medium text-foreground">{form.titulo || "sem título"}</span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cálculo financeiro da estimativa selecionada */}
          {estimativaFinanceiro ? (
            <Card>
              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="font-semibold text-sm">{estimativaFinanceiro.titulo}</h3>
                  <p className="text-xs text-muted-foreground">
                    Arquiteto: <span className="font-medium text-foreground">{estimativaFinanceiro.arquiteto}</span>
                  </p>
                  {estimativaFinanceiro.esteiraPreProd && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Esteira Preprod: <span className="font-medium text-foreground">{estimativaFinanceiro.esteiraPreProd}</span>
                    </p>
                  )}
                </div>
                <CalculoFinanceiro
                  atividades={estimativaFinanceiro.atividades || []}
                  dataInicio={converterDataDoBackend(estimativaFinanceiro.inicio)}
                  dataFim={converterDataDoBackend(estimativaFinanceiro.releaseAlvo)}
                  feriados={estimativaFinanceiro.feriados || ""}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-xs text-muted-foreground mb-4">
                  Baseado nas atividades da estimativa atual:{" "}
                  <span className="font-medium text-foreground">{form.titulo || "sem título"}</span>
                </p>
                <CalculoFinanceiro
                  atividades={atividades}
                  dataInicio={form.inicio}
                  dataFim={form.releaseAlvo}
                  feriados={form.feriados}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Página: Estimativa Rápida */}
      {page === "estimativa-rapida" && (
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[400px_1fr]">
        <Card className="print:hidden">
          <CardContent className="space-y-4 p-5">
            <h1 className="text-xl font-bold">Gerador de estimativa</h1>
            
            {/* Informações da Estimativa - Sempre visível */}
            <Card className="border-zinc-200">
              <div className="p-4">
                <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Informações da Estimativa
                </h2>
                <div className="space-y-3">
                  <FormField label="Título da estimativa" required>
                    <Input 
                      value={form.titulo} 
                      onChange={(event) => updateForm("titulo", event.target.value)} 
                      placeholder="Ex: PTI-123"
                    />
                  </FormField>
                  <FormField label="Arquiteto" required>
                    <Input 
                      value={form.arquiteto} 
                      onChange={(event) => updateForm("arquiteto", event.target.value)} 
                      placeholder="Nome do arquiteto"
                    />
                  </FormField>
                  <FormField label="Início" required hint="Primeiro dia útil do projeto">
                    <DatePicker 
                      value={form.inicio} 
                      onChange={(date) => updateForm("inicio", date)} 
                      placeholder="Data de início (dd/mm/aaaa)" 
                    />
                  </FormField>
                  <FormField label="Subida em Produção" required hint="Data prevista de release">
                    <DatePicker 
                      value={form.releaseAlvo || ""} 
                      onChange={(date) => updateForm("releaseAlvo", date)} 
                      placeholder="Release alvo (dd/mm/aaaa)" 
                    />
                  </FormField>
                </div>
              </div>
            </Card>

            {/* Accordion Sections */}
            <Accordion type="single" collapsible className="w-full space-y-2">
              
              {/* Visualização de Impacto */}
              <div className="border rounded-lg overflow-hidden">
                <AccordionItem value="impact-view" className="border-0">
                  <AccordionTrigger className="hover:no-underline hover:bg-zinc-50 px-4">🎯 Visualização de Impacto</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4 px-4 pb-4 border-t">
                    <FormField label="Dias de trâmite CHG" hint="Número de dias de processamento">
                      <Input 
                        type="number" 
                        min="0" 
                        value={form.chgDias || ""} 
                        onChange={(event) => updateForm("chgDias", event.target.value)} 
                        placeholder="Ex: 3" 
                      />
                    </FormField>
                    <FormField label="Dias impactados" hint="Períodos em que o projeto está parado">
                      <DateRangeList 
                        value={form.diasParados || ""} 
                        onChange={(value) => updateForm("diasParados", value)} 
                        placeholder="Clique para adicionar dias" 
                      />
                    </FormField>
                    <FormField label="Período de esteira preprod" hint="Tempo em pré-produção">
                      <DateRangeList 
                        value={form.esteiraPreProd || ""} 
                        onChange={(value) => updateForm("esteiraPreProd", value)} 
                        placeholder="Clique para adicionar períodos" 
                      />
                    </FormField>
                  </AccordionContent>
                </AccordionItem>
              </div>

              {/* Observações */}
              <div className="border rounded-lg overflow-hidden">
                <AccordionItem value="observations" className="border-0">
                  <AccordionTrigger className="hover:no-underline hover:bg-zinc-50 px-4">📝 Observações</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4 px-4 pb-4 border-t">
                    <FormField label="Pontos de atenção">
                      <Textarea 
                        value={form.pontos} 
                        onChange={(event) => updateForm("pontos", event.target.value)} 
                        placeholder="Listee os pontos de atenção" 
                        className="min-h-24"
                      />
                    </FormField>
                    <FormField label="Premissas">
                      <Textarea 
                        value={form.premissas} 
                        onChange={(event) => updateForm("premissas", event.target.value)} 
                        placeholder="Listee as premissas do projeto" 
                        className="min-h-24"
                      />
                    </FormField>
                    <FormField label="Restrições">
                      <Textarea 
                        value={form.restricoes} 
                        onChange={(event) => updateForm("restricoes", event.target.value)} 
                        placeholder="Listee as restrições" 
                        className="min-h-24"
                      />
                    </FormField>
                    <FormField label="Observações">
                      <Textarea 
                        value={form.observacoes} 
                        onChange={(event) => updateForm("observacoes", event.target.value)} 
                        placeholder="Observações gerais" 
                        className="min-h-24"
                      />
                    </FormField>
                  </AccordionContent>
                </AccordionItem>
              </div>

              {/* Atividades */}
              <div className="border rounded-lg overflow-hidden">
                <AccordionItem value="activities" className="border-0">
                  <AccordionTrigger className="hover:no-underline hover:bg-zinc-50 px-4">✓ Atividades</AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-4 px-4 pb-4 border-t">
                    <AtividadesList
                      atividades={atividades}
                      onUpdate={updateAtividade}
                      onMove={moveAtividade}
                      onRemove={removeAtividade}
                      onAdd={addAtividade}
                    />
                  </AccordionContent>
                </AccordionItem>
              </div>
            </Accordion>


            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={salvarTemplate} size="sm">Salvar template</Button>
              <Button variant="outline" onClick={restaurarPadrao} size="sm">Restaurar padrão</Button>
            </div>

            <EstimativaHistorico
              historico={estimativas.filter(e => !e.tipo || e.tipo === 'estimativa-rapida')}
              onLoad={carregarEstimativa}
              onDelete={excluirEstimativa}
              onSave={() => salvarEstimativa('estimativa-rapida')}
            />

            {status && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-xs text-blue-700">
                {status}
              </div>
            )}

            <div className="space-y-2">
              <Button className="w-full" onClick={abrirPDF}>Abrir PDF</Button>
              <div className="grid grid-cols-2 gap-2">
                <Button className="w-full" onClick={gerarPDF} variant="default">Baixar PDF</Button>
                <Button className="w-full" onClick={gerarPDFCalendario} variant="outline">📅 Calendário</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <PdfPreview
          form={form}
          totalDias={totalDias}
          calculo={calculo}
          timelineRows={timelineRows}
        />
        <TimeLine
          form={form}
          timelineRows={timelineRows}
        />

      </div>
      )}

      {/* Página: Estimativa */}
      {page === "estimativa" && (
        <div className="mx-auto max-w-[1800px] space-y-4 px-4">

          {/* Cabeçalho */}
          <div className="pt-2">
            <h1 className="text-xl font-bold">Detalhamento de Estimativa</h1>
          </div>

          {/* Pacotes e Atividades — largura total */}
          <Card className="w-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  📦 Pacotes e Atividades
                </h2>
                <p className="text-xs text-zinc-500">
                  Clique nas células para editar • Datas calculadas automaticamente
                </p>
              </div>
              <EstimativaPacotesTable
                pacotes={pacotes}
                feriados={feriados}
                releases={releases}
                diasParados={diasParados}
                onUpdatePacote={updatePacote}
                onTogglePacote={togglePacote}
                onAddPacote={addPacote}
                onRemovePacote={removePacote}
                onAddAtividade={addAtividadePacote}
                onUpdateAtividade={updateAtividadePacote}
                onRemoveAtividade={removeAtividadePacote}
              />
            </CardContent>
          </Card>

          {/* Resumo da Estimativa — largura total */}
          <Card className="w-full">
            <CardContent className="p-5">
              <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
                📊 Resumo da Estimativa
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-orange-700">{pacotes.length}</p>
                  <p className="text-xs text-orange-600 mt-1">Pacotes</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">
                    {pacotes.reduce((acc, p) => acc + p.atividades.length, 0)}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">Atividades</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-purple-700">
                    {pacotes.reduce((acc, p) => acc + p.atividades.reduce((a, b) => a + Number(b.horas || 0), 0), 0)}h
                  </p>
                  <p className="text-xs text-purple-600 mt-1">Horas totais</p>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-rose-700">
                    {(() => {
                      const dias = Math.floor(totalHorasOvertime / 8);
                      const horas = totalHorasOvertime % 8;
                      if (dias === 0 && horas === 0) return "—";
                      if (dias === 0) return `${horas}h`;
                      if (horas === 0) return `${dias}d`;
                      return `${dias}d ${horas}h`;
                    })()}
                  </p>
                  <p className="text-xs text-rose-600 mt-1">Horas de Overtime</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{Math.round(totalDiasAtuacao)}</p>
                  <p className="text-xs text-green-600 mt-1">Dias de Atuação</p>
                </div>
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-cyan-700 tabular-nums">{dataInicioPacotes ?? "—"}</p>
                  <p className="text-xs text-cyan-600 mt-1">Início</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-slate-700 tabular-nums">{dataTerminoPacotes ?? "—"}</p>
                  <p className="text-xs text-slate-600 mt-1">Término</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seção Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-4 items-start">
            {/* Coluna esquerda: Informações da Estimativa */}
            <Card className="print:hidden">
              <CardContent className="space-y-4 p-5">
                <h2 className="font-semibold text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Preview
                </h2>

                <Card className="border-zinc-200">
                  <div className="p-4">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      Informações da Estimativa
                    </h3>
                    <div className="space-y-3">
                      <FormField label="Título da estimativa" required>
                        <Input value={form.titulo} onChange={(e) => updateForm("titulo", e.target.value)} placeholder="Ex: PTI-123" />
                      </FormField>
                      <FormField label="Arquiteto" required>
                        <Input value={form.arquiteto} onChange={(e) => updateForm("arquiteto", e.target.value)} placeholder="Nome do arquiteto" />
                      </FormField>
                      <FormField label="Subida em Produção" required hint="Data prevista de release">
                        <DatePicker value={form.releaseAlvo || ""} onChange={(date) => updateForm("releaseAlvo", date)} placeholder="Release alvo (dd/mm/aaaa)" />
                      </FormField>
                    </div>
                  </div>
                </Card>

                <Accordion type="single" collapsible className="w-full space-y-2">
                  <div className="border rounded-lg overflow-hidden">
                    <AccordionItem value="impact-view-prev" className="border-0">
                      <AccordionTrigger className="hover:no-underline hover:bg-zinc-50 px-4">🎯 Visualização de Impacto</AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4 px-4 pb-4 border-t">
                        <FormField label="Dias de trâmite CHG" hint="Número de dias de processamento">
                          <Input type="number" min="0" value={form.chgDias || ""} onChange={(e) => updateForm("chgDias", e.target.value)} placeholder="Ex: 3" />
                        </FormField>
                        <FormField label="Dias impactados" hint="Períodos em que o projeto está parado">
                          <DateRangeList value={form.diasParados || ""} onChange={(v) => updateForm("diasParados", v)} placeholder="Clique para adicionar dias" />
                        </FormField>
                        <FormField label="Período de esteira preprod" hint="Tempo em pré-produção">
                          <DateRangeList value={form.esteiraPreProd || ""} onChange={(v) => updateForm("esteiraPreProd", v)} placeholder="Clique para adicionar períodos" />
                        </FormField>
                      </AccordionContent>
                    </AccordionItem>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <AccordionItem value="observations-prev" className="border-0">
                      <AccordionTrigger className="hover:no-underline hover:bg-zinc-50 px-4">📝 Observações</AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4 px-4 pb-4 border-t">
                        <FormField label="Pontos de atenção">
                          <Textarea value={form.pontos} onChange={(e) => updateForm("pontos", e.target.value)} placeholder="Liste os pontos de atenção" className="min-h-20" />
                        </FormField>
                        <FormField label="Premissas">
                          <Textarea value={form.premissas} onChange={(e) => updateForm("premissas", e.target.value)} placeholder="Liste as premissas do projeto" className="min-h-20" />
                        </FormField>
                        <FormField label="Restrições">
                          <Textarea value={form.restricoes} onChange={(e) => updateForm("restricoes", e.target.value)} placeholder="Liste as restrições" className="min-h-20" />
                        </FormField>
                        <FormField label="Observações">
                          <Textarea value={form.observacoes} onChange={(e) => updateForm("observacoes", e.target.value)} placeholder="Observações gerais" className="min-h-20" />
                        </FormField>
                      </AccordionContent>
                    </AccordionItem>
                  </div>
                </Accordion>

                <EstimativaHistorico
                  historico={estimativas.filter(e => e.tipo === 'estimativa-pacotes')}
                  onLoad={carregarEstimativa}
                  onDelete={excluirEstimativa}
                  onSave={() => salvarEstimativa('estimativa-pacotes')}
                />

                {status && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-xs text-blue-700">
                    {status}
                  </div>
                )}

                <div className="space-y-2">
                  <Button className="w-full" onClick={abrirPDF}>Abrir PDF</Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button className="w-full" onClick={gerarPDF} variant="default">Baixar PDF</Button>
                    <Button className="w-full" onClick={gerarPDFCalendario} variant="outline">📅 Calendário</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Coluna direita: PDF Preview */}
            <div>
              <PdfPreview
                form={{ ...form, inicio: calculoPreviaPacotes.inicioPacote }}
                totalDias={totalDiasPacotes}
                calculo={calculoPreviaPacotes}
                timelineRows={timelineRowsPreviaPacotes}
              />
            </div>
          </div>

          {/* Calendário da Preview */}
          <TimeLine
            form={{ ...form, inicio: calculoPreviaPacotes.inicioPacote }}
            timelineRows={timelineRowsPreviaPacotes}
          />
        </div>
      )}

      <Dialog open={openSettings} onOpenChange={setOpenSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>⚙️ Releases e Feriados</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <span className="text-xs font-medium text-zinc-600">Releases do Ano</span>
              <Textarea className="min-h-40 mt-2" value={form.releases} onChange={(event) => updateForm("releases", event.target.value)} placeholder="Releases, uma por linha" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-zinc-600">Feriados</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={buscarFeriadosDoAno}
                  disabled={loadingHolidays}
                  className="h-7 px-2 text-xs"
                >
                  {loadingHolidays ? "⏳ Buscando..." : "📅 Carregar Feriados"}
                </Button>
              </div>
              <Textarea className="min-h-56 mt-2" value={form.feriados} onChange={(event) => updateForm("feriados", event.target.value)} placeholder="Feriados, um por linha. Ex: 01/01/2026 - Nome do feriado" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Wrapper com autenticação
export default function App() {
  const { isAuthenticated, checkAuth, logout, loading } = useAuth();
  const [page, setPage] = useState<"estimativa" | "estimativa-rapida" | "financeiro">("estimativa-rapida");
  const [openSettings, setOpenSettings] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <div className="inline-block animate-spin">
            <img 
              src="/loading_naruto_inspirado.svg" 
              alt="Carregando" 
              className="w-16 h-16"
            />
          </div>
          <p className="text-gray-600 font-medium">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={() => window.location.reload()} />;
  }

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  const nav = (
    <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
      <button
        onClick={() => setPage("estimativa-rapida")}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
          page === "estimativa-rapida" ? "bg-white shadow text-zinc-900" : "text-zinc-500 hover:text-zinc-800"
        }`}
      >
        <FileText className="h-4 w-4" />
        Estimativa Rápida
      </button>
      <button
        onClick={() => setPage("estimativa")}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
          page === "estimativa" ? "bg-white shadow text-zinc-900" : "text-zinc-500 hover:text-zinc-800"
        }`}
      >
        <FileText className="h-4 w-4" />
        Estimativa por Pacotes
      </button>
      <button
        disabled
        className="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium text-zinc-400 cursor-not-allowed opacity-50"
      >
        <DollarSign className="h-4 w-4" />
        Cálculo Financeiro
      </button>
    </div>
  );

  const settingsBtn = (
    <button
      onClick={() => setOpenSettings(true)}
      className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
      title="Configurações de feriados e releases"
    >
      <Settings className="h-5 w-5" />
    </button>
  );

  return (
    <ProtectedRoute onLogout={handleLogout} navContent={nav} settingsButton={settingsBtn}>
      <GeradorEstimativaPDF page={page} setPage={setPage} openSettings={openSettings} setOpenSettings={setOpenSettings} />
    </ProtectedRoute>
  );
}
