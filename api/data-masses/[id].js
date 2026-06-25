import { supabase } from '../lib/supabase.js';
import { setCorsHeaders, verifyAuth, unauthorized } from '../lib/auth.js';
import { camelToSnakeObj, snakeToCamelObj } from '../lib/case-converter.js';

const keyMap = {
  custom_fields: 'customFields',
  observacao: 'observacao',
  criado_em: 'createdAt',
  atualizado_em: 'updatedAt',
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

  const id = req.query.id;
  if (!id) {
    return res.status(400).json({ error: 'ID is required' });
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('data_masses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) return res.status(400).json({ error: error.message });
      if (!data) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(lowercaseToCamel(data));
    }

    if (req.method === 'PUT') {
      const user = await verifyAuth(req);
      if (!user) return unauthorized(res);

      const { customFields, ...restBody } = req.body || {};
      const convertedBody = camelToSnakeObj(restBody);
      if (customFields !== undefined) {
        convertedBody.custom_fields = customFields;
      }

      const { data, error } = await supabase
        .from('data_masses')
        .update(convertedBody)
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json(lowercaseToCamel(data));
    }

    if (req.method === 'DELETE') {
      const user = await verifyAuth(req);
      if (!user) return unauthorized(res);

      const { error } = await supabase.from('data_masses').delete().eq('id', id);
      if (error) return res.status(400).json({ error: error.message });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Data masses item error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
