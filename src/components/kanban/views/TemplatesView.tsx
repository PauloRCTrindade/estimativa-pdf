import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Trash, Stack, Plus, Check } from "@phosphor-icons/react";
import type { KanbanCard, KanbanColumn } from "@/types";

interface TemplatesViewProps {
  cards: KanbanCard[];
  columns: KanbanColumn[];
  onOpenCard: (cardId: string) => void;
  onRemoveCard: (cardId: string) => void;
  onUseTemplate: (templateCardId: string) => Promise<void> | void;
  onCreateTemplate: () => void;
}

export function TemplatesView({
  cards,
  columns,
  onOpenCard,
  onRemoveCard,
  onUseTemplate,
  onCreateTemplate,
}: TemplatesViewProps) {
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const templateCards = cards
    .filter((c) => c.isTemplate)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const handleUseTemplate = async (cardId: string) => {
    setSettingDefaultId(cardId);
    try {
      await onUseTemplate(cardId);
    } finally {
      setSettingDefaultId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Create template button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {templateCards.length} {templateCards.length === 1 ? "template" : "templates"}
        </p>
        <Button size="sm" className="h-8 text-xs gap-1" onClick={onCreateTemplate}>
          <Plus className="h-3.5 w-3.5" />
          Criar template
        </Button>
      </div>

      {templateCards.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Stack className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Nenhum template</p>
              <p className="text-xs text-muted-foreground">
                Crie um template para armazenar uma estrutura de tarefas reutilizável.
              </p>
            </div>
            <Button size="sm" className="h-8 text-xs gap-1 mt-1" onClick={onCreateTemplate}>
              <Plus className="h-3.5 w-3.5" />
              Criar template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templateCards.map((card) => (
            <div
              key={card.id}
              className="flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.02] dark:bg-amber-500/[0.03] p-4 shadow-sm hover:shadow-md transition-shadow"
              onClick={() => onOpenCard(card.id)}
              style={{ cursor: "pointer" }}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium line-clamp-2">{card.title}</h3>
              </div>

              {card.isDefaultTemplate && (
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 w-fit">
                  Template padrão
                </span>
              )}

              <div className="mt-auto flex items-center gap-2">
                <Button
                  variant={card.isDefaultTemplate ? "default" : "outline"}
                  size="sm"
                  className="h-7 flex-1 text-xs gap-1"
                  disabled={card.isDefaultTemplate || settingDefaultId === card.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUseTemplate(card.id);
                  }}
                >
                  {card.isDefaultTemplate ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {card.isDefaultTemplate ? "Padrão" : settingDefaultId === card.id ? "Definindo..." : "Usar como base"}
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
      )}
    </div>
  );
}
