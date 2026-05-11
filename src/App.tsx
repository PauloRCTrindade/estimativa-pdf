import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, FileText, Clock } from "lucide-react";
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
import { useAuth } from "./hooks/useAuth";
import { useEstimativas } from "./hooks/useEstimativas";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AuthPage } from "./components/auth/AuthPage";

if (typeof window !== "undefined") runSelfTests();

function GeradorEstimativaPDF() {
  const { estimativas, listar, criar, deletar } = useEstimativas();
  const [form, setForm] = useState(defaultForm);
  const [atividades, setAtividades] = useState(defaultAtividades);
  const [status, setStatus] = useState("");
  const [openSettings, setOpenSettings] = useState(false);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  
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

  async function salvarEstimativa() {
    try {
      setStatus("Salvando estimativa...");
      
      const novaEstimativa = {
        titulo: form.titulo,
        arquiteto: form.arquiteto,
        inicio: converterData(form.inicio),
        releaseAlvo: converterData(form.releaseAlvo),
        feriados: form.feriados,
        releases: form.releases,
        premissas: form.premissas,
        restricoes: form.restricoes,
        observacoes: form.observacoes,
        atividades,
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
    setForm({ 
      ...defaultForm(), 
      titulo: item.titulo,
      arquiteto: item.arquiteto,
      inicio: converterDataDoBackend(item.inicio),
      releaseAlvo: converterDataDoBackend(item.releaseAlvo),
      feriados: item.feriados || "",
      releases: item.releases || "",
      premissas: item.premissas,
      restricoes: item.restricoes,
      observacoes: item.observacoes,
      pontos: item.pontos,
      chgDias: String(item.chgDias || 0),
      esteiraPreProd: item.esteiraPreProd,
      diasParados: item.diasParados,
    });
    setAtividades(normalizeAtividades(item.atividades || []));
    setStatus("✅ Estimativa carregada.");
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
      // Verificar se há pelo menos uma atividade (tipo não vazio ou cor diferente de branco)
      const hasActivity = row.some(day => day.tipo !== "" || day.color !== COLORS.white);
      
      if (hasActivity && row.length < daysPerBlock) {
        // Preencher com dias vazios até atingir daysPerBlock
        let currentDate = new Date(row[row.length - 1].date);
        for (let j = row.length; j < daysPerBlock; j++) {
          currentDate.setDate(currentDate.getDate() + 1);
          
          row.push({
            date: new Date(currentDate),
            tipo: "",
            color: COLORS.white,
            isReleaseDay: false,
            isEsteiraPreProd: false,
            isChg: false,
          });
        }
      }
      
      timelineRows.push(row);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[400px_1fr]">
        <Card className="print:hidden">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-xl font-bold">Gerador de estimativa</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpenSettings(true)}
                className="h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            
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
              historico={estimativas}
              onLoad={carregarEstimativa}
              onDelete={excluirEstimativa}
              onSave={salvarEstimativa}
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

  return (
    <ProtectedRoute onLogout={handleLogout}>
      <GeradorEstimativaPDF />
    </ProtectedRoute>
  );
}
