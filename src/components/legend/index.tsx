import { Badge } from "@/components/ui/badge"

interface LegendProps {
  color: string
  label: string
  type?: "fill" | "border"
}

export function Legend({ color, label, type = "fill" }: LegendProps) {
  return (
    <table style={{ borderCollapse: "collapse", borderSpacing: 0, margin: 0, padding: 0, width: "auto" }}>
      <tbody>
        <tr>
          <td style={{ width: "1px", padding: "0 6px 0 0", verticalAlign: "middle" }}>
            <div
              data-legend-color="true"
              style={{
                width: "13px",
                height: "13px",
                borderRadius: "3px",
                backgroundColor: type === "fill" ? color : "transparent",
                border: `3px solid ${color}`,
                boxSizing: "border-box",
              }}
            />
          </td>
          <td style={{ verticalAlign: "middle", fontFamily: "Arial, Helvetica, sans-serif", color: color, whiteSpace: "nowrap", padding: 0 }}>
            {label}
          </td>
        </tr>
      </tbody>
    </table>
  );
}