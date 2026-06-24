import * as React from "react";
import { cn } from "@/lib/utils";
import { isHtmlContent, plainTextToHtml, sanitizeHtml } from "@/lib/rich-text";

interface RichTextViewerProps {
  value?: string;
  className?: string;
  emptyClassName?: string;
  placeholder?: string;
}

export function RichTextViewer({
  value,
  className,
  emptyClassName,
  placeholder,
}: RichTextViewerProps) {
  if (!value || !value.trim()) {
    if (!placeholder) return null;
    return (
      <div
        className={cn(
          "text-sm text-muted-foreground italic",
          emptyClassName,
          className
        )}
      >
        {placeholder}
      </div>
    );
  }

  const isHtml = isHtmlContent(value);
  const html = isHtml ? sanitizeHtml(value) : plainTextToHtml(value);

  if (!isHtml) {
    return (
      <div
        className={cn(
          "whitespace-pre-wrap break-words text-sm leading-relaxed",
          className
        )}
      >
        {value}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rich-text-content break-words text-sm leading-relaxed",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
