import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing required environment variables: SUPABASE_URL and/or SUPABASE_ANON_KEY. ' +
    'Please configure them in your Vercel Dashboard (Settings > Environment Variables).'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
