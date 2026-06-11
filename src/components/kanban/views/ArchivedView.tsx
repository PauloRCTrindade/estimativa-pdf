import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Archive, ArrowCounterClockwise, Trash } from "@phosphor-icons/react";
import type { KanbanCard, KanbanColumn } from "@/types";

interface ArchivedViewProps {
  cards: KanbanCard[];
  columns: KanbanColumn[];
  onUnarchiveCard: (cardId: string) => void;
  onRemoveCard: (cardId: string) => void;
  onOpenCard?: (cardId: string) => void;
}

export function ArchivedView({
  cards,
  columns,
  onUnarchiveCard,
  onRemoveCard,
  onOpenCard,
}: ArchivedViewProps) {
  const archivedCards = cards
    .filter((c) => c.isArchived)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  if (archivedCards.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Archive className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Nenhum card arquivado</p>
            <p className="text-xs text-muted-foreground">
              Cards arquivados aparecerão aqui. Você pode arquivar um card a partir dos detalhes dele.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {archivedCards.map((card) => (
        <div
          key={card.id}
          className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
          onClick={() => onOpenCard?.(card.id)}
          style={{ cursor: onOpenCard ? "pointer" : "default" }}
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium line-clamp-2">{card.title}</h3>
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {columns.find((c) => c.id === card.columnId)?.title || "Sem coluna"}
            </Badge>
          </div>
          <div className="mt-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 flex-1 text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onUnarchiveCard(card.id);
              }}
            >
              <ArrowCounterClockwise className="h-3.5 w-3.5" />
              Restaurar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveCard(card.id);
              }}
            >
              <Trash className="h-3.5 w-3.5" />
              Deletar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
