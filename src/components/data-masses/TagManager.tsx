import { Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { DataMassTag } from "@/types";

interface TagManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: DataMassTag[];
  onDeleteTag: (id: string) => Promise<void>;
}

export function TagManager({
  open,
  onOpenChange,
  tags,
  onDeleteTag,
}: TagManagerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar tags</DialogTitle>
        </DialogHeader>

        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma tag cadastrada. Crie tags ao editar o campo Tipo de uma massa.
          </p>
        ) : (
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="flex items-center justify-between rounded-md border border-border/60 px-2 py-1.5"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDeleteTag(tag.id)}
                >
                  <Trash className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
