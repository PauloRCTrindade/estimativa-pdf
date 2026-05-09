// Exemplo de como usar a API no seu App.tsx

import { useEstimativas } from '@/hooks/useEstimativas';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function AppWithBackend() {
  const { criar, listar, atualizar, deletar, loading, error, estimativas } = useEstimativas();
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  // Salvar estimativa atual no banco
  async function handleSalvarEstimativa(formData: any) {
    try {
      const estimativaSalva = await criar({
        titulo: formData.titulo,
        arquiteto: formData.arquiteto,
        inicio: formData.inicio,
        releaseAlvo: formData.releaseAlvo,
        feriados: formData.feriados,
        releases: formData.releases,
        premissas: formData.premissas,
        restricoes: formData.restricoes,
        observacoes: formData.observacoes,
        pontos: formData.pontos,
        chgDias: formData.chgDias,
        esteiraPreProd: formData.esteiraPreProd,
        diasParados: formData.diasParados,
        atividades: formData.atividades,
      });

      alert(`✅ Estimativa salva com ID: ${estimativaSalva.id}`);
      console.log('Estimativa salva:', estimativaSalva);
    } catch (err) {
      alert('❌ Erro ao salvar: ' + error);
    }
  }

  // Carregar histórico
  async function handleCarregarHistorico() {
    try {
      await listar();
      setMostrarHistorico(true);
    } catch (err) {
      alert('❌ Erro ao carregar histórico');
    }
  }

  return (
    <div>
      {/* Seu formulário atual */}
      <div>
        {/* ... campos do formulário ... */}

        {/* Novo botão para salvar */}
        <Button
          onClick={() => handleSalvarEstimativa(formData)}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700"
        >
          {loading ? '⏳ Salvando...' : '💾 Salvar Estimativa'}
        </Button>

        {/* Novo botão para histórico */}
        <Button
          onClick={handleCarregarHistorico}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 ml-2"
        >
          📋 Ver Histórico
        </Button>
      </div>

      {/* Mostrar histórico */}
      {mostrarHistorico && (
        <div className="mt-8 border-t pt-8">
          <h2 className="text-2xl font-bold mb-4">📋 Histórico de Estimativas</h2>

          {estimativas.length === 0 ? (
            <p>Nenhuma estimativa salva ainda.</p>
          ) : (
            <div className="space-y-4">
              {estimativas.map((est) => (
                <div key={est.id} className="border p-4 rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{est.titulo}</h3>
                      <p className="text-sm text-gray-600">
                        Arquiteto: {est.arquiteto}
                      </p>
                      <p className="text-sm text-gray-600">
                        Período: {est.inicio} até {est.releaseAlvo}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Criado em: {new Date(est.criadoEm).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Carregar e editar
                          console.log('Editar:', est);
                        }}
                      >
                        ✏️ Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm('Tem certeza que deseja deletar?')) {
                            deletar(est.id!);
                          }
                        }}
                      >
                        🗑️ Deletar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <div className="text-red-600 mt-4">Erro: {error}</div>}
    </div>
  );
}
