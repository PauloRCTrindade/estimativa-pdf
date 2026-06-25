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

  const rawSlug = req.query.slug || req.query['[...slug]'] || [];
  const slug = Array.isArray(rawSlug) ? rawSlug : (rawSlug ? [rawSlug] : []);
  const id = slug[0];
  if (!id || slug.length > 1) return res.status(404).json({ error: 'Not found' });

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('data_mass_columns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(toCamel(data));
  }

  if (req.method === 'PUT') {
    const user = await verifyAuth(req);
    if (!user) return unauthorized(res);

    const convertedBody = camelToSnakeObj(req.body || {});
    const { data, error } = await supabase
      .from('data_mass_columns')
      .update(convertedBody)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json(toCamel(data));
  }

  if (req.method === 'DELETE') {
    const user = await verifyAuth(req);
    if (!user) return unauthorized(res);

    const { error } = await supabase.from('data_mass_columns').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
