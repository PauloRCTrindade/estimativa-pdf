import type { Estimativa } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Listar todas as estimativas
 */
export async function listarEstimativas(): Promise<Estimativa[]> {
  try {
    const response = await fetch(`${API_URL}/api/estimativas`);
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
export async function obterEstimativa(id: string): Promise<Estimativa> {
  try {
    const response = await fetch(`${API_URL}/api/estimativas/${id}`);
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
export async function criarEstimativa(estimativa: Estimativa): Promise<Estimativa> {
  try {
    const response = await fetch(`${API_URL}/api/estimativas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
export async function atualizarEstimativa(id: string, estimativa: Partial<Estimativa>): Promise<Estimativa> {
  try {
    const response = await fetch(`${API_URL}/api/estimativas/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
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
export async function deletarEstimativa(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/api/estimativas/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('Erro ao deletar estimativa');
  } catch (error) {
    console.error('Erro ao deletar estimativa:', error);
    throw error;
  }
}
