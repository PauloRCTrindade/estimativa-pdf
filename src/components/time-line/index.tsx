import { pdfStyles } from '../../styles'
import { weekLabels } from '../../data'
import { COLORS } from '../../styles'

function isReleaseDeploymentDay(day: Date, releaseAlvoStr: string): boolean {
  if (!releaseAlvoStr) return false;
  const [dia, mes, ano] = releaseAlvoStr.split('/').map(Number);
  return day.getDate() === dia && day.getMonth() === mes - 1 && day.getFullYear() === ano;
}

export function TimeLine({ form, timelineRows, visible = false }) {
  const containerStyle = visible
    ? {
        width: "100%",
        backgroundColor: COLORS.white,
        color: COLORS.text,
        fontFamily: "Arial, Helvetica, sans-serif",
        overflowX: "auto" as const,
      }
    : {
        position: "absolute" as const,
        left: "-9999px",
        top: 0,
        width: "1123px",
        backgroundColor: COLORS.white,
        color: COLORS.text,
        padding: "32px",
        fontFamily: "Arial, Helvetica, sans-serif",
      };

  return (
    <div
      id="calendar-area"
      style={containerStyle}
    >
      {!visible && <div style={pdfStyles.header}>
        <div style={{ fontSize: "13px", fontWeight: 700 }}>CALENDÁRIO DE ATIVIDADES</div>
        <div style={pdfStyles.title}>{form.titulo}</div>
      </div>}

      {visible && (
        <div style={{ ...pdfStyles.blackBar, marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>CALENDÁRIO DE ATIVIDADES</span>
          {form.titulo && <span style={{ fontSize: "12px", fontWeight: 400, opacity: 0.85 }}>{form.titulo}</span>}
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
        {timelineRows.map((row, rowIndex) => {
          // Get months for this row
          const months = new Set<string>();
          row.forEach(day => {
            const monthYear = new Date(day.date.getFullYear(), day.date.getMonth()).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
            months.add(monthYear.charAt(0).toUpperCase() + monthYear.slice(1));
          });
          
          const isAlternate = rowIndex % 2 === 1;
          
          return (
            <div key={`row-${rowIndex}`} style={{ marginBottom: "24px" }}>
              {/* Month header */}
              <div style={{ display: "flex", gap: "2px", marginBottom: "8px" }}>
                {row.map((day, index) => {
                  const isFirstOfMonth = index === 0 || row[index - 1].date.getMonth() !== day.date.getMonth();
                  const monthName = day.date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
                  
                  return (
                    <div
                      key={`month-${rowIndex}-${index}`}
                      style={{
                        width: "64px",
                        height: "26px",
                        textAlign: "center",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#666",
                        paddingTop: "2px",
                        boxSizing: "border-box",
                      }}
                    >
                      {isFirstOfMonth ? monthName : ""}
                    </div>
                  );
                })}
              </div>
              
              {/* Timeline table */}
              <table key={`calendar-${rowIndex}`} style={{
                ...pdfStyles.timelineTable,
                backgroundColor: isAlternate ? "#f9fafb" : "#ffffff",
              }}>
                <tbody>
                  <tr>
                    {row.map((day, index) => (
                      <td key={`cal-rocket-${rowIndex}-${index}`} style={{
                        ...pdfStyles.timelineCell,
                        width: "64px",
                        height: "24px",
                        lineHeight: "24px",
                        fontSize: "16px",
                        backgroundColor: "transparent",
                        textAlign: "center",
                        verticalAlign: "middle",
                        border: "none",
                        borderBottom: "none",
                        color: isReleaseDeploymentDay(day.date, form.releaseAlvo) ? COLORS.releaseTarget : "transparent",
                      }}>
                        {isReleaseDeploymentDay(day.date, form.releaseAlvo) ? "🚀" : ""}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    {row.map((day, index) => (
                      <td key={`cal-week-${rowIndex}-${index}`} style={{
                        ...pdfStyles.timelineCell,
                        width: "64px",
                        height: "44px",
                        lineHeight: "44px",
                        fontSize: "12px",
                        backgroundColor: day.isReleaseDay ? COLORS.releaseDay : COLORS.white,
                        color: day.isReleaseDay ? COLORS.white : pdfStyles.timelineCell.color,
                        fontWeight: day.isReleaseDay ? 700 : pdfStyles.timelineCell.fontWeight,
                      }}>
                        {weekLabels[day.date.getDay()].substring(0, 3).toUpperCase()}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    {row.map((day, index) => (
                      <td key={`cal-day-${rowIndex}-${index}`} style={{
                        ...pdfStyles.timelineWeekCell,
                        width: "64px",
                        height: "40px",
                        lineHeight: "40px",
                        fontSize: "13px",
                        backgroundColor: day.isReleaseDay ? COLORS.releaseDay : COLORS.white,
                        color: day.isReleaseDay ? COLORS.white : pdfStyles.timelineWeekCell.color,
                        fontWeight: day.isReleaseDay ? 700 : pdfStyles.timelineWeekCell.fontWeight,
                      }}>
                        {String(day.date.getDate()).padStart(2, "0")}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    {row.map((day, index) => {
                      const baseStyle = {
                        ...pdfStyles.timelineColorCell,
                        width: "64px",
                        height: "40px",
                        backgroundColor: day.color,
                      };

                      const workLabel = day.workBorderColor
                        ? ` + Atuação`
                        : "";
                      
                      // data-color-cell preserva a cor nos overrides CSS do dark mode
                      const isColored = day.color !== COLORS.white;
                      const colorAttr = isColored ? { "data-color-cell": "true" } : {};

                      if (day.isChg) {
                        return (
                          <td
                            key={`cal-color-${rowIndex}-${index}`}
                            title={day.isEsteiraPreProd ? `${day.tipo} + Esteira Pre Prod + CHG${workLabel}` : `${day.tipo} + CHG${workLabel}`}
                            data-chg-border="true"
                            {...colorAttr}
                            style={{
                              ...baseStyle,
                              border: `3px solid ${COLORS.chg}`,
                              ...(day.workBorderColor ? { outline: `2px solid ${day.workBorderColor}`, outlineOffset: "2px" } : {}),
                            }}
                          />
                        );
                      }
                      
                      if (day.isEsteiraPreProd) {
                        return (
                          <td
                            key={`cal-color-${rowIndex}-${index}`}
                            title={`${day.tipo} + Esteira Pre Prod${workLabel}`}
                            data-esteira-border="true"
                            {...colorAttr}
                            style={{
                              ...baseStyle,
                              border: `3px solid ${COLORS.esteiraPreProd}`,
                              ...(day.workBorderColor ? { outline: `2px solid ${day.workBorderColor}`, outlineOffset: "2px" } : {}),
                            }}
                          />
                        );
                      }

                      if (day.workBorderColor) {
                        return (
                          <td
                            key={`cal-color-${rowIndex}-${index}`}
                            title={`${day.tipo}${workLabel}`}
                            data-work-border="true"
                            {...colorAttr}
                            style={{
                              ...baseStyle,
                              border: `3px solid ${day.workBorderColor}`,
                            }}
                          />
                        );
                      }
                      
                      return (
                        <td
                          key={`cal-color-${rowIndex}-${index}`}
                          title={day.tipo}
                          {...colorAttr}
                          style={baseStyle}
                        />
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {form.observacoes && (
        <div style={{ marginTop: "20px" }}>
          <div style={pdfStyles.blackBar}>OBSERVAÇÕES</div>
          <div style={pdfStyles.sectionContent}>
            {String(form.observacoes)
              .split("\n")
              .filter(Boolean)
              .map((line, index) => (
                <div key={`obs-calendar-${index}`} style={pdfStyles.sectionLine}>
                  {line}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>

  );
}