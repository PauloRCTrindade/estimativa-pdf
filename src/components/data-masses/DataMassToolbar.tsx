import { Copy, MagnifyingGlass, Plus, Table, Tag as TagIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { DataMassTag } from "@/types";
import { getContrastColor } from "./utils";

interface DataMassToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedTags: string[];
  onToggleTagFilter: (tag: string) => void;
  availableTags: DataMassTag[];
  onAddRow: () => void;
  onCopyMassas: () => void;
  onOpenColumnManager: () => void;
  onOpenTagManager: () => void;
}

export function DataMassToolbar({
  searchTerm,
  onSearchChange,
  selectedTags,
  onToggleTagFilter,
  availableTags,
  onAddRow,
  onCopyMassas,
  onOpenColumnManager,
  onOpenTagManager,
}: DataMassToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por CPF, linha, tag ou observação..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenColumnManager}
          >
            <Table className="mr-1.5 h-4 w-4" />
            Colunas
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenTagManager}
          >
            <TagIcon className="mr-1.5 h-4 w-4" />
            Tags
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCopyMassas}
          >
            <Copy className="mr-1.5 h-4 w-4" />
            Copiar massas
          </Button>
          <Button type="button" size="sm" onClick={onAddRow}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nova massa
          </Button>
        </div>
      </div>

      {availableTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Filtrar por tipo:</span>
          {availableTags.map((tag) => {
            const selected = selectedTags.includes(tag.name);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onToggleTagFilter(tag.name)}
                className="transition-opacity hover:opacity-80"
              >
                <Badge
                  variant={selected ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  style={
                    selected
                      ? {
                          backgroundColor: tag.color,
                          color:
                            getContrastColor(tag.color) === "text-black"
                              ? "#000"
                              : "#fff",
                          borderColor: tag.color,
                        }
                      : {}
                  }
                >
                  {tag.name}
                </Badge>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
