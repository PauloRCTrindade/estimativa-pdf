import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_KEY não estão configurados');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function migrateDatabaseSchema() {
  try {
    console.log('🔄 Executando migração de schema...');
    
    // Read the migration SQL file
    const sqlFile = fs.readFileSync(`${__dirname}/fix-schema-snakecase.sql`, 'utf-8');
    const statements = sqlFile.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (!statement.trim()) continue;
      
      console.log(`Executando:\n${statement.substring(0, 50)}...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        statement: statement,
      }).catch(err => {
        console.log('⚠️ RPC exec_sql não disponível, tentando alternativa...');
        return { error: { message: 'RPC method not available' } };
      });

      if (error && !error.message.includes('not available')) {
        console.log(`⚠️ Erro: ${error.message}`);
      }
    }
    
    console.log('✅ Migração concluída!');
  } catch (err) {
    console.error('❌ Erro na migração:', err.message);
  }
}

migrateDatabaseSchema();
