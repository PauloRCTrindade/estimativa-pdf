import { useState, useCallback } from 'react';
import type { Estimativa } from '../types';
import { useAuth } from './useAuth';
import {
  listarEstimativas,
  obterEstimativa,
  criarEstimativa,
  atualizarEstimativa,
  deletarEstimativa,
  buscarEstimativas,
} from '../services/api';

export function useEstimativas() {
  const { getToken } = useAuth();
  const [estimativas, setEstimativas] = useState<Estimativa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carregar todas as estimativas
   */
  const listar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const dados = await listarEstimativas(token || undefined);
      setEstimativas(dados);
      return dados;
    } catch (err: any) {
      const mensagem = err.message || 'Erro ao listar estimativas';
      setError(mensagem);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  /**
   * Obter uma estimativa
   */
  const obter = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const dado = await obterEstimativa(id, token || undefined);
      return dado;
    } catch (err: any) {
      const mensagem = err.message || 'Erro ao obter estimativa';
      setError(mensagem);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  /**
   * Criar uma estimativa
   */
  const criar = useCallback(async (estimativa: Estimativa) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const nova = await criarEstimativa(estimativa, token || undefined);
      setEstimativas(prev => [nova, ...prev]);
      return nova;
    } catch (err: any) {
      const mensagem = err.message || 'Erro ao criar estimativa';
      setError(mensagem);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  /**
   * Atualizar uma estimativa
   */
  const atualizar = useCallback(async (id: string, estimativa: Partial<Estimativa>) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const atualizada = await atualizarEstimativa(id, estimativa, token || undefined);
      setEstimativas(prev => prev.map(e => e.id === id ? atualizada : e));
      return atualizada;
    } catch (err: any) {
      const mensagem = err.message || 'Erro ao atualizar estimativa';
      setError(mensagem);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  /**
   * Deletar uma estimativa
   */
  const deletar = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      await deletarEstimativa(id, token || undefined);
      setEstimativas(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      const mensagem = err.message || 'Erro ao deletar estimativa';
      setError(mensagem);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  /**
   * Buscar estimativas com filtros (arquiteto e/ou título)
   */
  const buscarComFiltros = useCallback(async (filtros?: { arquiteto?: string; titulo?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const dados = await buscarEstimativas(filtros, token || undefined);
      return dados;
    } catch (err: any) {
      const mensagem = err.message || 'Erro ao buscar estimativas';
      setError(mensagem);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  return {
    estimativas,
    loading,
    error,
    listar,
    obter,
    criar,
    atualizar,
    deletar,
    buscarComFiltros,
  };
}
