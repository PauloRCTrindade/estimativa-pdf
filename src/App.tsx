import { useEffect, useState } from "react";
import {
  StackSimple,
  Sliders,
  Stack,
  Tabs,
  Sun,
  Moon,
  Rocket,
  CalendarBlank,
  Hourglass,
  Database,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ToastNotification } from "@/components/ui/toast-notification";
import { useAuth } from "@/hooks/useAuth";
import { useEstimativas } from "@/hooks/useEstimativas";
import { useKanban } from "@/hooks/useKanban";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthPage } from "@/components/auth/AuthPage";
import { PdfPreview } from "@/components/pdf-preview";
import { InformationPage } from "@/pages/information";
import { DetailsPage } from "@/pages/details";
import { DocumentPage } from "@/pages/document";
import { OverviewPage } from "@/pages/overview";
import { SavePage } from "@/pages/save";
import { KanbanPage } from "@/pages/kanban";
import { DataMassesPage } from "@/pages/data-masses";
import {
  useEstimativaForm,
  useTimelineCalculations,
  usePdfGeneration,
  useEstimativaCrud,
} from "@/features/estimativa";
import { runSelfTests } from "@/utils";

if (typeof window !== "undefined") runSelfTests();

type Page = "estimativa" | "kanban" | "dataMasses";

