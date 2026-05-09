import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpoc2Rmam1hZ2NwYXllZW1pamtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMzAwODkxMiwiZXhwIjoxODgwNzc1MzEyfQ.oZ1Xz9xP4kQ7I4sS8v_7j_8j_z9k_9L_8m_9N_8o_8p';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function migrate() {
  try {
    console.log('Adicionando coluna criadoEm...');
    
    // Use the service role client to execute SQL
    const { error } = await supabase.rpc('exec_sql', {
      statement: 'ALTER TABLE estimativas ADD COLUMN IF NOT EXISTS criadoEm TIMESTAMP WITH TIME ZONE DEFAULT NOW()'
    });

    if (error && error.message.includes('does not exist')) {
      console.log('ℹ️ Função exec_sql não existe, tentando alternativa...');
      // If RPC doesn't exist, try direct SQL via postgres
      const { data, error: err } = await supabase.schema('public').rpc('check_column_exists', {
        table_name: 'estimativas',
        column_name: 'criadoEm'
      });
      console.log('Resultado:', data, err);
    } else if (error) {
      console.log('❌ Erro:', error);
    } else {
      console.log('✅ Coluna adicionada com sucesso');
    }
  } catch (err) {
    console.error('❌ Erro ao migrar:', err.message);
  }
}

migrate();
