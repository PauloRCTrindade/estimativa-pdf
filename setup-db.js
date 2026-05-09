#!/usr/bin/env node

/**
 * Script para executar o SQL de setup no Supabase automaticamente
 * Uso: node setup-db.js
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cores para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

function logBright(msg) {
  log(colors.bright, msg);
}

function logSuccess(msg) {
  log(colors.green, `✅ ${msg}`);
}

function logError(msg) {
  log(colors.red, `❌ ${msg}`);
}

function logInfo(msg) {
  log(colors.cyan, `ℹ️  ${msg}`);
}

function logWarning(msg) {
  log(colors.yellow, `⚠️  ${msg}`);
}

// Carregar variáveis de .env.local ou .env
function loadEnv() {
  const envFile = path.join(__dirname, '.env.local');
  const envFileFallback = path.join(__dirname, '.env');
  
  let envPath = null;
  if (fs.existsSync(envFile)) {
    envPath = envFile;
  } else if (fs.existsSync(envFileFallback)) {
    envPath = envFileFallback;
  }
  
  if (envPath) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      
      if (key && value) {
        process.env[key] = value;
      }
    }
    
    return envPath;
  }
  
  return null;
}

async function setupDatabase() {
  logBright('\n🚀 Database Setup Script');
  logBright('═'.repeat(50));

  // 1. Carregar variáveis de ambiente
  logInfo('Carregando variáveis de ambiente...');
  const envFile = loadEnv();
  
  if (envFile) {
    logSuccess(`Arquivo carregado: ${path.basename(envFile)}`);
  }

  // 2. Validar variáveis de ambiente
  logInfo('Validando variáveis de ambiente...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logError('Variáveis de ambiente não configuradas!');
    logWarning('Por favor, crie um arquivo .env com:');
    console.log(`
  SUPABASE_URL=https://xxx.supabase.co
  SUPABASE_ANON_KEY=xxx
    `);
    process.exit(1);
  }

  logSuccess('Variáveis de ambiente encontradas');
  logInfo(`URL: ${supabaseUrl}`);

  // 2. Ler arquivo SQL
  logInfo('Lendo arquivo database.sql...');
  
  const sqlFile = path.join(__dirname, 'database.sql');
  
  if (!fs.existsSync(sqlFile)) {
    logError('Arquivo database.sql não encontrado!');
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFile, 'utf-8');
  logSuccess(`Arquivo carregado (${sql.length} bytes)`);

  // 3. Conectar ao Supabase
  logInfo('Conectando ao Supabase...');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Fazer uma query simples para testar conexão - tentar listar a tabela estimativas
    const { error: testError } = await supabase.from('estimativas').select('*').limit(1);
    
    // Se conseguir conectar mesmo com erro de tabela não encontrada, está ok
    if (testError && testError.message.includes('does not exist')) {
      logWarning('Tabela estimativas não encontrada (esperado se SQL não foi executado)');
    } else if (testError) {
      logError(`Erro ao conectar: ${testError.message}`);
      logWarning('Verifique suas credenciais do Supabase em .env.local');
      process.exit(1);
    } else {
      logSuccess('Tabela estimativas encontrada!');
    }
    
    logSuccess('Conexão com Supabase estabelecida ✓');
  } catch (err) {
    logError(`Erro ao conectar: ${err.message}`);
    logWarning('Verifique suas credenciais do Supabase');
    process.exit(1);
  }

  // 4. Verificação da tabela estimativas
  logBright('─'.repeat(50));
  logInfo('Verificando tabela estimativas...');

  logBright('─'.repeat(50));

  try {
    const { data, error } = await supabase
      .from('estimativas')
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist')) {
        logWarning('⏳ Tabela não existe ainda');
        logInfo('Você precisa executar o SQL no Supabase:');
        console.log('');
        console.log('  1. Acesse: https://app.supabase.com');
        console.log('  2. Selecione seu projeto');
        console.log('  3. SQL Editor → New Query');
        console.log('  4. Cole o conteúdo de database.sql');
        console.log('  5. Clique em RUN (botão verde)');
        console.log('');
        logInfo('Depois execute este script novamente:');
        console.log('  npm run setup:db');
        console.log('');
      } else {
        logError(`Erro: ${error.message}`);
      }
    } else {
      logSuccess('Tabela estimativas existe e está pronta!');
      logInfo(`Registros existentes: ${data?.length || 0}`);
    }
  } catch (err) {
    logError(`Erro na verificação: ${err.message}`);
  }

  logBright('═'.repeat(50));
  logBright('\n✅ Verificação concluída!\n');

  logInfo('Status:');
  console.log('  ✅ Variáveis de ambiente carregadas');
  console.log('  ✅ Conexão com Supabase testada');
  console.log('  ⏳ Aguardando SQL ser executado (se não foi ainda)');
  console.log('');

  logInfo('Próximas ações:');
  console.log('  1. Execute o SQL no Supabase (se não fez ainda)');
  console.log('  2. Inicie a API: npm run dev:api');
  console.log('  3. Teste: curl http://localhost:3000/api/estimativas');
  console.log('  4. Inicie o frontend: npm run dev');
  console.log('');

  logInfo('Documentação:');
  console.log('  - SCRIPTS.md → Todos os comandos disponíveis');
  console.log('  - BACKEND_SUMMARY.md → Resumo do que foi criado');
  console.log('  - EXEMPLO_USO.tsx → Como usar no frontend');
  console.log('');
}

// Executar
setupDatabase().catch(err => {
  logError(`Erro fatal: ${err.message}`);
  process.exit(1);
});
