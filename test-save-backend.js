/**
 * Teste de salvamento de estimativas no backend
 * Run: node test-save-backend.js
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';

// Dados de teste - use nomes de colunas em lowercase
const estimativaTest = {
  titulo: 'Teste de Salvamento Completo',
  arquiteto: 'Arquiteto Teste',
  inicio: '2024-01-15',
  releasealvo: '2024-03-15',
  feriados: 'Nenhum feriado',
  releases: 'v1.0',
  premissas: 'Premissa de teste',
  restricoes: 'Nenhuma restrição',
  observacoes: 'Este é um teste de salvamento automatizado',
  atividades: [
    { descricao: 'Análise', dias: 3, recurso: 'Analista' },
    { descricao: 'Desenvolvimento', dias: 10, recurso: 'Dev' }
  ],
  pontos: '21',
  chgdias: 2,
  esteirapreprod: 'Sim',
  diasparados: '0'
};

async function testar() {
  console.log('🚀 Iniciando testes de salvamento...\n');
  console.log(`URL da API: ${API_URL}\n`);

  try {
    // 1. CRIAR ESTIMATIVA
    console.log('📝 [1] Criando estimativa completa...');
    const resPost = await fetch(`${API_URL}/api/estimativas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(estimativaTest)
    });

    if (!resPost.ok) {
      console.error(`❌ Erro ao criar: ${resPost.status} ${resPost.statusText}`);
      const erro = await resPost.text();
      console.error(erro);
      process.exit(1);
    }

    const estimativaCriada = await resPost.json();
    console.log('✅ Estimativa criada com sucesso!');
    console.log(`   ID: ${estimativaCriada.id}`);
    console.log(`   Título: ${estimativaCriada.titulo}\n`);

    // 2. VERIFICAR SALVAMENTO
    console.log('📋 [2] Listando todas as estimativas...');
    const resGet = await fetch(`${API_URL}/api/estimativas`, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!resGet.ok) {
      console.error(`❌ Erro ao listar: ${resGet.status} ${resGet.statusText}`);
      process.exit(1);
    }

    const estimativas = await resGet.json();
    console.log(`✅ Total de estimativas: ${estimativas.length}`);
    const estimativaEncontrada = estimativas.find(e => e.id === estimativaCriada.id);
    
    if (!estimativaEncontrada) {
      console.error('❌ Estimativa criada não foi encontrada na lista!');
      process.exit(1);
    }

    console.log('✅ Estimativa encontrada na base de dados!\n');

    // 3. VALIDAR DADOS
    console.log('🔍 [3] Validando dados salvos...');
    const validacoes = [
      { campo: 'titulo', esperado: estimativaTest.titulo, obtido: estimativaEncontrada.titulo },
      { campo: 'arquiteto', esperado: estimativaTest.arquiteto, obtido: estimativaEncontrada.arquiteto },
      { campo: 'inicio', esperado: estimativaTest.inicio, obtido: estimativaEncontrada.inicio },
      { campo: 'releasealvo', esperado: estimativaTest.releasealvo, obtido: estimativaEncontrada.releasealvo },
      { campo: 'feriados', esperado: estimativaTest.feriados, obtido: estimativaEncontrada.feriados },
      { campo: 'pontos', esperado: estimativaTest.pontos, obtido: estimativaEncontrada.pontos },
      { campo: 'chgdias', esperado: estimativaTest.chgdias, obtido: estimativaEncontrada.chgdias },
      { campo: 'atividades (count)', esperado: estimativaTest.atividades.length, obtido: estimativaEncontrada.atividades.length }
    ];

    let todasValidas = true;
    validacoes.forEach(v => {
      if (v.esperado === v.obtido) {
        console.log(`   ✅ ${v.campo}: ${v.obtido}`);
      } else {
        console.log(`   ❌ ${v.campo}: esperado "${v.esperado}", obtido "${v.obtido}"`);
        todasValidas = false;
      }
    });

    if (!todasValidas) {
      console.error('\n❌ Alguns dados não correspondem!');
      process.exit(1);
    }

    // 4. VERIFICAR TIMESTAMPS
    console.log('\n⏰ [4] Verificando timestamps...');
    if (estimativaEncontrada.criadoem && estimativaEncontrada.atualizadoem) {
      console.log(`   ✅ criadoem: ${estimativaEncontrada.criadoem}`);
      console.log(`   ✅ atualizadoem: ${estimativaEncontrada.atualizadoem}`);
    } else {
      console.log('   ⚠️  Timestamps não encontrados');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ TODOS OS TESTES PASSARAM COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n📊 Dados completos salvos:');
    console.log(JSON.stringify(estimativaEncontrada, null, 2));

  } catch (error) {
    console.error('❌ Erro durante os testes:');
    console.error(error.message);
    process.exit(1);
  }
}

testar();
