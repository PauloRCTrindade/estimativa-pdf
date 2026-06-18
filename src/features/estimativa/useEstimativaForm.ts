import { useState, useEffect, useCallback } from "react";
import type { AppForm } from "@/types";
import {
  createId,
  normalizeAtividades,
  defaultAtividades,
  defaultForm,
} from "@/utils";
import { STORAGE_KEY } from "@/data";
import { notify } from "@/components/ui/toast-notification";
import { type Pacote, type PacoteAtividade, normalizeAtividadesPorEtapa, normalizeEtapa } from "@/utils/schedule";

export type SubTab = "informacoes" | "detalhamento" | "gerar-documento" | "visualizacao-impacto" | "salvar-estimativa";
export type ViewMode = "abas" | "pagina-unica";
export type Theme = "light" | "dark";

function _defaultPacotes(): Pacote[] {
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

export function useEstimativaForm() {
  const [form, setForm] = useState<AppForm>(defaultForm);
  const [atividades, setAtividades] = useState(defaultAtividades);
  const [pacotes, setPacotes] = useState<Pacote[]>(_defaultPacotes);
  const [subTab, setSubTab] = useState<SubTab>("informacoes");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem("estimativa-view-mode") as ViewMode) || "abas";
  });
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("estimativa-theme") as Theme) || "light";
  });
  const [loadingHolidays, setLoadingHolidays] = useState(false);

  // Tema
  useEffect(() => {
    localStorage.setItem("estimativa-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Carregar template do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed.form) setForm({ ...defaultForm(), ...parsed.form });
      if (Array.isArray(parsed.atividades)) setAtividades(normalizeAtividades(parsed.atividades));
    } catch {
      notify("Não foi possível carregar o template salvo.");
    }
  }, []);

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

  // Pacotes
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
    setPacotes((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  function togglePacote(id: string) {
    setPacotes((prev) => prev.map((p) => (p.id === id ? { ...p, collapsed: !p.collapsed } : p)));
  }

  function addAtividadePacote(pacoteId: string) {
    const last = pacotes.find((p) => p.id === pacoteId)?.atividades.at(-1);
    const nova: PacoteAtividade = {
      id: createId(),
      demanda: "",
      nome: "Nova atividade",
      horas: last ? last.horas : 0,
      horasOvertime: last ? last.horasOvertime : 0,
      tipo: last ? last.tipo : "desenvolvimento",
      etapa: last ? last.etapa : "1",
      inicio: last ? last.inicio : "",
      overtime: last && last.overtime
        ? { ...last.overtime }
        : { tombamentoDates: [], feriadoDates: [], fimDeSemanaDates: [] },
    };
    setPacotes((prev) =>
      prev.map((p) =>
        p.id === pacoteId
          ? { ...p, atividades: normalizeAtividadesPorEtapa([...p.atividades, nova]) }
          : p
      )
    );
  }

  // Campos de planejamento compartilhados entre todas as tarefas da mesma etapa.
  // A etapa em si é o agrupador e não deve ser propagada.
  const sharedStageFields = new Set(["inicio", "horas", "horasOvertime", "overtime"]);

  function updateAtividadePacote(pacoteId: string, atividadeId: string, field: string, value: unknown) {
    setPacotes((prev) =>
      prev.map((p) => {
        if (p.id !== pacoteId) return p;

        const target = p.atividades.find((a) => a.id === atividadeId);
        if (!target) return p;

        let nextAtividades = [...p.atividades];

        // Ao mudar uma tarefa para uma etapa já existente, ela adota os valores
        // de planejamento dessa etapa e é reposicionada junto ao grupo.
        if (field === "etapa") {
          const newEtapa = normalizeEtapa(value);
          const reference = nextAtividades.find(
            (a) => a.id !== atividadeId && normalizeEtapa(a.etapa) === newEtapa
          );
          nextAtividades = nextAtividades.map((a) =>
            a.id === atividadeId
              ? {
                  ...a,
                  etapa: newEtapa,
                  ...(reference
                    ? {
                        inicio: reference.inicio,
                        horas: reference.horas,
                        horasOvertime: reference.horasOvertime,
                        overtime: reference.overtime,
                      }
                    : {}),
                }
              : a
          );
          return { ...p, atividades: normalizeAtividadesPorEtapa(nextAtividades) };
        }

        // Campos de planejamento são compartilhados por etapa: propagamos para
        // todas as tarefas do mesmo grupo e sincronizamos a partir da tarefa
        // que foi editada.
        if (sharedStageFields.has(field)) {
          nextAtividades = nextAtividades.map((a) =>
            a.id === atividadeId || normalizeEtapa(a.etapa) === normalizeEtapa(target.etapa)
              ? { ...a, [field]: value }
              : a
          );
          return { ...p, atividades: normalizeAtividadesPorEtapa(nextAtividades, atividadeId) };
        }

        // Campos exclusivos da tarefa (nome, tipo, demanda) alteram apenas ela.
        nextAtividades = nextAtividades.map((a) =>
          a.id === atividadeId ? { ...a, [field]: value } : a
        );
        return { ...p, atividades: nextAtividades };
      })
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

  function toggleViewMode(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem("estimativa-view-mode", mode);
  }

  function salvarTemplate() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, atividades }));
    notify("Template salvo no navegador.");
  }

  function restaurarPadrao() {
    setForm(defaultForm());
    setAtividades(defaultAtividades());
    setPacotes(_defaultPacotes());
    notify("Template padrão restaurado.");
  }

  async function buscarFeriadosDoAno() {
    try {
      setLoadingHolidays(true);
      notify("Buscando feriados do ano...");
      const ano = new Date().getFullYear();
      const resposta = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${ano}/BR`);
      if (!resposta.ok) {
        throw new Error(`Erro na API: ${resposta.status}`);
      }
      const dados = await resposta.json();
      const feriadosFormatados = dados
        .map((feriado: { date: string; localName: string }) => {
          const [ano, mes, dia] = feriado.date.split("-");
          return `${dia}/${mes}/${ano} - ${feriado.localName}`;
        })
        .join("\n");
      updateForm("feriados", feriadosFormatados);
      notify(`${dados.length} feriados de ${ano} carregados com sucesso!`);
    } catch (erro) {
      console.error("Erro ao buscar feriados:", erro);
      notify("Erro ao buscar feriados. Tente novamente.");
    } finally {
      setLoadingHolidays(false);
    }
  }

  return {
    form,
    atividades,
    pacotes,
    subTab,
    setSubTab,
    viewMode,
    theme,
    setTheme,
    loadingHolidays,
    updateForm,
    updateAtividade,
    addAtividade,
    removeAtividade,
    moveAtividade,
    addPacote,
    removePacote,
    updatePacote,
    togglePacote,
    addAtividadePacote,
    updateAtividadePacote,
    removeAtividadePacote,
    toggleViewMode,
    salvarTemplate,
    restaurarPadrao,
    buscarFeriadosDoAno,
    setForm,
    setAtividades,
    setPacotes,
  };
}
