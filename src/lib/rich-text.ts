import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p",
  "br",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "ul",
  "ol",
  "li",
  "a",
  "span",
];

const ALLOWED_ATTR = ["href", "target", "rel", "style"];

const ALLOWED_STYLE_PROPERTIES = ["color"];

function sanitizeStyle(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const declarations = value.split(";");
  const filtered: string[] = [];
  for (const decl of declarations) {
    const colonIndex = decl.indexOf(":");
    if (colonIndex === -1) continue;
    const prop = decl.slice(0, colonIndex).trim().toLowerCase();
    const val = decl.slice(colonIndex + 1).trim();
    if (ALLOWED_STYLE_PROPERTIES.includes(prop) && /^#[0-9a-f]{6}$/i.test(val)) {
      filtered.push(`${prop}: ${val.toLowerCase()}`);
    }
  }
  return filtered.length > 0 ? filtered.join("; ") : undefined;
}

export function sanitizeHtml(dirty: string): string {
  const clean = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_TRUSTED_TYPE: false,
  });

  if (typeof document === "undefined") return clean;

  const temp = document.createElement("div");
  temp.innerHTML = clean;

  const spans = temp.querySelectorAll("*[style]");
  spans.forEach((el) => {
    const sanitized = sanitizeStyle(el.getAttribute("style") || undefined);
    if (sanitized) {
      el.setAttribute("style", sanitized);
    } else {
      el.removeAttribute("style");
    }
  });

  const links = temp.querySelectorAll("a");
  links.forEach((el) => {
    const href = el.getAttribute("href") || "";
    if (!href.startsWith("http://") && !href.startsWith("https://") && !href.startsWith("mailto:")) {
      el.setAttribute("href", "https://" + href);
    }
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener noreferrer");
  });

  return temp.innerHTML;
}

export function isHtmlContent(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^\s*<[a-z][\s\S]*>/i.test(value);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function plainTextToHtml(text: string): string {
  if (!text) return "";
  const paragraphs = text.split(/\n\n+/);
  if (paragraphs.length === 1 && !text.includes("\n")) {
    return `<p>${escapeHtml(text)}</p>`;
  }
  return paragraphs
    .map((paragraph) => {
      const lines = paragraph.split("\n");
      const withBreaks = lines.map((line) => escapeHtml(line)).join("<br>");
      return `<p>${withBreaks}</p>`;
    })
    .join("");
}

export function ensureHtml(value: string | undefined): string {
  if (!value) return "";
  if (isHtmlContent(value)) return sanitizeHtml(value);
  return plainTextToHtml(value);
}

export function stripHtml(html: string): string {
  if (!html) return "";
  if (typeof document === "undefined") {
    return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  }
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || "";
}

export const RICH_TEXT_COLORS = [
  { label: "Preto", value: "#111111" },
  { label: "Vermelho", value: "#ef4444" },
  { label: "Laranja", value: "#f97316" },
  { label: "Amarelo", value: "#eab308" },
  { label: "Verde", value: "#10b981" },
  { label: "Azul", value: "#3b82f6" },
  { label: "Roxo", value: "#8b5cf6" },
  { label: "Rosa", value: "#ec4899" },
  { label: "Cinza", value: "#6b7283" },
];
