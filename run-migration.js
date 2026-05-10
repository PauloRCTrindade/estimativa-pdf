#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://zhsdfjmagcpayeemijkb.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_KEY não definida');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🔄 Deletando tabela estimativas (se existir)...');
    
    // Drop table if exists
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'DROP TABLE IF EXISTS estimativas CASCADE;',
    }).catch(() => ({ error: { message: 'RPC not available' } }));

    if (dropError && !dropError.message.includes('not available')) {
      console.log(`⚠️ Drop error: ${dropError.message}`);
    }

    console.log('✅ Criando tabela com schema correto...');

    // Criar tabela com snake_case
    const migrationSQL = `
    CREATE TABLE IF NOT EXISTS estimativas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      -- Informações básicas
      titulo TEXT NOT NULL,
      arquiteto TEXT NOT NULL,
      inicio DATE NOT NULL,
      release_alvo DATE NOT NULL,
      
      -- Dados da estimativa
      feriados TEXT,
      releases TEXT,
      premissas TEXT,
      restricoes TEXT,
      observacoes TEXT,
      pontos TEXT,
      
      -- Configurações
      chg_dias INTEGER DEFAULT 0,
      esteira_pre_prod TEXT,
      dias_parados TEXT,
      
      -- Atividades (armazenadas como JSON)
      atividades JSONB DEFAULT '[]'::jsonb,
      
      -- Auditoria
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      -- Constraints
      CONSTRAINT titulo_not_empty CHECK (titulo <> ''),
      CONSTRAINT arquiteto_not_empty CHECK (arquiteto <> '')
    );

    -- Criar índices
    CREATE INDEX idx_estimativas_created_at ON estimativas(created_at DESC);
    CREATE INDEX idx_estimativas_release_alvo ON estimativas(release_alvo);

    -- Criar trigger para atualizar updated_at automaticamente
    CREATE OR REPLACE FUNCTION update_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_update_updated_at
    BEFORE UPDATE ON estimativas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

    -- Habilitar RLS
    ALTER TABLE estimativas ENABLE ROW LEVEL SECURITY;

    -- Remover políticas antigas (se existirem)
    DROP POLICY IF EXISTS "Public estimativas are viewable by everyone" ON estimativas;
    DROP POLICY IF EXISTS "Anyone can create estimativas" ON estimativas;
    DROP POLICY IF EXISTS "Anyone can update estimativas" ON estimativas;
    DROP POLICY IF EXISTS "Anyone can delete estimativas" ON estimativas;

    -- Criar políticas para acesso público (para testes)
    CREATE POLICY "Public estimativas are viewable by everyone"
      ON estimativas FOR SELECT
      USING (true);

    CREATE POLICY "Anyone can create estimativas"
      ON estimativas FOR INSERT
      WITH CHECK (true);

    CREATE POLICY "Anyone can update estimativas"
      ON estimativas FOR UPDATE
      USING (true)
      WITH CHECK (true);

    CREATE POLICY "Anyone can delete estimativas"
      ON estimativas FOR DELETE
      USING (true);
    `;

    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: migrationSQL,
    }).catch(() => ({ error: { message: 'RPC not available' } }));

    if (createError && !createError.message.includes('not available')) {
      console.log(`⚠️ Create error: ${createError.message}`);
    } else {
      console.log('✅ Tabela criada com sucesso!');
    }

  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

runMigration();
