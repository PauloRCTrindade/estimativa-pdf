import {pdfStyles} from '../../styles'
export function Section({ title, text }) {
  return (
    <div style={{ marginTop: "16px" }}>
      <div style={pdfStyles.blackBar}>{title}</div>
      <div style={pdfStyles.sectionContent}>
        {String(text || "").split("\n").filter(Boolean).map((line, index) => (
          <div key={`${title}-${index}`} style={pdfStyles.sectionLine}>{line}</div>
        ))}
      </div>
    </div>
  );
}