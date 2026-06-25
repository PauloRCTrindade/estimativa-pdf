/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Trash, FloppyDisk, X, Minus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataMassLineRow } from "./DataMassLineRow";
import {
  addLineToDataMass,
  removeLineFromDataMass,
  lineMatchesSearch,
  lineMatchesTags,
} from "./utils";
import type { FilteredDataMass, DataMassColumn, DataMassTag, DataMass, DataMassLine } from "./types";

interface DataMassRowGroupProps {
  massa: FilteredDataMass;
  customColumns: DataMassColumn[];
  availableTags: DataMassTag[];
  searchTerm: string;
  selectedTags: string[];
  onSave: (id: string, data: Partial<DataMass>) => void;
  onDelete: (id: string) => void;
  onCreateTag: (tag: Omit<DataMassTag, "id">) => Promise<DataMassTag | undefined>;
}

function dataMassEqual(a: DataMass, b: DataMass): boolean {
  if (a.cpf !== b.cpf) return false;
  if (a.lines.length !== b.lines.length) return false;
  for (let i = 0; i < a.lines.length; i++) {
    const al = a.lines[i];
    const bl = b.lines[i];
    if (
      al.id !== bl.id ||
      al.numero !== bl.numero ||
      (al.observacao || "") !== (bl.observacao || "") ||
      al.tipos.length !== bl.tipos.length ||
      !al.tipos.every((t, idx) => t === bl.tipos[idx])
    ) {
      return false;
    }
  }
  const aKeys = Object.keys(a.customFields || {});
  const bKeys = Object.keys(b.customFields || {});
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => (a.customFields || {})[key] === (b.customFields || {})[key]);
}

