export type AppForm = {
  titulo: string;
  arquiteto: string;
  inicio: string;
  releaseAlvo: string;
  diasParados: string;
  esteiraPreProd: string;
  chgDias: string;
  releases: string;
  feriados: string;
  pontos: string;
  premissas: string;
  restricoes: string;
  observacoes: string;
};

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
  pacotes?: Array<any>;
  tipo?: 'estimativa-rapida' | 'estimativa-pacotes';
  pontos?: string;
  chgDias?: number;
  esteiraPreProd?: string;
  diasParados?: string;
  criadoEm?: string;
  atualizadoEm?: string;
};
