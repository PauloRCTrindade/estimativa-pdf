import { Badge } from "@/components/ui/badge"

interface LegendProps {
  color: string
  label: string
  type?: "fill" | "border"
}

export function Legend({ color, label, type = "fill" }: LegendProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-4 h-4 rounded"
        style={{
          backgroundColor: type === "fill" ? color : "transparent",
          border: `3px solid ${color}`,
        }}
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}