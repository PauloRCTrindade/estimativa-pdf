import { Section } from '../section'
import { pdfStyles } from '../../styles'
import { formatBR, parseDateBR } from '../../utils'
import { weekLabels } from '../../data'
import { COLORS, CALENDAR_CATEGORIES, CALENDAR_GROUPS, getCalendarCategory } from '../../styles'

function getTimelineIcon(tipo: string): string {
  const category = getCalendarCategory(tipo);
  if (category?.key === "producao") return "🚀";
  if (category?.key === "impactado") return "⚠";
  return "";
}

function processEtapaGroups(atividades: any[]) {
  const result: Array<any> = [];
  let i = 0;
  let groupIndex = 0;
  while (i < atividades.length) {
    const etapa = String(atividades[i].etapa || "1");
    let j = i;
    while (j < atividades.length && String(atividades[j].etapa || "1") === etapa) j++;
    const group = atividades.slice(i, j);
    const maxDias = Math.max(...group.map((a: any) => Number(a.dias) || 0));
    const size = j - i;
    const bg = groupIndex % 2 === 0 ? "#ffffff" : "#f3f4f6";
    for (let k = 0; k < size; k++) {
      result.push({
        ...group[k],
        _etapaRowSpan: size,
        _etapaMaxDias: maxDias,
        _isFirstInEtapa: k === 0,
        _isLastInEtapa: k === size - 1,
        _groupBg: bg,
      });
    }
    groupIndex++;
    i = j;
  }
  return result;
}

