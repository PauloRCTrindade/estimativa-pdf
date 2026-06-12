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
  getTagColor?: (tag: string) => { bg: string; text: string; border: string } | string;
  setTagColor?: (tag: string, color: string) => void;
}

export function TagSelector({
  availableTags,
  selectedTags,
  onChange,
  disabled,
  getTagColor,
  setTagColor,
}: TagSelectorProps) {
  function resolveTagColor(tag: string): { bg: string; text: string; border: string } {
    if (getTagColor) {
      const result = getTagColor(tag);
      if (typeof result === "string") {
        return { bg: result + "20", text: result, border: result + "40" };
      }
      return result;
    }
    return { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
  }
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
        {(selectedTags ?? []).map((tag) => {
          const tc = resolveTagColor(tag);
          return (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 pr-1"
              style={{ backgroundColor: tc.bg.startsWith("bg-") ? undefined : tc.bg, color: tc.text.startsWith("text-") ? undefined : tc.text, borderColor: tc.border.startsWith("border-") ? undefined : tc.border }}
            >
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
          );
        })}
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
                  const tc = resolveTagColor(tag);
                  return (
                    <div
                      key={tag}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        checked
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/40 text-foreground"
                      )}
                    >
                      <button
                        onClick={() => toggleTag(tag)}
                        className="flex flex-1 items-center gap-2 text-left"
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
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: tc.text.startsWith("text-") ? undefined : tc.text }}
                        />
                        <span className="truncate">{tag}</span>
                      </button>
                      {setTagColor && (
                        <input
                          type="color"
                          value={tc.text.startsWith("#") ? tc.text : "#6366f1"}
                          onChange={(e) => setTagColor(tag, e.target.value)}
                          className="h-4 w-4 cursor-pointer rounded border-0 p-0 shrink-0"
                          title="Alterar cor"
                        />
                      )}
                    </div>
                  );
                })}
                {filtered.length === 0 && !canCreate && (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">
                    Nenhuma etiqueta encontrada.
                  </p>
                )}
                {canCreate && (
                  <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
                    <button
                      onClick={() => {
                        createAndSelect();
                        setOpen(false);
                      }}
                      className="flex flex-1 items-center gap-2 text-sm text-primary transition-colors hover:bg-accent rounded-md px-2 py-1.5 -ml-2"
                    >
                      <Plus className="h-4 w-4 shrink-0" />
                      Criar etiqueta "{search.trim()}"
                    </button>
                    {setTagColor && (
                      <input
                        type="color"
                        defaultValue="#6366f1"
                        onChange={(e) => setTagColor(search.trim(), e.target.value)}
                        className="h-5 w-5 cursor-pointer rounded border-0 p-0 shrink-0"
                        title="Escolher cor"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