export function DataMassRowGroup({
  massa,
  customColumns,
  availableTags,
  searchTerm,
  selectedTags,
  onSave,
  onDelete,
  onCreateTag,
}: DataMassRowGroupProps) {
  const [draft, setDraft] = useState<DataMass>(massa);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setDraft(massa);
    setHasChanges(false);
  }, [massa]);

  const updateDraft = useCallback((changes: Partial<DataMass>) => {
    setDraft((prev) => ({ ...prev, ...changes }));
  }, []);

  useEffect(() => {
    setHasChanges(!dataMassEqual(draft, massa));
  }, [draft, massa]);

  const handleUpdateLine = useCallback(
    (lineId: string, changes: Partial<DataMassLine>) => {
      updateDraft({
        lines: draft.lines.map((line) =>
          line.id === lineId ? { ...line, ...changes } : line
        ),
      });
    },
    [draft.lines, updateDraft]
  );

  const handleAddLine = useCallback(() => {
    updateDraft(addLineToDataMass(draft));
  }, [draft, updateDraft]);

  const handleRemoveLine = useCallback(
    (lineId: string) => {
      updateDraft(removeLineFromDataMass(draft, lineId));
    },
    [draft, updateDraft]
  );

  const handleSave = useCallback(() => {
    const payload: Partial<DataMass> = {};
    if (draft.cpf !== massa.cpf) payload.cpf = draft.cpf;

    const linesChanged =
      draft.lines.length !== massa.lines.length ||
      !draft.lines.every((dl, idx) => {
        const ml = massa.lines[idx];
        if (!ml) return false;
        return (
          dl.id === ml.id &&
          dl.numero === ml.numero &&
          (dl.observacao || "") === (ml.observacao || "") &&
          dl.tipos.length === ml.tipos.length &&
          dl.tipos.every((t, i) => t === ml.tipos[i])
        );
      });

    if (linesChanged) payload.lines = draft.lines;

    const customChanges: Record<string, string> = {};
    const allKeys = new Set([
      ...Object.keys(massa.customFields || {}),
      ...Object.keys(draft.customFields || {}),
    ]);
    allKeys.forEach((key) => {
      const oldValue = massa.customFields?.[key] || "";
      const newValue = draft.customFields?.[key] || "";
      if (oldValue !== newValue) {
        customChanges[key] = newValue;
      }
    });

    if (Object.keys(customChanges).length > 0) {
      payload.customFields = { ...massa.customFields, ...customChanges };
    }

    if (Object.keys(payload).length > 0) {
      onSave(massa.id, payload);
    }
    setHasChanges(false);
  }, [draft, massa, onSave]);

  const handleCancel = useCallback(() => {
    setDraft(massa);
    setHasChanges(false);
  }, [massa]);

  const updateCustomField = useCallback(
    (columnName: string, value: string) => {
      updateDraft({
        customFields: {
          ...draft.customFields,
          [columnName]: value,
        },
      });
    },
    [draft.customFields, updateDraft]
  );

  // Recalcula o filtro a partir do draft atual para que edições e novas
  // linhas sejam refletidas imediatamente na tabela.
  const displayLines = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const hasTerm = term.length > 0;
    const hasTags = selectedTags.length > 0;

    if (!hasTerm && !hasTags) return draft.lines;

    return draft.lines.filter((line) => {
      const matchesTerm = !hasTerm || lineMatchesSearch(line, term);
      const matchesTags = lineMatchesTags(line, selectedTags);
      return matchesTerm && matchesTags;
    });
  }, [draft.lines, searchTerm, selectedTags]);

  // Garante que sempre haja pelo menos uma linha renderizada para manter a
  // estrutura da tabela (CPF com rowSpan) consistente.
  const linesToRender = displayLines.length > 0 ? displayLines : draft.lines;
  const totalRows = linesToRender.length + 1; // +1 para a linha do botão "+ Linha"

  return (
    <>
      {linesToRender.map((line, index) => (
        <tr
          key={`${massa.id}-${line.id}`}
          className="group border-b border-border/60 hover:bg-accent/30"
        >
          {index === 0 && (
            <td
              rowSpan={totalRows}
              className="align-top px-2 py-1.5 min-w-[140px] border-r border-border/40"
            >
              <Input
                type="text"
                value={draft.cpf}
                onChange={(e) => updateDraft({ cpf: e.target.value })}
                placeholder="CPF"
                className="h-7 px-2 text-xs"
              />
            </td>
          )}
          <DataMassLineRow
            line={line}
            availableTags={availableTags}
            onChange={(changes) => handleUpdateLine(line.id, changes)}
            onCreateTag={onCreateTag}
          />
          {index === 0 &&
            customColumns.map((column) => (
              <td
                key={column.id}
                rowSpan={totalRows}
                className="align-top px-2 py-1.5 border-l border-border/40"
              >
                <Input
                  type={column.type === "date" ? "date" : "text"}
                  value={draft.customFields?.[column.name] || ""}
                  onChange={(e) => updateCustomField(column.name, e.target.value)}
                  placeholder={column.name}
                  className="h-7 min-w-[120px] px-2 text-xs"
                />
              </td>
            ))}
          <td className="align-top px-2 py-1.5 border-l border-border/40">
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => handleRemoveLine(line.id)}
                title="Remover linha"
              >
                <Minus className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </Button>
              {index === 0 && (
                <>
                  {hasChanges && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleSave}
                        title="Salvar"
                      >
                        <FloppyDisk className="h-3.5 w-3.5 text-primary" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleCancel}
                        title="Cancelar"
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onDelete(massa.id)}
                    title="Excluir CPF"
                  >
                    <Trash className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </td>
        </tr>
      ))}
      <tr className="border-b border-border/60 hover:bg-accent/30">
        <td className="px-2 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 justify-start px-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleAddLine}
          >
            <Plus className="mr-1 h-3 w-3" />
            Linha
          </Button>
        </td>
        <td className="px-2 py-1.5"></td>
        <td className="px-2 py-1.5"></td>
        <td className="px-2 py-1.5 border-l border-border/40"></td>
      </tr>
    </>
  );
}
