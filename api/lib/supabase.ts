import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

// Log para verificar se as variáveis estão configuradas
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase não configurado:', {
    url: supabaseUrl ? '✓' : '✗ SUPABASE_URL faltando',
    key: supabaseKey ? '✓' : '✗ SUPABASE_ANON_KEY faltando',
  });
}

export const supabase = createClient(supabaseUrl, supabaseKey);
