import * as React from "react";
import { TextAa } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RICH_TEXT_COLORS } from "@/lib/rich-text";

interface ColorPickerProps {
  onColorSelect: (color: string) => void;
  disabled?: boolean;
}

export function ColorPicker({ onColorSelect, disabled }: ColorPickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={disabled}
          title="Cor do texto"
        >
          <TextAa className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-3 gap-1.5">
          {RICH_TEXT_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => {
                onColorSelect(color.value);
                setOpen(false);
              }}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted"
              title={color.label}
            >
              <span
                className="inline-block h-4 w-4 rounded-full border border-black/10"
                style={{ backgroundColor: color.value }}
              />
              <span className="text-muted-foreground">{color.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
