import { useEffect, useState, useCallback, useMemo } from "react";
import { Copy, Database, Plus, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DataMassToolbar } from "@/components/data-masses/DataMassToolbar";
import { DataMassesTable } from "@/components/data-masses/DataMassesTable";
import { ColumnManager } from "@/components/data-masses/ColumnManager";
import { TagManager } from "@/components/data-masses/TagManager";
import { TagSelector } from "@/components/data-masses/TagSelector";
import { useDataMasses } from "@/hooks/useDataMasses";
import { createDataMassLine, formatVisibleDataMassesForCopy } from "@/components/data-masses/utils";
import type { DataMass, DataMassColumn, DataMassTag, DataMassLine } from "@/types";

function isLineEmpty(line: DataMassLine): boolean {
  return (
    !line.numero.trim() &&
    line.tipos.length === 0 &&
    !line.observacao?.trim()
  );
}

export function DataMassesPage() {
  const {
    massas,
    colunas,
    tags,
    loading,
    error,
    carregarTudo,
    criar,
    atualizar,
    deletar,
    criarColunaMassa,
    deletarColunaMassa,
    criarTagMassa,
    deletarTagMassa,
    filtrarMassas,
  } = useDataMasses();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);

  const [newMassModalOpen, setNewMassModalOpen] = useState(false);
  const [newMassCpf, setNewMassCpf] = useState("");
  const [newMassLines, setNewMassLines] = useState<DataMassLine[]>([createDataMassLine()]);
  const [newMassError, setNewMassError] = useState<string | null>(null);

  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredMassas = useMemo(
    () => filtrarMassas(massas, searchTerm, selectedTags),
    [massas, searchTerm, selectedTags, filtrarMassas]
  );

  const copyText = useMemo(
    () => formatVisibleDataMassesForCopy(filteredMassas),
    [filteredMassas]
  );

  const [editableCopyText, setEditableCopyText] = useState(copyText);

  const customColumns = useMemo(
    () => colunas.filter((c) => !c.required),
    [colunas]
  );

  const resetNewMassForm = useCallback(() => {
    setNewMassCpf("");
    setNewMassLines([createDataMassLine()]);
    setNewMassError(null);
  }, []);

  const handleAddRow = useCallback(async () => {
    resetNewMassForm();
    setNewMassModalOpen(true);
  }, [resetNewMassForm]);

  const handleAddModalLine = useCallback(() => {
    setNewMassLines((prev) => [...prev, createDataMassLine()]);
  }, []);

  const handleRemoveModalLine = useCallback((lineId: string) => {
    setNewMassLines((prev) => {
      const remaining = prev.filter((line) => line.id !== lineId);
      return remaining.length > 0 ? remaining : [createDataMassLine()];
    });
  }, []);

  const handleUpdateModalLine = useCallback((lineId: string, changes: Partial<DataMassLine>) => {
    setNewMassLines((prev) =>
      prev.map((line) => (line.id === lineId ? { ...line, ...changes } : line))
    );
  }, []);

  const handleCreateMass = useCallback(async () => {
    setNewMassError(null);

    const cpf = newMassCpf.trim();
    if (!cpf) {
      setNewMassError("O CPF é obrigatório.");
      return;
    }

    const filledLines = newMassLines.filter((line) => !isLineEmpty(line));
    if (filledLines.length === 0) {
      setNewMassError("Preencha pelo menos uma linha para salvar.");
      return;
    }

    try {
      await criar({
        cpf,
        lines: filledLines,
        customFields: {},
      });
      setNewMassModalOpen(false);
      resetNewMassForm();
    } catch (err) {
      console.error("Erro ao criar massa:", err);
    }
  }, [criar, newMassCpf, newMassLines, resetNewMassForm]);

  const handleSaveMassa = useCallback(
    async (id: string, data: Partial<DataMass>) => {
      try {
        await atualizar(id, data);
      } catch (err) {
        console.error("Erro ao salvar massa:", err);
      }
    },
    [atualizar]
  );

  const handleDeleteMassa = useCallback(
    async (id: string) => {
      if (confirm("Tem certeza que deseja excluir este CPF e todas as suas linhas?")) {
        await deletar(id);
      }
    },
    [deletar]
  );

  const handleCreateColumn = useCallback(
    async (column: Omit<DataMassColumn, "id">) => {
      await criarColunaMassa(column);
    },
    [criarColunaMassa]
  );

  const handleDeleteColumn = useCallback(
    async (id: string) => {
      if (confirm("Tem certeza que deseja excluir esta coluna? Os dados associados serão perdidos.")) {
        await deletarColunaMassa(id);
      }
    },
    [deletarColunaMassa]
  );

  const handleCreateTag = useCallback(
    async (tag: Omit<DataMassTag, "id">): Promise<DataMassTag | undefined> => {
      return await criarTagMassa(tag);
    },
    [criarTagMassa]
  );

  const handleDeleteTag = useCallback(
    async (id: string) => {
      if (confirm("Tem certeza que deseja excluir esta tag?")) {
        await deletarTagMassa(id);
      }
    },
    [deletarTagMassa]
  );

  const toggleTagFilter = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleOpenCopyModal = useCallback(() => {
    setCopyFeedback(null);
    setEditableCopyText(copyText);
    setCopyModalOpen(true);
  }, [copyText]);

  const handleCopyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(editableCopyText);
      setCopyFeedback("Texto copiado com sucesso");
    } catch (err) {
      console.error("Erro ao copiar:", err);
      setCopyFeedback("Falha ao copiar. Selecione e copie manualmente.");
    }
  }, [editableCopyText]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Massas de Dados</h1>
      </div>

      <DataMassToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedTags={selectedTags}
        onToggleTagFilter={toggleTagFilter}
        availableTags={tags}
        onAddRow={handleAddRow}
        onCopyMassas={handleOpenCopyModal}
        onOpenColumnManager={() => setColumnManagerOpen(true)}
        onOpenTagManager={() => setTagManagerOpen(true)}
      />

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && massas.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Carregando massas...
        </div>
      ) : (
        <DataMassesTable
          massas={filteredMassas}
          customColumns={customColumns}
          availableTags={tags}
          searchTerm={searchTerm}
          selectedTags={selectedTags}
          onSaveMassa={handleSaveMassa}
          onDeleteMassa={handleDeleteMassa}
          onCreateTag={handleCreateTag}
        />
      )}

      <ColumnManager
        open={columnManagerOpen}
        onOpenChange={setColumnManagerOpen}
        columns={colunas}
        onCreateColumn={handleCreateColumn}
        onDeleteColumn={handleDeleteColumn}
      />

      <TagManager
        open={tagManagerOpen}
        onOpenChange={setTagManagerOpen}
        tags={tags}
        onDeleteTag={handleDeleteTag}
      />

      <Dialog open={copyModalOpen} onOpenChange={setCopyModalOpen}>
        <DialogContent
          overlayClassName="bg-black/30 backdrop-blur-none"
          className="flex max-h-[80vh] w-full max-w-[min(900px,90vw)] flex-col overflow-hidden p-0"
        >
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Copiar massas</DialogTitle>
            <DialogDescription>
              Revise o conteúdo abaixo antes de copiar
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
            <Textarea
              value={editableCopyText}
              onChange={(e) => setEditableCopyText(e.target.value)}
              className="min-h-[400px] w-full flex-1 resize-none font-mono text-sm whitespace-pre"
            />
            {copyFeedback && (
              <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                {copyFeedback}
              </div>
            )}
          </div>
          <DialogFooter className="mx-0 mb-0 border-t bg-muted/50 px-6 py-4 sm:justify-end">
            <Button variant="outline" onClick={() => setCopyModalOpen(false)}>
              Fechar
            </Button>
            <Button onClick={handleCopyText}>
              <Copy className="mr-1.5 h-4 w-4" />
              Copiar texto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newMassModalOpen} onOpenChange={setNewMassModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova massa de dados</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-5 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">CPF</label>
              <Input
                value={newMassCpf}
                onChange={(e) => setNewMassCpf(e.target.value)}
                placeholder="Digite o CPF"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium text-muted-foreground">Linhas da massa</label>

              {newMassLines.map((line, index) => (
                <div
                  key={line.id}
                  className="rounded-lg border border-border/60 bg-accent/20 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Linha {index + 1}
                    </span>
                    {newMassLines.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveModalLine(line.id)}
                        title="Remover linha"
                      >
                        <Trash className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <Input
                      value={line.numero}
                      onChange={(e) =>
                        handleUpdateModalLine(line.id, { numero: e.target.value })
                      }
                      placeholder="Digite a linha"
                    />
                    <TagSelector
                      availableTags={tags}
                      selectedTags={line.tipos}
                      onChange={(tipos) => handleUpdateModalLine(line.id, { tipos })}
                      onCreateTag={handleCreateTag}
                    />
                    <Input
                      value={line.observacao || ""}
                      onChange={(e) =>
                        handleUpdateModalLine(line.id, { observacao: e.target.value })
                      }
                      placeholder="Digite a observação da linha"
                    />
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={handleAddModalLine}
              >
                <Plus className="mr-1 h-4 w-4" />
                Adicionar linha
              </Button>
            </div>

            {newMassError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {newMassError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewMassModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateMass}
              disabled={!newMassCpf.trim() || newMassLines.every(isLineEmpty)}
            >
              Salvar massa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
