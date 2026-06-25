import { supabase } from '../../lib/supabase.js';
import { setCorsHeaders, verifyAuth, unauthorized } from '../../lib/auth.js';
import { camelToSnakeObj, snakeToCamelObj } from '../../lib/case-converter.js';

const keyMap = {
  criado_em: 'criadoEm',
  atualizado_em: 'atualizadoEm',
};

function lowercaseToCamel(obj) {
  return snakeToCamelObj(obj, keyMap);
}

export default async function handler(req, res) {
  setCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('position', { ascending: true });

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json((data || []).map((item) => lowercaseToCamel(item)));
    }

    if (req.method === 'POST') {
      const user = await verifyAuth(req);
      if (!user) return unauthorized(res);

      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Request body is required' });
      }

      const convertedBody = camelToSnakeObj(req.body);
      const { data, error } = await supabase
        .from('kanban_columns')
        .insert([convertedBody])
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });
      return res.status(201).json(lowercaseToCamel(data));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Columns collection error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
