import type { Estimativa } from './src/types/index';

/**
 * Teste de integração para salvamento de estimativas
 * Run: npx tsx test-backend-integration.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';

interface TestResult {
  passed: boolean;
  message: string;
  details?: any;
}

class BackendTestSuite {
  private createdIds: string[] = [];

  async runAll(): Promise<boolean> {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 SUITE DE TESTES - SALVAMENTO NO BACKEND');
    console.log('='.repeat(60) + '\n');

    const tests = [
      { name: 'Teste 1: Criar Estimativa', fn: () => this.testCreateEstimativa() },
      { name: 'Teste 2: Validar Salvamento', fn: () => this.testValidateSave() },
      { name: 'Teste 3: Listar Estimativas', fn: () => this.testListEstimativas() },
      { name: 'Teste 4: Dados Conversão Case', fn: () => this.testCaseConversion() },
      { name: 'Teste 5: Timestamps', fn: () => this.testTimestamps() }
    ];

    let allPassed = true;
    let passedCount = 0;

    for (const test of tests) {
      try {
        const result = await test.fn();
        if (result.passed) {
          console.log(`✅ ${test.name}`);
          console.log(`   ${result.message}\n`);
          passedCount++;
        } else {
          console.log(`❌ ${test.name}`);
          console.log(`   ${result.message}\n`);
          allPassed = false;
        }
        if (result.details) {
          console.log(`   Detalhes: ${JSON.stringify(result.details, null, 2)}\n`);
        }
      } catch (error: any) {
        console.log(`❌ ${test.name}`);
        console.log(`   Erro: ${error.message}\n`);
        allPassed = false;
      }
    }

    // Limpeza
    await this.cleanup();

    // Resumo
    console.log('='.repeat(60));
    console.log(`📊 RESULTADO: ${passedCount}/${tests.length} testes passaram`);
    console.log('='.repeat(60) + '\n');

    return allPassed;
  }

  private async testCreateEstimativa(): Promise<TestResult> {
    const data: Estimativa = {
      titulo: 'Estimativa Teste - ' + new Date().toISOString().slice(0, 10),
      arquiteto: 'Tester Bot',
      inicio: '2024-01-15',
      releaseAlvo: '2024-03-15',
      feriados: 'Sem feriados',
      releases: 'v1.0',
      premissas: 'Teste automatizado',
      restricoes: 'Nenhuma',
      observacoes: 'Este é um teste automatizado',
      atividades: [
        { descricao: 'Análise', dias: 3, recurso: 'Analista' },
        { descricao: 'Desenvolvimento', dias: 10, recurso: 'Dev' }
      ],
      pontos: '21',
      chgDias: 2,
      esteiraPreProd: 'Sim'
    };

    const response = await fetch(`${API_URL}/api/estimativas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      return {
        passed: false,
        message: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const created = await response.json();
    if (!created.id) {
      return {
        passed: false,
        message: 'Resposta não contém ID'
      };
    }

    this.createdIds.push(created.id);

    return {
      passed: true,
      message: `Estimativa criada com ID: ${created.id}`,
      details: { id: created.id, titulo: created.titulo }
    };
  }

  private async testValidateSave(): Promise<TestResult> {
    if (this.createdIds.length === 0) {
      return { passed: false, message: 'Nenhuma estimativa foi criada' };
    }

    const response = await fetch(`${API_URL}/api/estimativas`);
    const estimativas = await response.json() as any[];

    const found = estimativas.some(e => this.createdIds.includes(e.id));

    return {
      passed: found,
      message: found ? 'Estimativa encontrada no banco de dados' : 'Estimativa não encontrada',
      details: { totalEstimativas: estimativas.length, encontrada: found }
    };
  }

  private async testListEstimativas(): Promise<TestResult> {
    const response = await fetch(`${API_URL}/api/estimativas`);

    if (!response.ok) {
      return {
        passed: false,
        message: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return {
        passed: false,
        message: 'Resposta não é um array'
      };
    }

    return {
      passed: data.length > 0,
      message: `Listadas ${data.length} estimativas`,
      details: { quantidade: data.length, primeiroItem: data[0]?.titulo }
    };
  }

  private async testCaseConversion(): Promise<TestResult> {
    const response = await fetch(`${API_URL}/api/estimativas`);
    const estimativas = await response.json() as any[];

    const primeira = estimativas[0];

    if (!primeira) {
      return { passed: false, message: 'Nenhuma estimativa encontrada' };
    }

    // Verificar se está em camelCase (não em snake_case)
    const temCamelCase = Object.keys(primeira).some(k => /[a-z][A-Z]/.test(k));
    const temSnakeCase = Object.keys(primeira).some(k => /_/.test(k));

    return {
      passed: temCamelCase && !temSnakeCase,
      message: temCamelCase && !temSnakeCase 
        ? 'Resposta em camelCase correto' 
        : 'Erro na conversão de case',
      details: { 
        chaves: Object.keys(primeira).slice(0, 5),
        temCamelCase,
        temSnakeCase
      }
    };
  }

  private async testTimestamps(): Promise<TestResult> {
    const response = await fetch(`${API_URL}/api/estimativas`);
    const estimativas = await response.json() as any[];

    const comTimestamps = estimativas.filter(e => e.criadoEm || e.atualizadoEm);

    return {
      passed: comTimestamps.length > 0,
      message: `${comTimestamps.length} estimativas com timestamps`,
      details: { 
        total: estimativas.length,
        comTimestamps: comTimestamps.length,
        exemplo: estimativas[0]?.criadoEm 
      }
    };
  }

  private async cleanup(): Promise<void> {
    console.log('🧹 Limpando dados de teste...\n');

    for (const id of this.createdIds) {
      try {
        await fetch(`${API_URL}/api/estimativas/${id}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.log(`⚠️  Não foi possível deletar ${id}`);
      }
    }

    this.createdIds = [];
  }
}

// Executar testes
const suite = new BackendTestSuite();
suite.runAll().then(success => {
  process.exit(success ? 0 : 1);
});
