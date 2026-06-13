import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  CALENDAR_CATEGORIES,
  getCalendarCategory,
  type CalendarCategoryKey,
} from "@/styles";

interface LegendCategoryProps {
  category: CalendarCategoryKey | string;
  variant?: "default" | "compact";
  className?: string;
}

interface LegendManualProps {
  color: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "compact";
  className?: string;
}

type LegendProps = LegendCategoryProps | LegendManualProps;

function isCategoryProps(props: LegendProps): props is LegendCategoryProps {
  return "category" in props;
}

export function Legend(props: LegendProps) {
  const { variant = "default", className } = props;

  const resolved = useLegendProps(props);
  if (!resolved) return null;

  const { icon, label, color } = resolved;
  const textColor = getTextColor(color);

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {icon && <span className="text-xs leading-none">{icon}</span>}
      <Badge
        variant="outline"
        className={cn(
          "inline-flex items-center border font-medium shadow-sm",
          variant === "compact" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"
        )}
        style={{
          backgroundColor: color,
          borderColor: color,
          color: textColor,
        }}
      >
        {label}
      </Badge>
    </span>
  );
}

function useLegendProps(props: LegendProps): { icon: React.ReactNode; label: string; color: string } | null {
  if (isCategoryProps(props)) {
    const category =
      CALENDAR_CATEGORIES[props.category as CalendarCategoryKey] ||
      getCalendarCategory(props.category);
    if (!category) return null;
    return { icon: <span>{category.icon}</span>, label: category.label, color: category.color };
  }
  return { icon: props.icon ?? null, label: props.label, color: props.color };
}

function getTextColor(hex: string): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return "#111827";
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  // Perceived brightness (YIQ)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 128 ? "#ffffff" : "#111827";
}
