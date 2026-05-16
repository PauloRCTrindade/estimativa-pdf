import type { Estimativa } from '../types';

// Construir URL base da API
// - Em produção (Vercel): usa /api (mesmo domínio) - VITE_API_URL deve estar VAZIO
// - Em desenvolvimento: usa http://localhost:3000 - VITE_API_URL = http://localhost:3000
const buildApiBase = () => {
  const apiUrl = import.meta.env.VITE_API_URL?.trim() || '';
  
  // Se vazio, usar relativo (produção no Vercel)
  if (!apiUrl) {
    return '/api';
  }
  
  // Se já tem /api no final, não duplicar
  if (apiUrl.endsWith('/api')) {
    return apiUrl;
  }
  
  // Senão, adicionar /api
  return `${apiUrl}/api`;
};

const API_BASE = buildApiBase();

// Debug: log no console para verificar URL em produção
if (typeof window !== 'undefined') {
  console.log('🔧 API_BASE configurado:', API_BASE);
}

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
    const response = await fetch(`${API_BASE}/estimativas`, {
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
 * Buscar estimativas por arquiteto e/ou título
 */
export async function buscarEstimativas(filtros?: { arquiteto?: string; titulo?: string }, token?: string): Promise<Estimativa[]> {
  try {
    const url = new URL(`${API_BASE}/estimativas`, window.location.origin);
    if (filtros?.arquiteto) {
      url.searchParams.append('arquiteto', filtros.arquiteto);
    }
    if (filtros?.titulo) {
      url.searchParams.append('titulo', filtros.titulo);
    }
    
    const response = await fetch(url.toString(), {
      headers: getHeaders(token),
    });
    if (!response.ok) throw new Error('Erro ao buscar estimativas');
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar estimativas:', error);
    throw error;
  }
}

/**
 * Buscar estimativas por arquiteto (compatibilidade)
 */
export async function buscarEstimativasPorArquiteto(arquiteto: string, token?: string): Promise<Estimativa[]> {
  return buscarEstimativas({ arquiteto }, token);
}

/**
 * Obter uma estimativa específica
 */
export async function obterEstimativa(id: string, token?: string): Promise<Estimativa> {
  try {
    const response = await fetch(`${API_BASE}/estimativas/${id}`, {
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
    const response = await fetch(`${API_BASE}/estimativas`, {
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
    const response = await fetch(`${API_BASE}/estimativas/${id}`, {
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
    const response = await fetch(`${API_BASE}/estimativas/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });

    if (!response.ok) throw new Error('Erro ao deletar estimativa');
  } catch (error) {
    console.error('Erro ao deletar estimativa:', error);
    throw error;
  }
}
