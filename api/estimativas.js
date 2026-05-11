import { supabase } from './lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('estimativas')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      console.log('POST body:', JSON.stringify(req.body));
      const { data, error } = await supabase
        .from('estimativas')
        .insert([req.body])
        .select()
        .single();

      if (error) {
        console.error('POST error:', error);
        return res.status(400).json({ error: error.message, details: error });
      }

      return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
