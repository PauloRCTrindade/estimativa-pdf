import { useState, useCallback } from 'react';
import type { DataMass, DataMassColumn, DataMassTag } from '../types';
import { useAuth } from './useAuth';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err) || 'Erro desconhecido';
}
import {
  listarMassas,
  criarMassa,
  atualizarMassa,
  deletarMassa,
  listarColunas,
  criarColuna,
  atualizarColuna,
  deletarColuna,
  listarTags,
  criarTag,
  atualizarTag,
  deletarTag,
} from '../services/dataMassApi';

export function useDataMasses() {
  const { getToken } = useAuth();
  const [massas, setMassas] = useState<DataMass[]>([]);
  const [colunas, setColunas] = useState<DataMassColumn[]>([]);
  const [tags, setTags] = useState<DataMassTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTokenSafe = useCallback(async () => {
    try {
      return await getToken();
    } catch {
      return undefined;
    }
  }, [getToken]);

  // ================================
  // Carregar dados
  // ================================

  const carregarTudo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenSafe();
      const [massasData, colunasData, tagsData] = await Promise.all([
        listarMassas(token || undefined),
        listarColunas(token || undefined),
        listarTags(token || undefined),
      ]);
      setMassas(massasData);
      setColunas(colunasData);
      setTags(tagsData);
    } catch (err: unknown) {
      const mensagem = getErrorMessage(err) || 'Erro ao carregar massas de dados';
      setError(mensagem);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getTokenSafe]);

  // ================================
  // Massas
  // ================================

  const criar = useCallback(async (massa: Omit<DataMass, 'id' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenSafe();
      const nova = await criarMassa(massa, token || undefined);
      setMassas(prev => [nova, ...prev]);
      return nova;
    } catch (err: unknown) {
      const mensagem = getErrorMessage(err) || 'Erro ao criar massa';
      setError(mensagem);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getTokenSafe]);

  const atualizar = useCallback(async (id: string, massa: Partial<DataMass>) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenSafe();
      const atualizada = await atualizarMassa(id, massa, token || undefined);
      setMassas(prev => prev.map(m => m.id === id ? atualizada : m));
      return atualizada;
    } catch (err: unknown) {
      const mensagem = getErrorMessage(err) || 'Erro ao atualizar massa';
      setError(mensagem);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getTokenSafe]);

  const deletar = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenSafe();
      await deletarMassa(id, token || undefined);
      setMassas(prev => prev.filter(m => m.id !== id));
    } catch (err: unknown) {
      const mensagem = getErrorMessage(err) || 'Erro ao deletar massa';
      setError(mensagem);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getTokenSafe]);

  // ================================
  // Colunas personalizadas
  // ================================

  const criarColunaMassa = useCallback(async (coluna: Omit<DataMassColumn, 'id'>) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenSafe();
      const nova = await criarColuna(coluna, token || undefined);
      setColunas(prev => [...prev, nova]);
      return nova;
    } catch (err: unknown) {
      const mensagem = getErrorMessage(err) || 'Erro ao criar coluna';
      setError(mensagem);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getTokenSafe]);

  const atualizarColunaMassa = useCallback(async (id: string, coluna: Partial<DataMassColumn>) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenSafe();
      const atualizada = await atualizarColuna(id, coluna, token || undefined);
      setColunas(prev => prev.map(c => c.id === id ? atualizada : c));
      return atualizada;
    } catch (err: unknown) {
      const mensagem = getErrorMessage(err) || 'Erro ao atualizar coluna';
      setError(mensagem);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getTokenSafe]);

  const deletarColunaMassa = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenSafe();
      await deletarColuna(id, token || undefined);
      setColunas(prev => prev.filter(c => c.id !== id));
    } catch (err: unknown) {
      const mensagem = getErrorMessage(err) || 'Erro ao deletar coluna';
      setError(mensagem);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getTokenSafe]);

  // ================================
  // Tags
  // ================================

  const criarTagMassa = useCallback(async (tag: Omit<DataMassTag, 'id'>) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenSafe();
      const nova = await criarTag(tag, token || undefined);
      setTags(prev => [...prev, nova]);
      return nova;
    } catch (err: unknown) {
      const mensagem = getErrorMessage(err) || 'Erro ao criar tag';
      setError(mensagem);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getTokenSafe]);

  const atualizarTagMassa = useCallback(async (id: string, tag: Partial<DataMassTag>) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenSafe();
      const atualizada = await atualizarTag(id, tag, token || undefined);
      setTags(prev => prev.map(t => t.id === id ? atualizada : t));
      return atualizada;
    } catch (err: unknown) {
      const mensagem = getErrorMessage(err) || 'Erro ao atualizar tag';
      setError(mensagem);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getTokenSafe]);

  const deletarTagMassa = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenSafe();
      await deletarTag(id, token || undefined);
      setTags(prev => prev.filter(t => t.id !== id));
    } catch (err: unknown) {
      const mensagem = getErrorMessage(err) || 'Erro ao deletar tag';
      setError(mensagem);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getTokenSafe]);

  // ================================
  // Filtros e busca
  // ================================

  const filtrarMassas = useCallback((
    massas: DataMass[],
    searchTerm: string,
    selectedTags: string[]
  ) => {
    const termo = searchTerm.trim().toLowerCase();
    return massas.filter((massa) => {
      const matchSearch = !termo || [
        massa.cpf,
        massa.linha,
        massa.observacao,
        massa.customFields?.projeto,
        massa.customFields?.bug,
      ].some((valor) => (valor || '').toLowerCase().includes(termo));

      const matchTags = selectedTags.length === 0 || selectedTags.every((tag) => massa.tipos.includes(tag));

      return matchSearch && matchTags;
    });
  }, []);

  return {
    massas,
    colunas,
    tags,
    loading,
    error,
    carregarTudo,
    criar,
    atualizar,
    deletar,
    criarColunaMassa,
    atualizarColunaMassa,
    deletarColunaMassa,
    criarTagMassa,
    atualizarTagMassa,
    deletarTagMassa,
    filtrarMassas,
  };
}
