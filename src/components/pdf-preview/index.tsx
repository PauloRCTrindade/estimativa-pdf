import { Section } from '../section'
import { Legend } from '../legend'
import { pdfStyles } from '../../styles'
import { formatBR, getTimelineBorder, } from '../../utils'
import { weekLabels } from '../../data'
import { COLORS } from '../../styles'
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
            <td style={pdfStyles.infoCell}><b>ARQUITETO:</b> {form.arquiteto}</td>
            <td style={pdfStyles.infoCell}><b>INÍCIO:</b> {form.inicio}</td>
            <td style={pdfStyles.infoCell}><b>TÉRMINO:</b> {formatBR(calculo.endDate)}</td>
          </tr>
          <tr>
            <td style={pdfStyles.infoCell}><b>ESFORÇO:</b> {totalDias} dias úteis</td>
            <td style={pdfStyles.infoCell} colSpan={2}><b>SUBIDA EM PRODUÇÃO:</b> {form.releaseAlvo || "-"}</td>
          </tr>
        </tbody>
      </table>

      <Section title="PONTOS DE ATENÇÃO" text={form.pontos} />
      <Section title="PREMISSAS" text={form.premissas} />
      <Section title="RESTRIÇÕES" text={form.restricoes} />
      <Section title="OBSERVAÇÕES" text={form.observacoes} />

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
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
        {timelineRows.map((row, rowIndex) => (
          <table key={`timeline-${rowIndex}`} style={pdfStyles.timelineTable}>
            <tbody>
              <tr>
                {row.map((day, index) => (
                  <td key={`week-${rowIndex}-${index}`} style={{
                    ...pdfStyles.timelineCell,
                    backgroundColor: day.isReleaseDay ? COLORS.releaseDay : COLORS.white,
                    color: day.isReleaseDay ? COLORS.white : pdfStyles.timelineCell.color,
                    fontWeight: day.isReleaseDay ? 700 : pdfStyles.timelineCell.fontWeight,
                  }}>{weekLabels[day.date.getDay()]}</td>
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
                {row.map((day, index) => (
                  <td
                    key={`color-${rowIndex}-${index}`}
                    title={day.tipo}
                    style={{
                      ...pdfStyles.timelineColorCell,
                      backgroundColor: day.color,
                      border: getTimelineBorder(day),
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
        <Legend color={COLORS.blocked} label="Projeto Impactado" />
        <Legend color={COLORS.esteiraPreProd} label="Esteira Pre Prod" type="border" />
        <Legend color={COLORS.chg} label="Trâmite CHG" type="border" />
        <Legend color={COLORS.releaseDay} label="Domingo da release" />
      </div>
    </div>

  );
}