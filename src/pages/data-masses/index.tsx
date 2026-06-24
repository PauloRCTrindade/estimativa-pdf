import { useEffect, useState, useCallback, useMemo } from "react";
import { Database } from "@phosphor-icons/react";
import { DataMassToolbar } from "@/components/data-masses/DataMassToolbar";
import { DataMassesTable } from "@/components/data-masses/DataMassesTable";
import { ColumnManager } from "@/components/data-masses/ColumnManager";
import { TagManager } from "@/components/data-masses/TagManager";
import { useDataMasses } from "@/hooks/useDataMasses";
import type { DataMass, DataMassColumn, DataMassTag } from "@/types";

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

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredMassas = useMemo(
    () => filtrarMassas(massas, searchTerm, selectedTags),
    [massas, searchTerm, selectedTags, filtrarMassas]
  );

  const customColumns = useMemo(
    () => colunas.filter((c) => !c.required),
    [colunas]
  );

  const handleAddRow = useCallback(async () => {
    await criar({
      cpf: "",
      linha: "",
      observacao: "",
      tipos: [],
      customFields: {},
    });
  }, [criar]);

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
      if (confirm("Tem certeza que deseja excluir esta massa?")) {
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
    </div>
  );
}
