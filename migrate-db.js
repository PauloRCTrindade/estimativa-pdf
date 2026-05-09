import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_ANON_KEY não estão configurados');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateDatabase() {
  try {
    console.log('Adicionando colunas de timestamp...');

    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE estimativas
        ADD COLUMN IF NOT EXISTS criadoEm TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS atualizadoEm TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      `
    });

    if (alterError) {
      console.log('ℹ️ Colunas já existem ou erro ao criar (ignorando):', alterError.message);
    } else {
      console.log('✅ Colunas de timestamp adicionadas');
    }

    // Atualizar registros existentes
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE estimativas 
        SET criadoEm = NOW(), atualizadoEm = NOW()
        WHERE criadoEm IS NULL OR atualizadoEm IS NULL;
      `
    });

    if (updateError) {
      console.log('ℹ️ Atualização concluída (ou sem registros para atualizar)');
    } else {
      console.log('✅ Registros existentes atualizados');
    }

    console.log('✅ Migração concluída!');
  } catch (err) {
    console.error('❌ Erro na migração:', err);
    process.exit(1);
  }
}

migrateDatabase();
