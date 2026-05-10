import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://zhsdfjmagcpayeemijkb.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'REMOVED_SUPABASE_ANON_KEY';

// Log para verificar se as variáveis estão configuradas
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.warn('⚠️  Usando valores fallback de Supabase');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
