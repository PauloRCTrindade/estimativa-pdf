export type Estimativa = {
  id?: string;
  titulo: string;
  arquiteto: string;
  inicio: string;
  releaseAlvo: string;
  feriados: string;
  releases: string;
  premissas: string;
  restricoes: string;
  observacoes: string;
  atividades: Array<any>;
  pontos?: string;
  chgDias?: number;
  esteiraPreProd?: string;
  diasParados?: string;
  criadoEm?: string;
  atualizadoEm?: string;
};
