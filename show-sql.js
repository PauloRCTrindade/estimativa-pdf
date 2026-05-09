#!/usr/bin/env node

/**
 * Script para executar SQL do Supabase diretamente via API
 * Isso resolve o problema de statements múltiplos
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
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

async function executeSQL() {
  log(colors.bright, '\n🔧 SQL Executor\n');

  // Carregar env
  loadEnv();
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    log(colors.red, '❌ Variáveis de ambiente não encontradas');
    process.exit(1);
  }

  // Ler SQL
  const sqlFile = path.join(__dirname, 'database.sql');
  const sql = fs.readFileSync(sqlFile, 'utf-8');

  log(colors.cyan, 'ℹ️  Para executar o SQL automaticamente:');
  console.log('');
  console.log('  1. Acesse: https://app.supabase.com');
  console.log('  2. Selecione seu projeto');
  console.log('  3. SQL Editor → New Query');
  console.log('  4. Cole este SQL:');
  console.log('');
  console.log(colors.bright + '─'.repeat(70) + colors.reset);
  console.log(sql);
  console.log(colors.bright + '─'.repeat(70) + colors.reset);
  console.log('');
  console.log('  5. Clique em RUN (botão verde)');
  console.log('  6. Volte aqui e execute: npm run setup:db');
  console.log('');
  
  // Alternativa: mostrar as alterações necessárias se tabela existe
  log(colors.cyan, 'ℹ️  Verificando estado da tabela...');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const { data, error } = await supabase
      .from('estimativas')
      .select('*')
      .limit(1);
    
    if (!error) {
      log(colors.yellow, '⚠️  Tabela já existe');
      log(colors.cyan, 'ℹ️  Se está faltando colunas, você pode:');
      console.log('');
      console.log('  Option 1: Deletar tabela e recriar');
      console.log('    SQL: DROP TABLE IF EXISTS estimativas CASCADE;');
      console.log('    Depois execute o SQL completo');
      console.log('');
      console.log('  Option 2: Adicionar colunas faltantes');
      console.log('    SQL: ALTER TABLE estimativas ADD COLUMN IF NOT EXISTS criadoEm TIMESTAMP WITH TIME ZONE DEFAULT NOW();');
      console.log('');
    }
  } catch (err) {
    log(colors.yellow, `⚠️  ${err.message}`);
  }
}

executeSQL();
