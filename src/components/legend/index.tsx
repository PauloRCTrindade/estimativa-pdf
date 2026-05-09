import { Badge } from "@/components/ui/badge"

interface LegendProps {
  color: string
  label: string
  type?: "fill" | "border"
}

export function Legend({ color, label, type = "fill" }: LegendProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <div
        style={{
          width: "16px",
          height: "16px",
          borderRadius: "4px",
          backgroundColor: type === "fill" ? color : "transparent",
          border: `3px solid ${color}`,
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: "14px",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        {label}
      </span>
    </div>
  );
}