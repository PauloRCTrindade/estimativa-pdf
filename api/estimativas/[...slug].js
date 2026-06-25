import { supabase } from '../lib/supabase.js';
import { setCorsHeaders, verifyAuth, unauthorized } from '../lib/auth.js';

function estimativaLowercaseToCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const keyMap = {
    releasealvo: 'releaseAlvo',
    chgdias: 'chgDias',
    esteirapreprod: 'esteiraPreProd',
    diasparados: 'diasParados',
    criadoem: 'criadoEm',
    atualizadoem: 'atualizadoEm',
  };

  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = keyMap[key] || key;
    if (key === 'pacotes') {
      converted[camelKey] = value;
      continue;
    }
    if (Array.isArray(value)) {
      converted[camelKey] = value.map((item) =>
        typeof item === 'object' ? estimativaLowercaseToCamel(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      converted[camelKey] = estimativaLowercaseToCamel(value);
    } else {
      converted[camelKey] = value;
    }
  }
  return converted;
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
      .from('estimativas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(estimativaLowercaseToCamel(data));
  }

  if (req.method === 'PUT') {
    const user = await verifyAuth(req);
    if (!user) return unauthorized(res);

    const convertedBody = {};
    for (const [key, value] of Object.entries(req.body || {})) {
      convertedBody[key.toLowerCase()] = value;
    }

    const { data, error } = await supabase
      .from('estimativas')
      .update(convertedBody)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json(estimativaLowercaseToCamel(data));
  }

  if (req.method === 'DELETE') {
    const user = await verifyAuth(req);
    if (!user) return unauthorized(res);

    const { error } = await supabase.from('estimativas').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
