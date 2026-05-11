import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://zhsdfjmagcpayeemijkb.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_apBH3BadubIdBW_AILf7rw_yDV4IILE';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.warn('Using Supabase fallback values');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
