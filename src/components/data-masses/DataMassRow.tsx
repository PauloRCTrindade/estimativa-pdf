import { useState, useEffect } from "react";
import { Trash, FloppyDisk, X, PencilSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import { TagSelector } from "./TagSelector";
import type { DataMass, DataMassColumn, DataMassTag } from "@/types";

interface DataMassRowProps {
  massa: DataMass;
  customColumns: DataMassColumn[];
  availableTags: DataMassTag[];
  onSave: (id: string, data: Partial<DataMass>) => void;
  onDelete: (id: string) => void;
  onCreateTag: (tag: Omit<DataMassTag, "id">) => Promise<DataMassTag | undefined>;
}

function isEqualMassa(a: DataMass, b: DataMass): boolean {
  if (
    a.cpf !== b.cpf ||
    a.linha !== b.linha ||
    (a.observacao || "") !== (b.observacao || "") ||
    a.tipos.length !== b.tipos.length ||
    !a.tipos.every((t, i) => t === b.tipos[i])
  ) {
    return false;
  }
  const aKeys = Object.keys(a.customFields || {});
  const bKeys = Object.keys(b.customFields || {});
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a.customFields[key] === b.customFields[key]);
}

export function DataMassRow({
  massa,
  customColumns,
  availableTags,
  onSave,
  onDelete,
  onCreateTag,
}: DataMassRowProps) {
  const [draft, setDraft] = useState<DataMass>(massa);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingObservation, setEditingObservation] = useState(false);
  const [observationDraft, setObservationDraft] = useState(massa.observacao || "");

  useEffect(() => {
    setDraft(massa);
    setHasChanges(false);
    setObservationDraft(massa.observacao || "");
  }, [massa]);

  const updateDraft = (changes: Partial<DataMass>) => {
    const next = { ...draft, ...changes };
    setDraft(next);
    setHasChanges(!isEqualMassa(next, massa));
  };

  const updateCustomField = (columnName: string, value: string) => {
    updateDraft({
      customFields: {
        ...draft.customFields,
        [columnName]: value,
      },
    });
  };

  const handleSave = () => {
    const payload: Partial<DataMass> = {};
    if (draft.cpf !== massa.cpf) payload.cpf = draft.cpf;
    if (draft.linha !== massa.linha) payload.linha = draft.linha;
    if (
      draft.tipos.length !== massa.tipos.length ||
      !draft.tipos.every((t, i) => t === massa.tipos[i])
    ) {
      payload.tipos = draft.tipos;
    }

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

    if (draft.observacao !== massa.observacao) {
      payload.observacao = draft.observacao;
    }

    if (Object.keys(payload).length > 0) {
      onSave(massa.id, payload);
    }
    setHasChanges(false);
  };

  const handleCancel = () => {
    setDraft(massa);
    setHasChanges(false);
    setObservationDraft(massa.observacao || "");
  };

  const handleObservationSave = () => {
    const trimmed = observationDraft.trim();
    updateDraft({ observacao: trimmed });
    setEditingObservation(false);
  };

  const handleObservationCancel = () => {
    setObservationDraft(massa.observacao || "");
    setEditingObservation(false);
  };

  const renderCustomCell = (column: DataMassColumn) => {
    const value = draft.customFields?.[column.name] || "";

    if (column.type === "date") {
      return (
        <Input
          type="date"
          value={value}
          onChange={(e) => updateCustomField(column.name, e.target.value)}
          className="h-7 min-w-[120px] px-2 text-xs"
        />
      );
    }

    return (
      <Input
        type="text"
        value={value}
        onChange={(e) => updateCustomField(column.name, e.target.value)}
        placeholder={column.name}
        className="h-7 min-w-[120px] px-2 text-xs"
      />
    );
  };

  return (
    <tr className="group border-b border-border/60 hover:bg-accent/30">
      <td className="px-2 py-1.5">
        <Input
          type="text"
          value={draft.cpf}
          onChange={(e) => updateDraft({ cpf: e.target.value })}
          placeholder="CPF"
          className="h-7 min-w-[120px] px-2 text-xs"
        />
      </td>
      <td className="px-2 py-1.5">
        <Input
          type="text"
          value={draft.linha}
          onChange={(e) => updateDraft({ linha: e.target.value })}
          placeholder="Linha"
          className="h-7 min-w-[120px] px-2 text-xs"
        />
      </td>
      <td className="px-2 py-1.5">
        <TagSelector
          availableTags={availableTags}
          selectedTags={draft.tipos}
          onChange={(tipos) => updateDraft({ tipos })}
          onCreateTag={onCreateTag}
        />
      </td>
      <td className="px-2 py-1.5">
        <button
          type="button"
          onClick={() => setEditingObservation(true)}
          className="w-full cursor-text rounded-md border border-transparent px-2 py-1 text-left hover:border-input hover:bg-accent/30 focus-visible:border-ring focus-visible:outline-hidden"
        >
          <RichTextViewer
            value={draft.observacao}
            placeholder="Adicionar observação..."
            className="max-h-20 overflow-hidden text-xs"
            emptyClassName="text-xs"
          />
        </button>

        <Dialog open={editingObservation} onOpenChange={setEditingObservation}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar observação</DialogTitle>
            </DialogHeader>
            <RichTextEditor
              key={`obs-${massa.id}-${editingObservation}`}
              defaultValue={observationDraft}
              onChange={setObservationDraft}
              placeholder="Digite a observação..."
              minHeight="200px"
            />
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={handleObservationCancel}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleObservationSave}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </td>
      {customColumns.map((column) => (
        <td key={column.id} className="px-2 py-1.5">
          {renderCustomCell(column)}
        </td>
      ))}
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          {hasChanges && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleSave}
                title="Salvar"
              >
                <FloppyDisk className="h-3.5 w-3.5 text-primary" />
              </Button>
              <Button
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
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(massa.id)}
            title="Excluir"
          >
            <Trash className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
