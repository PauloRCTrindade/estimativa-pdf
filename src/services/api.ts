import type { Estimativa } from '../types';

// Em produção (Vercel): usa URL relativa (mesmo domínio)
// Em desenvolvimento: usa localhost:3000
const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3000' : '');

const getHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Listar todas as estimativas
 */
export async function listarEstimativas(token?: string): Promise<Estimativa[]> {
  try {
    const response = await fetch(`${API_URL}/api/estimativas`, {
      headers: getHeaders(token),
    });
    if (!response.ok) throw new Error('Erro ao listar estimativas');
    return await response.json();
  } catch (error) {
    console.error('Erro ao listar estimativas:', error);
    throw error;
  }
}

/**
 * Obter uma estimativa específica
 */
export async function obterEstimativa(id: string, token?: string): Promise<Estimativa> {
  try {
    const response = await fetch(`${API_URL}/api/estimativas/${id}`, {
      headers: getHeaders(token),
    });
    if (!response.ok) throw new Error('Estimativa não encontrada');
    return await response.json();
  } catch (error) {
    console.error('Erro ao obter estimativa:', error);
    throw error;
  }
}

/**
 * Criar uma nova estimativa
 */
export async function criarEstimativa(estimativa: Estimativa, token?: string): Promise<Estimativa> {
  try {
    const response = await fetch(`${API_URL}/api/estimativas`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(estimativa),
    });

    if (!response.ok) throw new Error('Erro ao criar estimativa');
    return await response.json();
  } catch (error) {
    console.error('Erro ao criar estimativa:', error);
    throw error;
  }
}

/**
 * Atualizar uma estimativa
 */
export async function atualizarEstimativa(id: string, estimativa: Partial<Estimativa>, token?: string): Promise<Estimativa> {
  try {
    const response = await fetch(`${API_URL}/api/estimativas/${id}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(estimativa),
    });

    if (!response.ok) throw new Error('Erro ao atualizar estimativa');
    return await response.json();
  } catch (error) {
    console.error('Erro ao atualizar estimativa:', error);
    throw error;
  }
}

/**
 * Deletar uma estimativa
 */
export async function deletarEstimativa(id: string, token?: string): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/api/estimativas/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });

    if (!response.ok) throw new Error('Erro ao deletar estimativa');
  } catch (error) {
    console.error('Erro ao deletar estimativa:', error);
    throw error;
  }
}