export function PdfPreview({ form, totalDias, calculo, timelineRows, hideTimeline = false, pdfId = "pdf-area", fullWidth = false }) {
  return (
    <div id={pdfId} style={{ ...pdfStyles.page, ...(fullWidth ? { width: "100%", minHeight: "unset" } : {}) }}>
      <div style={pdfStyles.header}>
        <div style={{ fontSize: "13px", fontWeight: 700 }}>ESTIMATIVA DE DESENVOLVIMENTO</div>
        <div style={pdfStyles.title}>{form.titulo}</div>
      </div>

      <table style={{ ...pdfStyles.table, marginTop: "16px" }}>
        <tbody>
          <tr>
            <td style={pdfStyles.infoCell}><b>ARQUITETO:</b> <br/> {form.arquiteto}</td>
            <td style={pdfStyles.infoCell}><b>INÍCIO:</b> <br/> {formatBR(parseDateBR(form.inicio))}</td>
            <td style={pdfStyles.infoCell}><b>TÉRMINO:</b> <br/> {formatBR(calculo.endDate)}</td>
          </tr>
          <tr>
            <td style={pdfStyles.infoCell}><b>ESFORÇO:</b> <br/> {totalDias} dias úteis</td>
            <td style={pdfStyles.infoCell} colSpan={2}><b>SUBIDA EM PRODUÇÃO:</b> <br/> {formatBR(parseDateBR(form.releaseAlvo)) || "-"}</td>
          </tr>
        </tbody>
      </table>

      {form.pontos && <Section title="PONTOS DE ATENÇÃO" text={form.pontos} />}
      {form.premissas && <Section title="PREMISSAS" text={form.premissas} />}
      {form.restricoes && <Section title="RESTRIÇÕES" text={form.restricoes} />}

      <div style={{ ...pdfStyles.blackBar, marginTop: "16px" }}>ATIVIDADES</div>
      <table style={pdfStyles.table}>
        <thead>
          <tr>
            <th style={pdfStyles.th}>TAREFA</th>
            <th style={pdfStyles.thCenter}>ETAPA</th>
            <th style={pdfStyles.thCenter}>DIAS ÚTEIS</th>
            <th style={pdfStyles.thCenter}>INÍCIO</th>
            <th style={pdfStyles.thCenter}>TÉRMINO</th>
          </tr>
        </thead>
        <tbody>
          {calculo.atividadesCalculadas[0]?.pacoteId
            ? (() => {
                // Agrupar por pacote
                const grupos: { pacoteId: string; pacoteNome: string; pacoteCodigo: string; atividades: typeof calculo.atividadesCalculadas }[] = [];
                for (const a of calculo.atividadesCalculadas) {
                  const last = grupos[grupos.length - 1];
                  if (last && last.pacoteId === a.pacoteId) {
                    last.atividades.push(a);
                  } else {
                    grupos.push({ pacoteId: a.pacoteId, pacoteNome: a.pacoteNome, pacoteCodigo: a.pacoteCodigo, atividades: [a] });
                  }
                }
                return grupos.map((grupo) => (
                  <>
                    <tr key={`pkg-${grupo.pacoteId}`}>
                      <td colSpan={5} style={{ ...pdfStyles.td, backgroundColor: "#1c1c1e", color: "#ffffff", fontWeight: 700, fontSize: "11px", padding: "6px 8px" }}>
                        {grupo.pacoteCodigo ? `${grupo.pacoteCodigo} — ` : ""}{grupo.pacoteNome}
                      </td>
                    </tr>
                    {processEtapaGroups(grupo.atividades).map((atividade) => (
                      <tr key={atividade.id}>
                        <td style={{ ...pdfStyles.td, paddingLeft: "20px", backgroundColor: atividade._groupBg, borderBottom: atividade._isLastInEtapa ? pdfStyles.td.borderBottom : "none" }}>{atividade.nome}</td>
                        {atividade._isFirstInEtapa && (
                          <td rowSpan={atividade._etapaRowSpan} style={{ ...pdfStyles.tdCenter, verticalAlign: "middle", backgroundColor: atividade._groupBg }}>
                            {atividade.etapa}
                          </td>
                        )}
                        {atividade._isFirstInEtapa && (
                          <td rowSpan={atividade._etapaRowSpan} style={{ ...pdfStyles.tdCenter, verticalAlign: "middle", backgroundColor: atividade._groupBg }}>
                            {atividade._etapaMaxDias}
                          </td>
                        )}
                        <td style={{ ...pdfStyles.tdCenter, backgroundColor: atividade._groupBg, borderBottom: atividade._isLastInEtapa ? pdfStyles.tdCenter.borderBottom : "none" }}>{formatBR(atividade.inicio)}</td>
                        <td style={{ ...pdfStyles.tdCenter, backgroundColor: atividade._groupBg, borderBottom: atividade._isLastInEtapa ? pdfStyles.tdCenter.borderBottom : "none" }}>{formatBR(atividade.termino)}</td>
                      </tr>
                    ))}
                  </>
                ));
              })()
            : processEtapaGroups(calculo.atividadesCalculadas).map((atividade) => (
                <tr key={atividade.id}>
                  <td style={{ ...pdfStyles.td, backgroundColor: atividade._groupBg, borderBottom: atividade._isLastInEtapa ? pdfStyles.td.borderBottom : "none" }}>{atividade.nome}</td>
                  {atividade._isFirstInEtapa && (
                    <td rowSpan={atividade._etapaRowSpan} style={{ ...pdfStyles.tdCenter, verticalAlign: "middle", backgroundColor: atividade._groupBg }}>
                      {atividade.etapa}
                    </td>
                  )}
                  {atividade._isFirstInEtapa && (
                    <td rowSpan={atividade._etapaRowSpan} style={{ ...pdfStyles.tdCenter, verticalAlign: "middle", backgroundColor: atividade._groupBg }}>
                      {atividade._etapaMaxDias}
                    </td>
                  )}
                  <td style={{ ...pdfStyles.tdCenter, backgroundColor: atividade._groupBg, borderBottom: atividade._isLastInEtapa ? pdfStyles.tdCenter.borderBottom : "none" }}>{formatBR(atividade.inicio)}</td>
                  <td style={{ ...pdfStyles.tdCenter, backgroundColor: atividade._groupBg, borderBottom: atividade._isLastInEtapa ? pdfStyles.tdCenter.borderBottom : "none" }}>{formatBR(atividade.termino)}</td>
                </tr>
              ))
          }
        </tbody>
      </table>

      {!hideTimeline && <>
      <div style={{ ...pdfStyles.blackBar, marginTop: "20px" }}>CALENDÁRIO DE ATIVIDADES</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
        {timelineRows.map((row, rowIndex) => {
          // Get months for this row
          const months = new Set<string>();
          row.forEach(day => {
            const monthYear = new Date(day.date.getFullYear(), day.date.getMonth()).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
            months.add(monthYear.charAt(0).toUpperCase() + monthYear.slice(1));
          });
          
          const isAlternate = rowIndex % 2 === 1;
          
          return (
            <div key={`row-${rowIndex}`}>
              {/* Month header */}
              <div style={{ display: "flex", gap: "2px", marginBottom: "6px" }}>
                {row.map((day, index) => {
                  const isFirstOfMonth = index === 0 || row[index - 1].date.getMonth() !== day.date.getMonth();
                  const monthName = day.date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
                  
                  return (
                    <div
                      key={`month-${rowIndex}-${index}`}
                      style={{
                        width: "56px",
                        height: "24px",
                        textAlign: "center",
                        fontSize: "10px",
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
              <table style={{
                ...pdfStyles.timelineTable,
                backgroundColor: isAlternate ? "#f9fafb" : "#ffffff",
              }}>
                <tbody>
                  <tr>
                    {row.map((day, index) => {
                      const icon = getTimelineIcon(day.tipo);
                      return (
                        <td key={`icon-${rowIndex}-${index}`} style={{
                          ...pdfStyles.timelineCell,
                          height: "24px",
                          lineHeight: "24px",
                          fontSize: "14px",
                          backgroundColor: "transparent",
                          textAlign: "center",
                          verticalAlign: "middle",
                          border: "none",
                          borderBottom: "none",
                          color: icon ? COLORS.text : "transparent",
                        }}>
                          {icon}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    {row.map((day, index) => (
                      <td key={`week-${rowIndex}-${index}`} style={{
                        ...pdfStyles.timelineCell,
                        backgroundColor: day.isReleaseDay ? COLORS.releaseDay : COLORS.white,
                        color: day.isReleaseDay ? COLORS.white : pdfStyles.timelineCell.color,
                        fontWeight: day.isReleaseDay ? 700 : pdfStyles.timelineCell.fontWeight,
                      }}>{weekLabels[day.date.getDay()].substring(0, 3).toUpperCase()}</td>
                    ))}
                  </tr>
                  <tr>
                    {row.map((day, index) => (
                      <td key={`day-${rowIndex}-${index}`} style={{
                        ...pdfStyles.timelineWeekCell,
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
                        backgroundColor: day.color,
                      };

                      const workLabel = day.workBorderColor ? ` + Atuação` : "";
                      
                      if (day.isChg) {
                        return (
                          <td
                            key={`color-${rowIndex}-${index}`}
                            title={day.isEsteiraPreProd ? `${day.tipo} + Esteira Pre Prod + CHG${workLabel}` : `${day.tipo} + CHG${workLabel}`}
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
                            key={`color-${rowIndex}-${index}`}
                            title={`${day.tipo} + Esteira Pre Prod${workLabel}`}
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
                            key={`color-${rowIndex}-${index}`}
                            title={`${day.tipo}${workLabel}`}
                            style={{
                              ...baseStyle,
                              border: `3px solid ${day.workBorderColor}`,
                            }}
                          />
                        );
                      }
                      
                      return (
                        <td
                          key={`color-${rowIndex}-${index}`}
                          title={day.tipo}
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
      </> }

      {!hideTimeline && <div style={{ marginTop: "24px", backgroundColor: "#f9fafb", padding: "16px", borderRadius: "4px", border: "1px solid #e5e7eb", fontSize: "11px" }}>
        {(() => {
          const groups = CALENDAR_GROUPS.map((group) => ({
            ...group,
            items: Object.values(CALENDAR_CATEGORIES).filter((c) => c.group === group.key),
          }));

          function badgeTextColor(hex: string): string {
            const normalized = hex.replace("#", "");
            const r = parseInt(normalized.slice(0, 2), 16);
            const g = parseInt(normalized.slice(2, 4), 16);
            const b = parseInt(normalized.slice(4, 6), 16);
            const yiq = (r * 299 + g * 587 + b * 114) / 1000;
            return yiq < 128 ? "#ffffff" : "#111827";
          }

          return (
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.key}>
                    <td style={{ width: "1px", padding: "6px 10px 6px 0", verticalAlign: "middle", whiteSpace: "nowrap", fontFamily: "Arial, Helvetica, sans-serif", fontWeight: 700, fontSize: "10px", textTransform: "uppercase", color: "#6b7280" }}>
                      {group.label}
                    </td>
                    <td style={{ padding: "4px 0", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {group.items.map((category) => (
                          <span
                            key={category.key}
                            data-legend-color="true"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontFamily: "Arial, Helvetica, sans-serif",
                            }}
                          >
                            <span style={{ fontSize: "10px" }}>{category.icon}</span>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "3px 8px",
                                borderRadius: "999px",
                                backgroundColor: category.color,
                                border: `1px solid ${category.color}`,
                                color: badgeTextColor(category.color),
                                fontSize: "10px",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {category.label}
                            </span>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })()}
      </div>}
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