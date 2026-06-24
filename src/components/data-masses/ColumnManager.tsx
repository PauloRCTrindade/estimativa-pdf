import { useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DataMassColumn } from "@/types";

interface ColumnManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: DataMassColumn[];
  onCreateColumn: (column: Omit<DataMassColumn, "id">) => Promise<void>;
  onDeleteColumn: (id: string) => Promise<void>;
}

export function ColumnManager({
  open,
  onOpenChange,
  columns,
  onCreateColumn,
  onDeleteColumn,
}: ColumnManagerProps) {
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState<DataMassColumn["type"]>("text");
  const [creating, setCreating] = useState(false);

  const customColumns = columns.filter((c) => !c.required);

  const handleCreate = async () => {
    const name = newColumnName.trim();
    if (!name) return;

    setCreating(true);
    try {
      await onCreateColumn({
        name,
        required: false,
        type: newColumnType,
      });
      setNewColumnName("");
      setNewColumnType("text");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar colunas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="mb-2 text-sm font-medium">Colunas obrigatórias</h4>
            <div className="flex flex-wrap gap-2">
              {["CPF", "Linha", "Tipo"].map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium">Colunas personalizadas</h4>
            {customColumns.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma coluna personalizada cadastrada.
              </p>
            ) : (
              <ul className="space-y-1">
                {customColumns.map((column) => (
                  <li
                    key={column.id}
                    className="flex items-center justify-between rounded-md border border-border/60 px-2 py-1.5"
                  >
                    <span className="text-sm">
                      {column.name}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({column.type})
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onDeleteColumn(column.id)}
                    >
                      <Trash className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-border/60 p-3">
            <h4 className="mb-2 text-sm font-medium">Adicionar coluna</h4>
            <div className="flex flex-col gap-2">
              <Input
                placeholder="Nome da coluna"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
              />
              <Select
                value={newColumnType}
                onValueChange={(value: DataMassColumn["type"]) =>
                  setNewColumnType(value)
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="tag">Tag</SelectItem>
                  <SelectItem value="date">Data</SelectItem>
                  <SelectItem value="select">Seleção</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                disabled={!newColumnName.trim() || creating}
                onClick={handleCreate}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Adicionar
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
