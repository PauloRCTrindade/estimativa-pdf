const fs = require('fs');
const path = 'src/pages/kanban/index.tsx';
let content = fs.readFileSync(path, 'utf8');

const colorBlock = `/* ═══════════════════════════════════════════════════════════════════════════
   Cores
   ═══════════════════════════════════════════════════════════════════════════ */

const COLUMN_COLORS: Record<string, { dot: string; border: string; badge: string; line: string; label: string }> = {
  gray:    { dot: "bg-zinc-400",    border: "border-zinc-400/40",    badge: "bg-zinc-500/15 text-zinc-400",    line: "bg-zinc-400",    label: "Cinza" },
  blue:    { dot: "bg-blue-400",    border: "border-blue-400/40",    badge: "bg-blue-500/15 text-blue-400",    line: "bg-blue-400",    label: "Azul" },
  green:   { dot: "bg-emerald-400", border: "border-emerald-400/40", badge: "bg-emerald-500/15 text-emerald-400", line: "bg-emerald-400", label: "Verde" },
  purple:  { dot: "bg-violet-400",  border: "border-violet-400/40",  badge: "bg-violet-500/15 text-violet-400", line: "bg-violet-400",  label: "Roxo" },
  orange:  { dot: "bg-orange-400",  border: "border-orange-400/40",  badge: "bg-orange-500/15 text-orange-400", line: "bg-orange-400",  label: "Laranja" },
  red:     { dot: "bg-red-400",     border: "border-red-400/40",     badge: "bg-red-500/15 text-red-400",     line: "bg-red-400",     label: "Vermelho" },
  pink:    { dot: "bg-pink-400",    border: "border-pink-400/40",    badge: "bg-pink-500/15 text-pink-400",    line: "bg-pink-400",    label: "Rosa" },
  cyan:    { dot: "bg-cyan-400",    border: "border-cyan-400/40",    badge: "bg-cyan-500/15 text-cyan-400",    line: "bg-cyan-400",    label: "Turquesa" },
  yellow:  { dot: "bg-yellow-400",  border: "border-yellow-400/40",  badge: "bg-yellow-500/15 text-yellow-400", line: "bg-yellow-400",  label: "Amarelo" },
};

function getColumnColorClasses(colorKey?: string) {
  return COLUMN_COLORS[colorKey || "gray"] || COLUMN_COLORS.gray;
}

`;

const marker = `/* ═══════════════════════════════════════════════════════════════════════════
   Tipos
   ═══════════════════════════════════════════════════════════════════════════ */

export type TaskStatus`;

content = content.replace(marker, colorBlock + marker);

fs.writeFileSync(path, content);
console.log('done');