function GeradorEstimativaPDF({
  page,
  setPage,
  openSettings,
  setOpenSettings,
}: {
  page: Page;
  setPage: (p: Page) => void;
  openSettings: boolean;
  setOpenSettings: (v: boolean) => void;
}) {
  const { estimativas, listar, criar, deletar, buscarComFiltros } = useEstimativas();

  const {
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
  } = useEstimativaForm();

  const {
    feriados,
    releases,
    diasParados,
    totalHorasOvertime,
    totalDiasAtuacao,
    dataInicioPacotes,
    dataTerminoPacotes,
    totalDiasPacotes,
    calculoPreviaPacotes,
    timelineRowsPreviaPacotes,
  } = useTimelineCalculations(form, atividades, pacotes);

  const { gerarPDF, abrirPDF, gerarPDFCalendario, abrirCalendario } = usePdfGeneration(form.titulo);

  const {
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
  } = useEstimativaCrud(
    form,
    atividades,
    pacotes,
    setForm,
    setAtividades,
    setPacotes,
    criar,
    deletar,
    listar,
    buscarComFiltros
  );

  const {
    columns: kanbanColumns,
    cards: kanbanCards,
    allTags: kanbanAllTags,
    loading: kanbanLoading,
    favoriteIds,
    isAddingFavorite,
    addColumn: addKanbanColumn,
    updateColumnTitle: updateKanbanColumnTitle,
    updateColumnColor: updateKanbanColumnColor,
    removeColumn: removeKanbanColumn,
    reorderColumn: reorderKanbanColumn,
    moveCard: moveKanbanCard,
    reorderCard: reorderKanbanCard,
    updateCard: updateKanbanCard,
    updateCardNotes: updateKanbanCardNotes,
    addCardTask: addKanbanCardTask,
    updateCardTask: updateKanbanCardTask,
    toggleCardTaskCompleted: toggleKanbanCardTaskCompleted,
    toggleEstimateTaskCompleted: toggleKanbanEstimateTaskCompleted,
    removeCardTask: removeKanbanCardTask,
    reorderCardTask: reorderKanbanCardTask,
    removeCard: removeKanbanCard,
    addCard: addKanbanCard,
    favoriteEstimativa,
    useTemplateAsBase: useKanbanTemplateAsBase,
    createTemplate: createKanbanTemplate,
    duplicateCard: duplicateKanbanCard,
    archiveCard: archiveKanbanCard,
    unarchiveCard: unarchiveKanbanCard,
    getTagColor: getKanbanTagColor,
    setTagColor: setKanbanTagColor,
  } = useKanban(estimativas);

  // Carregar estimativas no mount
  useEffect(() => {
    listar().catch((erro) => {
      console.error("Erro ao carregar histórico:", erro);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Página: Estimativa */}
      {page === "estimativa" && (
        <div className={`mx-auto max-w-[1800px] px-4 ${viewMode === "pagina-unica" ? "space-y-4" : ""}`}>
          {/* Sub-navegação das seções — apenas no modo Abas */}
          {viewMode === "abas" && (
            <div className="sticky top-14 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 -mx-4 lg:-mx-8 px-4 lg:px-8 py-2">
              <nav className="flex gap-0.5 overflow-x-auto">
                {[
                  { id: "informacoes", label: "Informações" },
                  { id: "detalhamento", label: "Detalhamento" },
                  { id: "gerar-documento", label: "Documento" },
                  { id: "visualizacao-impacto", label: "Visão Geral" },
                  { id: "salvar-estimativa", label: "Salvar" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSubTab(tab.id as typeof subTab)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
                      subTab === tab.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          )}

          {/* PdfPreview oculto com linha do tempo — sempre renderizado para html2canvas */}
          <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
            <PdfPreview
              form={{ ...form, inicio: calculoPreviaPacotes.inicioPacote || "" }}
              totalDias={totalDiasPacotes}
              calculo={calculoPreviaPacotes}
              timelineRows={timelineRowsPreviaPacotes}
            />
          </div>

          {/* Aba: Informações */}
          {viewMode === "pagina-unica" && (
            <div className="pt-6 pb-2">
              <h2 className="text-lg font-semibold tracking-tight">Informações</h2>
              <p className="text-sm text-muted-foreground">Dados gerais da estimativa</p>
            </div>
          )}
          {(viewMode === "pagina-unica" || subTab === "informacoes") && (
            <InformationPage form={form} updateForm={updateForm} feriados={feriados} releases={releases} />
          )}

          {/* Aba: Detalhamento */}
          {viewMode === "pagina-unica" && (
            <div className="pt-8 pb-2">
              <h2 className="text-lg font-semibold tracking-tight">Detalhamento</h2>
              <p className="text-sm text-muted-foreground">Pacotes e atividades da estimativa</p>
            </div>
          )}
          {(viewMode === "pagina-unica" || subTab === "detalhamento") && (
            <DetailsPage
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
              totalHorasOvertime={totalHorasOvertime}
              totalDiasAtuacao={totalDiasAtuacao}
              dataInicioPacotes={dataInicioPacotes}
              dataTerminoPacotes={dataTerminoPacotes}
            />
          )}

          {/* Aba: Documento */}
          {viewMode === "pagina-unica" && (
            <div className="pt-8 pb-2">
              <h2 className="text-lg font-semibold tracking-tight">Documento</h2>
              <p className="text-sm text-muted-foreground">Pontos de atenção e premissas</p>
            </div>
          )}
          {(viewMode === "pagina-unica" || subTab === "gerar-documento") && (
            <DocumentPage
              form={form}
              updateForm={updateForm}
              calculoPreviaPacotes={calculoPreviaPacotes}
              totalDiasPacotes={totalDiasPacotes}
              timelineRowsPreviaPacotes={timelineRowsPreviaPacotes}
            />
          )}

          {/* Aba: Visão Geral */}
          {viewMode === "pagina-unica" && (
            <div className="pt-8 pb-2">
              <h2 className="text-lg font-semibold tracking-tight">Visão Geral</h2>
              <p className="text-sm text-muted-foreground">Impacto e timeline do projeto</p>
            </div>
          )}
          {(viewMode === "pagina-unica" || subTab === "visualizacao-impacto") && (
            <OverviewPage
              form={form}
              updateForm={updateForm}
              calculoPreviaPacotes={calculoPreviaPacotes}
              timelineRowsPreviaPacotes={timelineRowsPreviaPacotes}
            />
          )}

          {/* Aba: Salvar Informações */}
          {viewMode === "pagina-unica" && (
            <div className="pt-8 pb-2">
              <h2 className="text-lg font-semibold tracking-tight">Salvar</h2>
              <p className="text-sm text-muted-foreground">Gerenciar estimativas salvas</p>
            </div>
          )}
          {(viewMode === "pagina-unica" || subTab === "salvar-estimativa") && (
            <SavePage
              estimativas={estimativas}
              onLoad={carregarEstimativa}
              onDelete={excluirEstimativa}
              onFavorite={favoriteEstimativa}
              favoriteIds={favoriteIds}
              isAddingFavorite={isAddingFavorite}
              onSave={() => salvarEstimativa("estimativa-pacotes")}
              onAbrirPDF={abrirPDF}
              onGerarPDF={gerarPDF}
              onAbrirCalendario={abrirCalendario}
              onGerarPDFCalendario={gerarPDFCalendario}
              form={form}
              timelineRows={timelineRowsPreviaPacotes}
            />
          )}
        </div>
      )}

      {/* Página: Massas de Dados */}
      {page === "dataMasses" && <DataMassesPage />}

      {/* Página: Kanban */}
      {page === "kanban" && (
        <KanbanPage
          columns={kanbanColumns}
          cards={kanbanCards}
          estimativas={estimativas}
          feriados={feriados}
          releases={releases}
          allTags={kanbanAllTags}
          loading={kanbanLoading}
          getTagColor={getKanbanTagColor}
          setTagColor={setKanbanTagColor}
          onAddColumn={addKanbanColumn}
          onUpdateColumnTitle={updateKanbanColumnTitle}
          onUpdateColumnColor={updateKanbanColumnColor}
          onRemoveColumn={removeKanbanColumn}
          onReorderColumn={reorderKanbanColumn}
          onMoveCard={moveKanbanCard}
          onReorderCard={reorderKanbanCard}
          onUpdateCard={updateKanbanCard}
          onUpdateCardNotes={updateKanbanCardNotes}
          onAddCardTask={addKanbanCardTask}
          onUpdateCardTask={updateKanbanCardTask}
          onToggleCardTaskCompleted={toggleKanbanCardTaskCompleted}
          onToggleEstimateTaskCompleted={toggleKanbanEstimateTaskCompleted}
          onRemoveCardTask={removeKanbanCardTask}
          onReorderCardTask={reorderKanbanCardTask}
          onRemoveCard={removeKanbanCard}
          onAddCard={addKanbanCard}
          onUseTemplate={useKanbanTemplateAsBase}
          onCreateTemplate={createKanbanTemplate}
          onDuplicateCard={duplicateKanbanCard}
          onArchiveCard={archiveKanbanCard}
          onUnarchiveCard={unarchiveKanbanCard}
        />
      )}

      {/* Dialog de Configurações */}
      <Dialog open={openSettings} onOpenChange={setOpenSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sliders className="h-4 w-4 text-muted-foreground" />
              Configurações
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Modo de Visualização */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tabs className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Navegação por Abas</span>
                </div>
                <button
                  onClick={() => toggleViewMode(viewMode === "abas" ? "pagina-unica" : "abas")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    viewMode === "abas" ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-primary-foreground shadow transition-transform ${
                      viewMode === "abas" ? "translate-x-1" : "translate-x-6"
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {viewMode === "abas" ? "Cada seção em uma aba separada" : "Todas as seções em uma página contínua"}
              </p>
            </div>

            <div className="border-t border-border/60" />

            {/* Tema */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {theme === "dark" ? (
                    <Moon className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Sun className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="text-sm font-medium">Modo Escuro</span>
                </div>
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    theme === "dark" ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-primary-foreground shadow transition-transform ${
                      theme === "dark" ? "translate-x-1" : "translate-x-6"
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {theme === "dark" ? "Tema escuro ativado" : "Tema claro ativado"}
              </p>
            </div>

            <div className="border-t border-border/60" />

            {/* Releases */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Rocket className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">Releases do Ano</span>
              </div>
              <Textarea
                className="min-h-[120px] text-sm"
                value={form.releases}
                onChange={(e) => updateForm("releases", e.target.value)}
                placeholder="Releases, uma por linha"
              />
            </div>

            {/* Feriados */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarBlank className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">Feriados</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={buscarFeriadosDoAno}
                  disabled={loadingHolidays}
                  className="h-7 gap-1.5 text-xs"
                >
                  {loadingHolidays ? (
                    <>
                      <Hourglass className="h-3 w-3 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <CalendarBlank className="h-3 w-3" />
                      Carregar Feriados
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                className="min-h-[160px] text-sm"
                value={form.feriados}
                onChange={(e) => updateForm("feriados", e.target.value)}
                placeholder="Feriados, um por linha. Ex: 01/01/2026 - Nome do feriado"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, checkAuth, logout, loading } = useAuth();
  const [page, setPage] = useState<Page>("estimativa");
  const [openSettings, setOpenSettings] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <div className="inline-block animate-spin">
            <img src="/loading_naruto_inspirado.svg" alt="Carregando" className="w-16 h-16" />
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
    <nav className="flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5">
      <button
        onClick={() => setPage("estimativa")}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
          page === "estimativa"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        <StackSimple className="h-3.5 w-3.5" />
        Estimativa
      </button>
      <button
        onClick={() => setPage("kanban")}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
          page === "kanban"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        <Stack className="h-3.5 w-3.5" />
        Kanban
      </button>
      <button
        onClick={() => setPage("dataMasses")}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
          page === "dataMasses"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        <Database className="h-3.5 w-3.5" />
        Massas de Dados
      </button>
    </nav>
  );

  const settingsBtn = (
    <button
      onClick={() => setOpenSettings(true)}
      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      title="Configurações"
    >
      <Sliders className="h-4 w-4" />
    </button>
  );

  return (
    <ProtectedRoute onLogout={handleLogout} navContent={nav} settingsButton={settingsBtn}>
      <ToastNotification />
      <GeradorEstimativaPDF page={page} setPage={setPage} openSettings={openSettings} setOpenSettings={setOpenSettings} />
    </ProtectedRoute>
  );
}
