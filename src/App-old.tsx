/* eslint-disable react-hooks/set-state-in-effect */
// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { COLORS } from './styles';
import { HISTORY_KEY, STORAGE_KEY } from './data';
import { PdfPreview } from "./components/pdf-preview";
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
  defaultAtividades,
  isSameDay,
  normalizeAtividades,
  runSelfTests,
  sanitizeFileName,
  defaultForm,
  isReleaseDay
} from './utils';
import { TimeLine } from "./components/time-line";



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
    const calculatedEndDate = validDays[validDays.length - 1];
    const releaseTargetDate = parseDateBR(form.releaseAlvo);
    const chgDates = getChgDates(releaseTargetDate, form.chgDias, feriados);

    const endDate =
      isValidDate(releaseTargetDate) && releaseTargetDate > calculatedEndDate
        ? releaseTargetDate
        : calculatedEndDate;

    while (isValidDate(current) && isValidDate(endDate) && current <= endDate) {
      let tipo = "";
      let color = COLORS.white;

      if (sameDateBR(current, releaseTargetDate)) {
        tipo = "Release alvo";
        color = COLORS.releaseTarget;
      } else if (isBlockedDay(current, diasParados)) {
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
        isReleaseDay: isReleaseDay(current, releases),
        isEsteiraPreProd: isEsteiraPreProdDay(current, esteiraPreProdRanges),
        isChg: chgDates.some((d) => isSameDay(d, current)),
      });


      current = addDays(current, 1);
    }

    return { validDays, atividadesCalculadas, timeline, endDate };
  }, [form.inicio, form.releaseAlvo, form.chgDias, totalDias, releases, feriados, diasParados, atividades, esteiraPreProdRanges]);

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

  const releaseTargetDate = parseDateBR(form.releaseAlvo);
  const timelineRows = [];
  for (let i = 0; i < calculo.timeline.length; i += 15) {
    const row = calculo.timeline.slice(i, i + 15);
    // Verificar se o primeiro dia do bloco é anterior ou igual à data da subida em produção
    if (row.length > 0 && isValidDate(releaseTargetDate)) {
      if (row[0].date <= releaseTargetDate) {
        timelineRows.push(row);
      }
    } else if (row.length > 0) {
      // Se não há data de release, mostrar todos os blocos
      timelineRows.push(row);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[400px_1fr]">
        <Card className="print:hidden">
          <CardContent className="space-y-4 p-5">
            <h1 className="text-xl font-bold">Gerador de estimativa</h1>
            <span className="text-xs font-medium text-zinc-600">Título da estimativa</span>
            <Input value={form.titulo} onChange={(event) => updateForm("titulo", event.target.value)} />
            <span className="text-xs font-medium text-zinc-600">Arquiteto</span>
            <Input value={form.arquiteto} onChange={(event) => updateForm("arquiteto", event.target.value)} />
            <span className="text-xs font-medium text-zinc-600">Início</span>
            <Input value={form.inicio} onChange={(event) => updateForm("inicio", event.target.value)} placeholder="Data de início (dd/mm/aaaa)" />
            <span className="text-xs font-medium text-zinc-600">Subida em Produção</span>
            <Input value={form.releaseAlvo || ""} onChange={(event) => updateForm("releaseAlvo", event.target.value)} placeholder="Release alvo (dd/mm/aaaa)" />
            <span className="text-xs font-medium text-zinc-600">Dias de trâmite CHG</span>
            <Input type="number" min="0" value={form.chgDias || ""} onChange={(event) => updateForm("chgDias", event.target.value)} placeholder="Ex: 3" />
            <span className="text-xs font-medium text-zinc-600">Releases do Ano</span>
            <Textarea className="min-h-40" value={form.releases} onChange={(event) => updateForm("releases", event.target.value)} placeholder="Releases, uma por linha" />
            <span className="text-xs font-medium text-zinc-600">Feriados</span>
            <Textarea className="min-h-56" value={form.feriados} onChange={(event) => updateForm("feriados", event.target.value)} placeholder="Feriados, um por linha. Ex: 01/01/2026 - Nome do feriado" />
            <span className="text-xs font-medium text-zinc-600">Pontos de atenção</span>
            <Textarea value={form.pontos} onChange={(event) => updateForm("pontos", event.target.value)} placeholder="Pontos de atenção" />
            <span className="text-xs font-medium text-zinc-600">Premissas</span>
            <Textarea value={form.premissas} onChange={(event) => updateForm("premissas", event.target.value)} placeholder="Premissas" />
            <span className="text-xs font-medium text-zinc-600">Restrições</span>
            <Textarea value={form.restricoes} onChange={(event) => updateForm("restricoes", event.target.value)} placeholder="Restrições" />
            <span className="text-xs font-medium text-zinc-600">Dias impactados</span>
            <Textarea className="min-h-32" value={form.diasParados || ""} onChange={(event) => updateForm("diasParados", event.target.value)} placeholder="Dias parados, um por linha. Ex: 10/05/2026 - Aguardando UX" />
            <span className="text-xs font-medium text-zinc-600">Preriodo de esteria preprod</span>
            <Textarea className="min-h-32" value={form.esteiraPreProd || ""} onChange={(event) => updateForm("esteiraPreProd", event.target.value)} placeholder="Esteira Pre Prod, um período por linha. Ex: 10/05/2026 - 15/05/2026" />
            <span className="text-xs font-medium text-zinc-600">Observações</span>
            <Textarea value={form.observacoes} onChange={(event) => updateForm("observacoes", event.target.value)} placeholder="Observações" />

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
        <TimeLine
          form={form}
          timelineRows={timelineRows}
        />

      </div>
    </div>
  );
}



