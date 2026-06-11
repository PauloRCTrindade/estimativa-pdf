import { useState, useCallback } from "react";
import type { AppForm, Estimativa } from "@/types";
import { notify } from "@/components/ui/toast-notification";
import { createId, normalizeAtividades, defaultForm } from "@/utils";
import type { Pacote } from "@/components/estimativa-pacotes";

function converterData(dataDDMMYYYY: string): string {
  if (!dataDDMMYYYY) return "";
  const [dia, mes, ano] = dataDDMMYYYY.split("/");
  if (!dia || !mes || !ano) return "";
  return `${ano}-${mes}-${dia}`;
}

function converterDataDoBackend(dataYYYYMMDD: string): string {
  if (!dataYYYYMMDD) return "";
  const [ano, mes, dia] = dataYYYYMMDD.split("-");
  if (!dia || !mes || !ano) return "";
  return `${dia}/${mes}/${ano}`;
}

export function useEstimativaCrud(
  form: AppForm,
  atividades: any[],
  pacotes: Pacote[],
  setForm: (f: AppForm | ((prev: AppForm) => AppForm)) => void,
  setAtividades: (a: any[] | ((prev: any[]) => any[])) => void,
  setPacotes: (p: Pacote[] | ((prev: Pacote[]) => Pacote[])) => void,
  criar: (e: Estimativa) => Promise<Estimativa>,
  deletar: (id: string) => Promise<void>,
  listar: () => Promise<Estimativa[]>,
  buscarComFiltros: (filtros?: { arquiteto?: string; titulo?: string }) => Promise<Estimativa[]>
) {
  const [estimativasFiltradas, setEstimativasFiltradas] = useState<Estimativa[]>([]);
  const [carregandoFiltro, setCarregandoFiltro] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState<"arquiteto" | "demanda">("arquiteto");
  const [valorFiltro, setValorFiltro] = useState("");

  async function salvarEstimativa(tipo: "estimativa-pacotes") {
    try {
      if (!form.titulo.trim() || !form.arquiteto.trim()) {
        notify("Preencha o título e o arquiteto antes de salvar.");
        return;
      }

      let inicioStr = converterData(form.inicio);
      if (!inicioStr) {
        const dataInicio = pacotes.flatMap((p) => p.atividades.map((a) => a.inicio)).filter(Boolean)[0];
        inicioStr = converterData(dataInicio || "");
      }
      if (!inicioStr) {
        const hoje = new Date();
        inicioStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
      }

      let releaseStr = converterData(form.releaseAlvo);
      if (!releaseStr) {
        const dataTermino = pacotes.flatMap((p) => p.atividades.map((a) => a.inicio)).filter(Boolean)[0];
        releaseStr = converterData(dataTermino || "");
      }
      if (!releaseStr) {
        const hoje = new Date();
        releaseStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
      }

      notify("Salvando estimativa...");

      const novaEstimativa: Estimativa = {
        titulo: form.titulo,
        arquiteto: form.arquiteto,
        inicio: inicioStr,
        releaseAlvo: releaseStr,
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
      await listar();
      notify("Estimativa salva com sucesso!");
    } catch (erro) {
      console.error("Erro ao salvar:", erro);
      notify("Erro ao salvar estimativa.");
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
        setPacotes(
          item.pacotes.map((p: any) => ({
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
          }))
        );
      }
      notify("Estimativa carregada.");
    } catch (err) {
      console.error("Erro ao carregar estimativa:", err);
      notify("Erro ao carregar estimativa.");
    }
  }

  async function excluirEstimativa(id: string) {
    try {
      notify("Excluindo estimativa...");
      await deletar(id);
      await listar();
      notify("Estimativa excluída com sucesso!");
    } catch (erro) {
      console.error("Erro ao excluir:", erro);
      notify("Erro ao excluir estimativa.");
    }
  }

  const executarBusca = useCallback(async () => {
    if (!valorFiltro.trim()) {
      setEstimativasFiltradas([]);
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
  }, [valorFiltro, tipoFiltro, buscarComFiltros]);

  return {
    tipoFiltro,
    setTipoFiltro,
    valorFiltro,
    setValorFiltro,
    estimativasFiltradas,
    carregandoFiltro,
    salvarEstimativa,
    carregarEstimativa,
    excluirEstimativa,
    executarBusca,
  };
}
