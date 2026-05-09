import { useState, useCallback } from 'react';
import {
  listarEstimativas,
  obterEstimativa,
  criarEstimativa,
  atualizarEstimativa,
  deletarEstimativa,
} from '../services/api';

type Estimativa = {
  id?: string;
  titulo: string;
  arquiteto: string;
  inicio: string;
  releaseAlvo: string;
  [key: string]: any;
};

export function useEstimativas() {
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
      const dados = await listarEstimativas();
      setEstimativas(dados);
      return dados;
    } catch (err: any) {
      const mensagem = err.message || 'Erro ao listar estimativas';
      setError(mensagem);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obter uma estimativa
   */
  const obter = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const dado = await obterEstimativa(id);
      return dado;
    } catch (err: any) {
      const mensagem = err.message || 'Erro ao obter estimativa';
      setError(mensagem);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Criar uma estimativa
   */
  const criar = useCallback(async (estimativa: Estimativa) => {
    setLoading(true);
    setError(null);
    try {
      const nova = await criarEstimativa(estimativa);
      setEstimativas(prev => [nova, ...prev]);
      return nova;
    } catch (err: any) {
      const mensagem = err.message || 'Erro ao criar estimativa';
      setError(mensagem);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Atualizar uma estimativa
   */
  const atualizar = useCallback(async (id: string, estimativa: Partial<Estimativa>) => {
    setLoading(true);
    setError(null);
    try {
      const atualizada = await atualizarEstimativa(id, estimativa);
      setEstimativas(prev => prev.map(e => e.id === id ? atualizada : e));
      return atualizada;
    } catch (err: any) {
      const mensagem = err.message || 'Erro ao atualizar estimativa';
      setError(mensagem);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Deletar uma estimativa
   */
  const deletar = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await deletarEstimativa(id);
      setEstimativas(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      const mensagem = err.message || 'Erro ao deletar estimativa';
      setError(mensagem);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    estimativas,
    loading,
    error,
    listar,
    obter,
    criar,
    atualizar,
    deletar,
  };
}
