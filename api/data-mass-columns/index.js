import { supabase } from '../lib/supabase.js';
import { setCorsHeaders, verifyAuth, unauthorized } from '../lib/auth.js';
import { camelToSnakeObj, snakeToCamelObj } from '../lib/case-converter.js';

const keyMap = {
  criado_em: 'createdAt',
  atualizado_em: 'updatedAt',
};

function toCamel(obj) {
  return snakeToCamelObj(obj, keyMap);
}

export default async function handler(req, res) {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('data_mass_columns')
      .select('*')
      .order('position', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json((data || []).map(toCamel));
  }

  if (req.method === 'POST') {
    const user = await verifyAuth(req);
    if (!user) return unauthorized(res);

    const convertedBody = camelToSnakeObj(req.body);
    const { data, error } = await supabase
      .from('data_mass_columns')
      .insert([convertedBody])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(toCamel(data));
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
