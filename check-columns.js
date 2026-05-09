import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addTimestampColumns() {
  try {
    console.log('Tentando adicionar colunas de timestamp via select e insert...');

    // Primeiro, try to insert a record to trigger any migrations
    const testId = `test-${Date.now()}`;
    
    const { data: insertData, error: insertError } = await supabase
      .from('estimativas')
      .insert({
        id: testId,
        titulo: 'Teste de timestamp',
        arquiteto: 'Sistema',
        inicio: '2025-01-01',
        releaseAlvo: '2025-02-01',
        feriados: '',
        releases: '',
        premissas: '',
        restricoes: '',
        observacoes: '',
        atividades: [],
      })
      .select()
      .single();

    if (insertError) {
      console.log('❌ Erro ao inserir registro de teste:', insertError.message);
      return;
    }

    console.log('✅ Registro inserido:', insertData);
    
    // Try to fetch to see if created_at exists
    const { data: selectData, error: selectError } = await supabase
      .from('estimativas')
      .select('id, created_at, updated_at')
      .eq('id', testId)
      .single();

    if (selectError) {
      console.log('❌ Erro ao buscar registro:', selectError.message);
      console.log('ℹ️ As colunas created_at/updated_at talvez não existam');
    } else {
      console.log('✅ Colunas de timestamp existem:', selectData);
    }

    // Delete the test record
    await supabase.from('estimativas').delete().eq('id', testId);
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

addTimestampColumns();
