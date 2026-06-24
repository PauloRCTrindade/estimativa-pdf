import * as React from "react";
import {
  TextB,
  TextItalic,
  TextUnderline,
  ListBullets,
  ListNumbers,
  Link as LinkIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ensureHtml, sanitizeHtml } from "@/lib/rich-text";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { ColorPicker } from "@/components/ui/color-picker";

interface RichTextEditorProps {
  defaultValue?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: string;
}

function exec(cmd: string, value: string = "") {
  document.execCommand(cmd, false, value);
}

function insertTextAtCursor(text: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    document.execCommand("insertText", false, text);
    return;
  }
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.setEndAfter(node);
  selection.removeAllRanges();
  selection.addRange(range);
}

function ensureParagraphStructure(editor: HTMLElement) {
  if (!editor.innerHTML.trim() || editor.innerHTML === "<br>") {
    editor.innerHTML = "<p><br></p>";
    return;
  }
  const hasBlock = editor.querySelector("p, div, ul, ol, li, h1, h2, h3, h4, h5, h6");
  if (!hasBlock) {
    editor.innerHTML = `<p>${editor.innerHTML}</p>`;
  }
}

export function RichTextEditor({
  defaultValue,
  onChange,
  placeholder,
  disabled,
  className,
  minHeight = "120px",
}: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = React.useState(() => !defaultValue || !defaultValue.trim());

  React.useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = defaultValue ? ensureHtml(defaultValue) : "<p><br></p>";
      setIsEmpty(!editorRef.current.textContent?.trim());
    }
    // Intencionalmente executa apenas na montagem; defaultValue é o valor inicial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notifyChange = React.useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const html = sanitizeHtml(editor.innerHTML);
    setIsEmpty(!editor.textContent?.trim());
    onChange?.(html);
  }, [onChange]);

  const handleInput = React.useCallback(() => {
    notifyChange();
  }, [notifyChange]);

  const handleBlur = React.useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    ensureParagraphStructure(editor);
    notifyChange();
  }, [notifyChange]);

  const handleFormat = React.useCallback(
    (cmd: string, value?: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      if (disabled) return;
      editorRef.current?.focus();
      exec(cmd, value || "");
      handleInput();
    },
    [disabled, handleInput]
  );

  const handleEmojiSelect = React.useCallback(
    (emoji: string) => {
      if (disabled) return;
      editorRef.current?.focus();
      insertTextAtCursor(emoji);
      handleInput();
    },
    [disabled, handleInput]
  );

  const handleColorSelect = React.useCallback(
    (color: string) => {
      if (disabled) return;
      editorRef.current?.focus();
      exec("foreColor", color);
      handleInput();
    },
    [disabled, handleInput]
  );

  const handleLink = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (disabled) return;
      editorRef.current?.focus();
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      const url = window.prompt(
        "Informe o link:",
        selectedText && /^https?:\/\//.test(selectedText) ? selectedText : "https://"
      );
      if (url) {
        exec("createLink", url);
        handleInput();
      }
    },
    [disabled, handleInput]
  );

  const handlePaste = React.useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
      notifyChange();
    },
    [notifyChange]
  );

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 px-1.5 py-1">
        <ToolbarButton
          onClick={handleFormat("bold")}
          active={false}
          disabled={disabled}
          title="Negrito (Ctrl+B)"
        >
          <TextB className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={handleFormat("italic")}
          active={false}
          disabled={disabled}
          title="Itálico (Ctrl+I)"
        >
          <TextItalic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={handleFormat("underline")}
          active={false}
          disabled={disabled}
          title="Sublinhado (Ctrl+U)"
        >
          <TextUnderline className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          onClick={handleFormat("insertUnorderedList")}
          active={false}
          disabled={disabled}
          title="Lista com marcadores"
        >
          <ListBullets className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={handleFormat("insertOrderedList")}
          active={false}
          disabled={disabled}
          title="Lista numerada"
        >
          <ListNumbers className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <EmojiPicker onEmojiSelect={handleEmojiSelect} disabled={disabled} />
        <ColorPicker onColorSelect={handleColorSelect} disabled={disabled} />
        <ToolbarButton
          onClick={handleLink}
          active={false}
          disabled={disabled}
          title="Inserir link"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <div className="relative">
        {placeholder && isEmpty && (
          <div className="pointer-events-none absolute left-3 top-2 select-none text-sm text-muted-foreground">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleBlur}
          onPaste={handlePaste}
          className="w-full resize-y overflow-auto rounded-b-lg px-3 py-2 text-sm leading-relaxed outline-none"
          style={{ minHeight }}
          role="textbox"
          aria-multiline="true"
        />
      </div>
    </div>
  );
}

interface ToolbarButtonProps extends React.ComponentProps<"button"> {
  active?: boolean;
}

function ToolbarButton({
  className,
  active,
  children,
  ...props
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "h-7 w-7",
        active && "bg-accent text-accent-foreground",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-4 w-px bg-border" />;
}
