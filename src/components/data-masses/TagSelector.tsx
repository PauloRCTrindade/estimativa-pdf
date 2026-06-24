import { useState } from "react";
import { Plus, Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DataMassTag } from "@/types";
import { getContrastColor } from "./utils";

interface TagSelectorProps {
  availableTags: DataMassTag[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  onCreateTag: (tag: Omit<DataMassTag, "id">) => Promise<DataMassTag | undefined>;
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#64748b", "#94a3b8",
];

export function TagSelector({
  availableTags,
  selectedTags,
  onChange,
  onCreateTag,
}: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onChange(selectedTags.filter((t) => t !== tagName));
    } else {
      onChange([...selectedTags, tagName]);
    }
  };

  const handleCreateTag = async () => {
    const name = newTagName.trim();
    if (!name) return;

    const existing = availableTags.find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      if (!selectedTags.includes(existing.name)) {
        onChange([...selectedTags, existing.name]);
      }
      setNewTagName("");
      setOpen(false);
      return;
    }

    setCreating(true);
    try {
      const created = await onCreateTag({ name, color: newTagColor });
      if (created) {
        onChange([...selectedTags, created.name]);
        setNewTagName("");
        setOpen(false);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex min-h-[28px] w-full flex-wrap items-center gap-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-left hover:border-input hover:bg-accent/30 focus-visible:border-ring focus-visible:outline-hidden"
        >
          {selectedTags.length === 0 ? (
            <span className="text-xs text-muted-foreground">Selecionar...</span>
          ) : (
            selectedTags.map((tagName) => {
              const tag = availableTags.find((t) => t.name === tagName);
              const color = tag?.color || "#64748b";
              return (
                <Badge
                  key={tagName}
                  className="text-xs"
                  style={{
                    backgroundColor: color,
                    color: getContrastColor(color) === "text-black" ? "#000" : "#fff",
                    borderColor: color,
                  }}
                >
                  {tagName}
                </Badge>
              );
            })
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="mb-2 text-sm font-medium">Tags</div>
        <div className="mb-3 flex max-h-48 flex-col gap-1 overflow-y-auto">
          {availableTags.length === 0 && (
            <span className="text-xs text-muted-foreground">
              Nenhuma tag cadastrada.
            </span>
          )}
          {availableTags.map((tag) => {
            const selected = selectedTags.includes(tag.name);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.name)}
                className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors ${
                  selected ? "bg-accent" : "hover:bg-accent/40"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </span>
                {selected && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>

        <div className="border-t pt-2">
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">
            Nova tag
          </div>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Nome da tag"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="h-8 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateTag();
                }
              }}
            />
          </div>
          <div className="mb-2 flex flex-wrap gap-1">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setNewTagColor(color)}
                className={`h-5 w-5 rounded-full ring-1 ring-transparent transition-all ${
                  newTagColor === color ? "ring-foreground scale-110" : ""
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Cor ${color}`}
              />
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={!newTagName.trim() || creating}
            onClick={handleCreateTag}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Criar tag
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
