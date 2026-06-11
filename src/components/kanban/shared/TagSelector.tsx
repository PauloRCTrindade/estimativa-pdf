import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Plus, X, Tag, Check } from "@phosphor-icons/react";

interface TagSelectorProps {
  availableTags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export function TagSelector({
  availableTags,
  selectedTags,
  onChange,
  disabled,
}: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const searchNormalized = search.trim().toLowerCase();

  const allTags = useMemo(() => {
    const set = new Set([...availableTags, ...selectedTags]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [availableTags, selectedTags]);

  const filtered = useMemo(() => {
    if (!searchNormalized) return allTags;
    return allTags.filter((t) => t.toLowerCase().includes(searchNormalized));
  }, [allTags, searchNormalized]);

  const exactMatch = useMemo(() => {
    if (!searchNormalized) return true;
    return allTags.some((t) => t.toLowerCase() === searchNormalized);
  }, [allTags, searchNormalized]);

  const canCreate = searchNormalized && !exactMatch;

  function toggleTag(tag: string) {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    onChange(next);
  }

  function createAndSelect() {
    const name = search.trim();
    if (!name) return;
    if (!selectedTags.includes(name)) {
      onChange([...selectedTags, name]);
    }
    setSearch("");
  }

  function removeTag(tag: string) {
    onChange(selectedTags.filter((t) => t !== tag));
  }

  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Etiquetas
      </label>
      <div className="flex flex-wrap gap-1.5">
        {(selectedTags ?? []).map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            <Tag className="h-3 w-3" />
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="ml-0.5 rounded-sm hover:bg-muted"
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-3 w-3" />
              Adicionar
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-2">
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar etiquetas..."
                className="h-8 text-sm"
                autoComplete="off"
              />
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {filtered.map((tag) => {
                  const checked = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        checked
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/40 text-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                      <span className="truncate">{tag}</span>
                    </button>
                  );
                })}
                {filtered.length === 0 && !canCreate && (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">
                    Nenhuma etiqueta encontrada.
                  </p>
                )}
                {canCreate && (
                  <button
                    onClick={() => {
                      createAndSelect();
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-primary transition-colors hover:bg-accent"
                  >
                    <Plus className="h-4 w-4" />
                    Criar etiqueta "{search.trim()}"
                  </button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
