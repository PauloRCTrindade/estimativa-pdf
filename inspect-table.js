#!/usr/bin/env node

/**
 * Script para inspecionar e corrigir a tabela estimativas
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

async function inspectTable() {
  log(colors.bright, '\n🔍 Inspetor de Tabela\n');

  loadEnv();
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    log(colors.red, '❌ Variáveis de ambiente não encontradas');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Listar colunas da tabela
    log(colors.cyan, 'ℹ️  Verificando colunas da tabela estimativas...\n');
    
    const { data, error } = await supabase.rpc('get_table_columns', {
      table_name: 'estimativas'
    });

    if (error && error.message.includes('function')) {
      // Se não houver função RPC, tentar query direta
      log(colors.yellow, '⚠️  Usando método alternativo...\n');
      
      try {
        const { data: columns, error: colError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type')
          .eq('table_name', 'estimativas')
          .eq('table_schema', 'public');

        if (colError) {
          throw colError;
        }

        if (columns && columns.length > 0) {
          log(colors.green, `✅ Tabela tem ${columns.length} colunas:\n`);
          columns.forEach(col => {
            console.log(`  📌 ${col.column_name} (${col.data_type})`);
          });
          console.log('');

          // Verificar colunas faltantes
          const colNames = columns.map(c => c.column_name);
          const requiredCols = ['id', 'titulo', 'arquiteto', 'inicio', 'releaseAlvo', 'criadoEm', 'atualizadoEm'];
          const missing = requiredCols.filter(c => !colNames.includes(c));

          if (missing.length > 0) {
            log(colors.yellow, `⚠️  Colunas faltando: ${missing.join(', ')}\n`);
            log(colors.cyan, 'ℹ️  Execute este SQL no Supabase:\n');

            let fixSQL = '-- Adicionar colunas faltantes\n';
            if (missing.includes('criadoEm')) {
              fixSQL += 'ALTER TABLE estimativas ADD COLUMN criadoEm TIMESTAMP WITH TIME ZONE DEFAULT NOW();\n';
            }
            if (missing.includes('atualizadoEm')) {
              fixSQL += 'ALTER TABLE estimativas ADD COLUMN atualizadoEm TIMESTAMP WITH TIME ZONE DEFAULT NOW();\n';
            }

            console.log(colors.bright + '─'.repeat(70) + colors.reset);
            console.log(fixSQL);
            console.log(colors.bright + '─'.repeat(70) + colors.reset);
            console.log('');

            log(colors.cyan, 'ℹ️  Passos:');
            console.log('  1. Acesse: https://app.supabase.com');
            console.log('  2. SQL Editor → New Query');
            console.log('  3. Cole o SQL acima');
            console.log('  4. Clique em RUN');
            console.log('  5. Execute: npm run setup:db');
            console.log('');
          } else {
            log(colors.green, '✅ Todas as colunas necessárias existem!\n');
            log(colors.cyan, 'ℹ️  O problema pode ser:');
            console.log('  - API não reiniciada após alterações');
            console.log('  - Cache do Node.js');
            console.log('');
            log(colors.cyan, 'ℹ️  Tente:');
            console.log('  1. Parar a API: Ctrl+C no terminal');
            console.log('  2. Iniciar novamente: npm run dev:api');
            console.log('  3. Testar: curl http://localhost:3000/api/estimativas');
            console.log('');
          }
        }
      } catch (err) {
        log(colors.red, `❌ Erro: ${err.message}`);
      }
    }
  } catch (err) {
    log(colors.red, `❌ Erro: ${err.message}`);
  }
}

inspectTable();
