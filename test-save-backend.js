/**
 * Teste de salvamento de estimativas no backend (com conversão camelCase)
 * Run: node test-save-backend.js
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';

// Dados de teste em camelCase (como o frontend envia)
const estimativaTest = {
  titulo: 'Teste de Salvamento Completo Frontend',
  arquiteto: 'Arquiteto Teste',
  inicio: '2024-02-15',
  releaseAlvo: '2024-04-15',
  feriados: 'Carnaval',
  releases: 'v2.0',
  premissas: 'Premissa de teste',
  restricoes: 'Nenhuma restrição',
  observacoes: 'Este é um teste de salvamento com camelCase',
  atividades: [
    { descricao: 'Design', dias: 2, recurso: 'Designer' },
    { descricao: 'Desenvolvimento', dias: 8, recurso: 'Dev' },
    { descricao: 'Testes', dias: 3, recurso: 'QA' }
  ],
  pontos: '13',
  chgDias: 1,
  esteiraPreProd: 'Sim',
  diasParados: '1'
};

async function testar() {
  console.log('🚀 Iniciando testes de salvamento (com camelCase)...\n');
  console.log(`URL da API: ${API_URL}\n`);

  try {
    // 1. CRIAR ESTIMATIVA
    console.log('📝 [1] Criando estimativa em camelCase...');
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

    // 3. VALIDAR DADOS E CONVERSÃO
    console.log('🔍 [3] Validando dados salvos e conversão...');
    const validacoes = [
      { campo: 'titulo', esperado: estimativaTest.titulo, obtido: estimativaEncontrada.titulo },
      { campo: 'arquiteto', esperado: estimativaTest.arquiteto, obtido: estimativaEncontrada.arquiteto },
      { campo: 'inicio', esperado: estimativaTest.inicio, obtido: estimativaEncontrada.inicio },
      { campo: 'releaseAlvo', esperado: estimativaTest.releaseAlvo, obtido: estimativaEncontrada.releaseAlvo },
      { campo: 'feriados', esperado: estimativaTest.feriados, obtido: estimativaEncontrada.feriados },
      { campo: 'pontos', esperado: estimativaTest.pontos, obtido: estimativaEncontrada.pontos },
      { campo: 'chgDias', esperado: estimativaTest.chgDias, obtido: estimativaEncontrada.chgDias },
      { campo: 'esteiraPreProd', esperado: estimativaTest.esteiraPreProd, obtido: estimativaEncontrada.esteiraPreProd },
      { campo: 'diasParados', esperado: estimativaTest.diasParados, obtido: estimativaEncontrada.diasParados },
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

    // 4. VERIFICAR FORMATO CAMEL CASE NA RESPOSTA
    console.log('\n🔄 [4] Verificando conversão camelCase...');
    const temsKey = (obj, key) => Object.keys(obj).includes(key);
    if (temsKey(estimativaEncontrada, 'releaseAlvo')) {
      console.log('   ✅ Resposta em camelCase correto (releaseAlvo)');
    } else {
      console.log('   ❌ Resposta não está em camelCase');
    }

    // 5. VERIFICAR TIMESTAMPS
    console.log('\n⏰ [5] Verificando timestamps...');
    if (estimativaEncontrada.criadoEm && estimativaEncontrada.atualizadoEm) {
      console.log(`   ✅ criadoEm: ${estimativaEncontrada.criadoEm}`);
      console.log(`   ✅ atualizadoEm: ${estimativaEncontrada.atualizadoEm}`);
    } else {
      console.log('   ⚠️  Timestamps não encontrados');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ TODOS OS TESTES PASSARAM COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n📊 Dados completos salvos (em camelCase):');
    console.log(JSON.stringify(estimativaEncontrada, null, 2));

  } catch (error) {
    console.error('❌ Erro durante os testes:');
    console.error(error.message);
    process.exit(1);
  }
}

testar();
