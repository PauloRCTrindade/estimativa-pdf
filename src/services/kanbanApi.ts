import type { KanbanColumn, KanbanCard, KanbanTask } from "@/types";

const buildApiBase = () => {
  const apiUrl = import.meta.env.VITE_API_URL?.trim() || "";
  if (!apiUrl) return "/api";
  if (apiUrl.endsWith("/api")) return apiUrl;
  return `${apiUrl}/api`;
};

const API_BASE = buildApiBase();

const getHeaders = (token?: string) => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};

/* ── Board ─────────────────────────────────────────────────────────────── */

export async function carregarBoard(token?: string): Promise<{
  columns: KanbanColumn[];
  cards: KanbanCard[];
  tasks: KanbanTask[];
}> {
  const response = await fetch(`${API_BASE}/kanban/board`, {
    headers: getHeaders(token),
  });
  if (!response.ok) throw new Error("Erro ao carregar board");
  return response.json();
}

/* ── Columns ───────────────────────────────────────────────────────────── */

export async function listarColumns(token?: string): Promise<KanbanColumn[]> {
  const response = await fetch(`${API_BASE}/kanban/columns`, {
    headers: getHeaders(token),
  });
  if (!response.ok) throw new Error("Erro ao listar colunas");
  return response.json();
}

export async function criarColumn(
  column: Omit<KanbanColumn, "id">,
  token?: string
): Promise<KanbanColumn> {
  const response = await fetch(`${API_BASE}/kanban/columns`, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify(column),
  });
  if (!response.ok) throw new Error("Erro ao criar coluna");
  return response.json();
}

export async function atualizarColumn(
  id: string,
  column: Partial<KanbanColumn>,
  token?: string
): Promise<KanbanColumn> {
  const response = await fetch(`${API_BASE}/kanban/columns/${id}`, {
    method: "PUT",
    headers: getHeaders(token),
    body: JSON.stringify(column),
  });
  if (!response.ok) throw new Error("Erro ao atualizar coluna");
  return response.json();
}

export async function deletarColumn(id: string, token?: string): Promise<void> {
  const response = await fetch(`${API_BASE}/kanban/columns/${id}`, {
    method: "DELETE",
    headers: getHeaders(token),
  });
  if (!response.ok) throw new Error("Erro ao deletar coluna");
}

/* ── Cards ─────────────────────────────────────────────────────────────── */

export async function listarCards(token?: string): Promise<KanbanCard[]> {
  const response = await fetch(`${API_BASE}/kanban/cards`, {
    headers: getHeaders(token),
  });
  if (!response.ok) throw new Error("Erro ao listar cards");
  return response.json();
}

export async function criarCard(
  card: Omit<KanbanCard, "id" | "tasks"> & Partial<Pick<KanbanCard, "tasks">>,
  token?: string
): Promise<KanbanCard> {
  const response = await fetch(`${API_BASE}/kanban/cards`, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify(card),
  });
  if (!response.ok) throw new Error("Erro ao criar card");
  return response.json();
}

export async function atualizarCard(
  id: string,
  card: Partial<KanbanCard>,
  token?: string
): Promise<KanbanCard> {
  const response = await fetch(`${API_BASE}/kanban/cards/${id}`, {
    method: "PUT",
    headers: getHeaders(token),
    body: JSON.stringify(card),
  });
  if (!response.ok) throw new Error("Erro ao atualizar card");
  return response.json();
}

export async function deletarCard(id: string, token?: string): Promise<void> {
  const response = await fetch(`${API_BASE}/kanban/cards/${id}`, {
    method: "DELETE",
    headers: getHeaders(token),
  });
  if (!response.ok) throw new Error("Erro ao deletar card");
}

/* ── Tasks ─────────────────────────────────────────────────────────────── */

export async function listarTasks(token?: string): Promise<KanbanTask[]> {
  const response = await fetch(`${API_BASE}/kanban/tasks`, {
    headers: getHeaders(token),
  });
  if (!response.ok) throw new Error("Erro ao listar tasks");
  return response.json();
}

export async function criarTask(
  task: Omit<KanbanTask, "id">,
  token?: string
): Promise<KanbanTask> {
  const response = await fetch(`${API_BASE}/kanban/tasks`, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify(task),
  });
  if (!response.ok) throw new Error("Erro ao criar task");
  return response.json();
}

export async function atualizarTask(
  id: string,
  task: Partial<KanbanTask>,
  token?: string
): Promise<KanbanTask> {
  const response = await fetch(`${API_BASE}/kanban/tasks/${id}`, {
    method: "PUT",
    headers: getHeaders(token),
    body: JSON.stringify(task),
  });
  if (!response.ok) throw new Error("Erro ao atualizar task");
  return response.json();
}

export async function deletarTask(id: string, token?: string): Promise<void> {
  const response = await fetch(`${API_BASE}/kanban/tasks/${id}`, {
    method: "DELETE",
    headers: getHeaders(token),
  });
  if (!response.ok) throw new Error("Erro ao deletar task");
}
