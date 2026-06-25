import { useState, useEffect } from "react";
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
/* eslint-disable react-hooks/set-state-in-effect */
import type { DataMassLine, DataMassTag } from "./types";

interface DataMassLineRowProps {
  line: DataMassLine;
  availableTags: DataMassTag[];
  onChange: (changes: Partial<DataMassLine>) => void;
  onCreateTag: (tag: Omit<DataMassTag, "id">) => Promise<DataMassTag | undefined>;
}

export function DataMassLineRow({
  line,
  availableTags,
  onChange,
  onCreateTag,
}: DataMassLineRowProps) {
  const [editingObservation, setEditingObservation] = useState(false);
  const [observationDraft, setObservationDraft] = useState(line.observacao || "");

  useEffect(() => {
    setObservationDraft(line.observacao || "");
  }, [line.observacao]);

  const handleObservationSave = () => {
    const trimmed = observationDraft.trim();
    onChange({ observacao: trimmed });
    setEditingObservation(false);
  };

  const handleObservationCancel = () => {
    setObservationDraft(line.observacao || "");
    setEditingObservation(false);
  };

  return (
    <>
      <td className="px-2 py-1.5">
        <Input
          type="text"
          value={line.numero}
          onChange={(e) => onChange({ numero: e.target.value })}
          placeholder="Linha"
          className="h-7 min-w-[120px] px-2 text-xs"
        />
      </td>
      <td className="px-2 py-1.5">
        <TagSelector
          availableTags={availableTags}
          selectedTags={line.tipos}
          onChange={(tipos) => onChange({ tipos })}
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
            value={line.observacao}
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
              key={`obs-${line.id}-${editingObservation}`}
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
    </>
  );
}
