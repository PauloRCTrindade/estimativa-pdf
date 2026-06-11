export type TaskPriority = "p1" | "p2" | "p3" | "p4";

export interface KanbanChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface KanbanComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface KanbanAttachment {
  id: string;
  name: string;
  url: string;
  type: "image" | "file" | "link";
}

export interface KanbanColumn {
  id: string;
  title: string;
  position?: number;
}

export interface KanbanTask {
  id: string;
  cardId: string;
  parentId?: string | null;
  title: string;
  description?: string;
  completed?: boolean;
  priority?: TaskPriority;
  assignee?: string;
  dueDate?: string;
  tags?: string[];
  checklist?: KanbanChecklistItem[];
  comments?: KanbanComment[];
  attachments?: KanbanAttachment[];
  position?: number;
}

export interface KanbanCustomTask {
  id: string;
  title: string;
  description?: string;
  inicio?: string;
  termino?: string;
  completed?: boolean;
  subtasks?: KanbanCustomTask[];
  priority?: TaskPriority;
  assignee?: string;
  dueDate?: string;
  tags?: string[];
  checklist?: KanbanChecklistItem[];
  comments?: KanbanComment[];
  attachments?: KanbanAttachment[];
  position?: number;
}

export interface KanbanCard {
  id: string;
  estimateId?: string;
  title: string;
  columnId: string;
  notes?: string;
  tasks?: KanbanCustomTask[];
  description?: string;
  tags?: string[];
  dueDate?: string;
  priority?: TaskPriority;
  assignee?: string;
  isTemplate?: boolean;
  isDefaultTemplate?: boolean;
  isArchived?: boolean;
  completed?: boolean;
  position?: number;
}

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
  nome?: string;
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
  tipo?: 'estimativa-pacotes';
  pontos?: string;
  chgDias?: number;
  esteiraPreProd?: string;
  diasParados?: string;
  criadoEm?: string;
  atualizadoEm?: string;
};
