import { Legend } from '../legend'
import { pdfStyles } from '../../styles'
import { weekLabels } from '../../data'
import { COLORS } from '../../styles'
export function TimeLine({ form, timelineRows }) {
  return (
    <div
      id="calendar-area"
      style={{
        position: "absolute",
        left: "-9999px",
        top: 0,
        width: "1123px",
        backgroundColor: COLORS.white,
        padding: "32px",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div style={pdfStyles.header}>
        <div style={{ fontSize: "13px", fontWeight: 700 }}>
          LINHA DO TEMPO
        </div>
        <div style={pdfStyles.title}>{form.titulo}</div>
      </div>

      <div style={{ marginTop: "20px" }}>
        {timelineRows.map((row, rowIndex) => (
          <table key={`calendar-${rowIndex}`} style={pdfStyles.timelineTable}>
            <tbody>
              <tr>
                {row.map((day, index) => (
                  <td key={`cal-week-${rowIndex}-${index}`} style={{
                    ...pdfStyles.timelineCell,
                    backgroundColor: day.isReleaseDay ? COLORS.releaseDay : COLORS.white,
                    color: day.isReleaseDay ? COLORS.white : pdfStyles.timelineCell.color,
                    fontWeight: day.isReleaseDay ? 700 : pdfStyles.timelineCell.fontWeight,
                  }}>
                    {weekLabels[day.date.getDay()]}
                  </td>
                ))}
              </tr>
              <tr>
                {row.map((day, index) => (
                  <td key={`cal-day-${rowIndex}-${index}`} style={{
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
                {row.map((day, index) => (
                  <td
                    key={`cal-color-${rowIndex}-${index}`}
                    title={day.isEsteiraPreProd ? `${day.tipo} + Esteira Pre Prod` : day.tipo}
                    style={{
                      ...pdfStyles.timelineColorCell,
                      backgroundColor: day.color,
                      border: day.isChg
                        ? `3px solid ${COLORS.chg}`
                        : day.isEsteiraPreProd
                          ? `3px solid ${COLORS.esteiraPreProd}`
                          : pdfStyles.timelineColorCell.border,
                    }}
                  />
                ))}
              </tr>
            </tbody>
          </table>
        ))}
      </div>

      <div style={pdfStyles.legendWrapper}>
        <Legend color={COLORS.desenvolvimento} label="Desenvolvimento" />
        <Legend color={COLORS.subida} label="Subida em Pre Prod" />
        <Legend color={COLORS.testes} label="QA Compass" />
        <Legend color={COLORS.weekend} label="Fim de semana" />
        <Legend color={COLORS.postRelease} label="Tombamento" />
        <Legend color={COLORS.holiday} label="Feriado" />
        <Legend color={COLORS.blocked} label="Projeto parado" />
        <Legend color={COLORS.esteiraPreProd} label="Esteira Pre Prod" type="border" />
        <Legend color={COLORS.chg} label="Trâmite CHG" type="border" />
        <Legend color={COLORS.releaseTarget} label="Subida em Produção" />
        <Legend color={COLORS.releaseDay} label="Domingo da release" />
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