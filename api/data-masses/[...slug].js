import { supabase } from '../lib/supabase.js';
import { setCorsHeaders, verifyAuth, unauthorized } from '../lib/auth.js';
import { camelToSnakeObj, snakeToCamelObj } from '../lib/case-converter.js';

const keyMap = {
  custom_fields: 'customFields',
  observacao: 'observacao',
  criado_em: 'createdAt',
  atualizado_em: 'updatedAt',
};

function toCamel(obj) {
  return snakeToCamelObj(obj, keyMap);
}

function extractSlug(req) {
  const rawSlug = req.query.slug || req.query['[...slug]'] || [];
  let slug = Array.isArray(rawSlug) ? rawSlug : (rawSlug ? [rawSlug] : []);
  if (slug.length > 0) return slug;

  const url = req.url || '';
  const path = url.split('?')[0];
  const segments = path.split('/').filter(Boolean);
  if (segments[0] === 'api') segments.shift();
  if (segments[0] === 'data-masses') segments.shift();
  return segments;
}

export default async function handler(req, res) {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const slug = extractSlug(req);
  const id = slug[0];
  if (!id || slug.length > 1) return res.status(404).json({ error: 'Not found', debug: { slug, query: req.query, url: req.url } });

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('data_masses')
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

    const { customFields, ...restBody } = req.body || {};
    const convertedBody = camelToSnakeObj(restBody);
    if (customFields !== undefined) convertedBody.custom_fields = customFields;

    const { data, error } = await supabase
      .from('data_masses')
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

    const { error } = await supabase.from('data_masses').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
