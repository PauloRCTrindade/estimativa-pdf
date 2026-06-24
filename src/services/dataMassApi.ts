import type { DataMass, DataMassColumn, DataMassTag } from '../types';

const buildApiBase = () => {
  const apiUrl = import.meta.env.VITE_API_URL?.trim() || '';
  if (!apiUrl) return '/api';
  if (apiUrl.endsWith('/api')) return apiUrl;
  return `${apiUrl}/api`;
};

const API_BASE = buildApiBase();

const getHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Erro ${response.status}: ${body || response.statusText}`);
  }
  return response.json() as Promise<T>;
}

// ================================
// Massas
// ================================

export async function listarMassas(token?: string): Promise<DataMass[]> {
  const response = await fetch(`${API_BASE}/data-masses`, {
    headers: getHeaders(token),
  });
  return handleResponse<DataMass[]>(response);
}

export async function criarMassa(massa: Omit<DataMass, 'id' | 'createdAt' | 'updatedAt'>, token?: string): Promise<DataMass> {
  const response = await fetch(`${API_BASE}/data-masses`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(massa),
  });
  return handleResponse<DataMass>(response);
}

export async function atualizarMassa(id: string, massa: Partial<DataMass>, token?: string): Promise<DataMass> {
  const response = await fetch(`${API_BASE}/data-masses/${id}`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(massa),
  });
  return handleResponse<DataMass>(response);
}

export async function deletarMassa(id: string, token?: string): Promise<void> {
  const response = await fetch(`${API_BASE}/data-masses/${id}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Erro ${response.status}: ${body || response.statusText}`);
  }
}

// ================================
// Colunas personalizadas
// ================================

export async function listarColunas(token?: string): Promise<DataMassColumn[]> {
  const response = await fetch(`${API_BASE}/data-mass-columns`, {
    headers: getHeaders(token),
  });
  return handleResponse<DataMassColumn[]>(response);
}

export async function criarColuna(coluna: Omit<DataMassColumn, 'id'>, token?: string): Promise<DataMassColumn> {
  const response = await fetch(`${API_BASE}/data-mass-columns`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(coluna),
  });
  return handleResponse<DataMassColumn>(response);
}

export async function atualizarColuna(id: string, coluna: Partial<DataMassColumn>, token?: string): Promise<DataMassColumn> {
  const response = await fetch(`${API_BASE}/data-mass-columns/${id}`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(coluna),
  });
  return handleResponse<DataMassColumn>(response);
}

export async function deletarColuna(id: string, token?: string): Promise<void> {
  const response = await fetch(`${API_BASE}/data-mass-columns/${id}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Erro ${response.status}: ${body || response.statusText}`);
  }
}

// ================================
// Tags
// ================================

export async function listarTags(token?: string): Promise<DataMassTag[]> {
  const response = await fetch(`${API_BASE}/data-mass-tags`, {
    headers: getHeaders(token),
  });
  return handleResponse<DataMassTag[]>(response);
}

export async function criarTag(tag: Omit<DataMassTag, 'id'>, token?: string): Promise<DataMassTag> {
  const response = await fetch(`${API_BASE}/data-mass-tags`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(tag),
  });
  return handleResponse<DataMassTag>(response);
}

export async function atualizarTag(id: string, tag: Partial<DataMassTag>, token?: string): Promise<DataMassTag> {
  const response = await fetch(`${API_BASE}/data-mass-tags/${id}`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(tag),
  });
  return handleResponse<DataMassTag>(response);
}

export async function deletarTag(id: string, token?: string): Promise<void> {
  const response = await fetch(`${API_BASE}/data-mass-tags/${id}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Erro ${response.status}: ${body || response.statusText}`);
  }
}
