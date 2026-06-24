import * as React from "react";
import { Smiley } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂",
  "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋",
  "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩",
  "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣",
  "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬",
  "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗",
  "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯",
  "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐",
  "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈",
  "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾",
  "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿",
  "😾", "👍", "👎", "👏", "🙌", "👐", "🤝", "🤲", "🤜", "🤛",
  "✊", "👊", "🤞", "✌️", "🤟", "🤘", "👌", "🤌", "🤏", "👋",
  "✋", "🖐️", "🖖", "👇", "👆", "👉", "👈", "🤙", "💪", "🦾",
  "🧠", "👀", "👁️", "👅", "👄", "❤️", "🧡", "💛", "💚", "💙",
  "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗",
  "💖", "💘", "💝", "✅", "❌", "➕", "➖", "➗", "❓", "❗",
  "🔥", "⭐", "✨", "💯", "💥", "💫", "💦", "💨", "🕳️", "💣",
  "💬", "👁️‍🗨️", "🗨️", "🗯️", "💭", "💤", "🎉", "🎊", "🎁", "🎈",
];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

export function EmojiPicker({ onEmojiSelect, disabled }: EmojiPickerProps) {
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
          title="Inserir emoji"
        >
          <Smiley className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="grid max-h-60 grid-cols-8 gap-1 overflow-y-auto p-1">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onEmojiSelect(emoji);
                setOpen(false);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-lg hover:bg-muted"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
