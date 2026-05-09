import { Section } from '../section'
import { Legend } from '../legend'
import { pdfStyles } from '../../styles'
import { formatBR, getTimelineBorder, } from '../../utils'
import { weekLabels } from '../../data'
import { COLORS } from '../../styles'

function isReleaseDeploymentDay(day: Date, releaseAlvoStr: string): boolean {
  if (!releaseAlvoStr) return false;
  const [dia, mes, ano] = releaseAlvoStr.split('/').map(Number);
  return day.getDate() === dia && day.getMonth() === mes - 1 && day.getFullYear() === ano;
}

export function PdfPreview({ form, totalDias, calculo, timelineRows }) {
  return (
    <div id="pdf-area" style={pdfStyles.page}>
      <div style={pdfStyles.header}>
        <div style={{ fontSize: "13px", fontWeight: 700 }}>ESTIMATIVA DE DESENVOLVIMENTO</div>
        <div style={pdfStyles.title}>{form.titulo}</div>
      </div>

      <table style={{ ...pdfStyles.table, marginTop: "16px" }}>
        <tbody>
          <tr>
            <td style={pdfStyles.infoCell}><b>👤 ARQUITETO:</b> <br/> {form.arquiteto}</td>
            <td style={pdfStyles.infoCell}><b>📅 INÍCIO:</b> <br/> {form.inicio}</td>
            <td style={pdfStyles.infoCell}><b>📅 TÉRMINO:</b> <br/> {formatBR(calculo.endDate)}</td>
          </tr>
          <tr>
            <td style={pdfStyles.infoCell}><b>⏱️ ESFORÇO:</b> <br/> {totalDias} dias úteis</td>
            <td style={pdfStyles.infoCell} colSpan={2}><b>🚀 SUBIDA EM PRODUÇÃO:</b> <br/> {form.releaseAlvo || "-"}</td>
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
            <th style={pdfStyles.thCenter}>DIAS ÚTEIS</th>
            <th style={pdfStyles.thCenter}>ETAPA</th>
            <th style={pdfStyles.thCenter}>INÍCIO</th>
            <th style={pdfStyles.thCenter}>TÉRMINO</th>
          </tr>
        </thead>
        <tbody>
          {calculo.atividadesCalculadas.map((atividade) => (
            <tr key={atividade.id}>
              <td style={pdfStyles.td}>{atividade.nome}</td>
              <td style={pdfStyles.tdCenter}>{atividade.dias}</td>
              <td style={pdfStyles.tdCenter}>{atividade.etapa}</td>
              <td style={pdfStyles.tdCenter}>{formatBR(atividade.inicio)}</td>
              <td style={pdfStyles.tdCenter}>{formatBR(atividade.termino)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ ...pdfStyles.blackBar, marginTop: "20px" }}>LINHA DO TEMPO</div>
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
                    {row.map((day, index) => (
                      <td key={`rocket-${rowIndex}-${index}`} style={{
                        ...pdfStyles.timelineCell,
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
                      
                      if (day.isChg) {
                        return (
                          <td
                            key={`color-${rowIndex}-${index}`}
                            title={day.isEsteiraPreProd ? `${day.tipo} + Esteira Pre Prod + CHG` : `${day.tipo} + CHG`}
                            style={{
                              ...baseStyle,
                              border: `3px solid ${COLORS.chg}`,
                            }}
                          />
                        );
                      }
                      
                      if (day.isEsteiraPreProd) {
                        return (
                          <td
                            key={`color-${rowIndex}-${index}`}
                            title={`${day.tipo} + Esteira Pre Prod`}
                            style={{
                              ...baseStyle,
                              border: `3px solid ${COLORS.esteiraPreProd}`,
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


      <div style={pdfStyles.legendWrapper}>
        <Legend color={COLORS.desenvolvimento} label="✓ Desenvolvimento" />
        <Legend color={COLORS.subida} label="✓ Subida em Pre Prod" />
        <Legend color={COLORS.testes} label="✓ QA Compass" />
        <Legend color={COLORS.weekend} label="✗ Fim de semana" />
        <Legend color={COLORS.postRelease} label="✗ Tombamento" />
        <Legend color={COLORS.holiday} label="✗ Feriado" />
        <Legend color={COLORS.blocked} label="✗ Projeto Impactado" />
        <Legend color={COLORS.releaseTarget} label="🚀 Subida em Produção" />
        <Legend color={COLORS.esteiraPreProd} label="▬ Esteira Pre Prod" type="border" />
        <Legend color={COLORS.chg} label="▬ Trâmite CHG" type="border" />
        <Legend color={COLORS.releaseDay} label="● Domingo da release" />
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