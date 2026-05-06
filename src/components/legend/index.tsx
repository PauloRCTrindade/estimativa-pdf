import {pdfStyles} from '../../styles'
export function Legend({ color, label, type = "fill" }) {
  return (
    <div style={pdfStyles.legendItem}>
      <span
        style={{
          ...pdfStyles.legendBox,
          backgroundColor: type === "fill" ? color : "transparent",
          border: `3px solid ${color}`,
        }}
      />
      <span>{label}</span>
    </div>
  );
}