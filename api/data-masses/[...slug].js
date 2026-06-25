import { supabase } from '../lib/supabase.js';
import { setCorsHeaders, verifyAuth, unauthorized } from '../lib/auth.js';
import { camelToSnakeObj, snakeToCamelObj } from '../lib/case-converter.js';
import { rowToDataMass, extractPayload, buildLegacyFields, safeDataMassUpdate } from '../lib/dataMassHelpers.js';

const keyMap = {
  custom_fields: 'customFields',
  observacao: 'observacao',
  criado_em: 'createdAt',
  atualizado_em: 'updatedAt',
};

function toCamel(obj) {
  return snakeToCamelObj(obj, keyMap);
}

function normalizeResponse(row) {
  const dataMass = rowToDataMass(row);
  return toCamel({
    ...dataMass,
    custom_fields: dataMass.customFields,
    criado_em: dataMass.createdAt,
    atualizado_em: dataMass.updatedAt,
  });
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
    return res.status(200).json(normalizeResponse(data));
  }

  if (req.method === 'PUT') {
    const user = await verifyAuth(req);
    if (!user) return unauthorized(res);

    const { lines, customFields, restBody } = extractPayload(req.body || {});
    const convertedBody = camelToSnakeObj(restBody);

    if (lines !== undefined) {
      convertedBody.lines = lines;
      const legacyFields = buildLegacyFields(lines);
      convertedBody.linha = legacyFields.linha;
      convertedBody.observacao = legacyFields.observacao;
      convertedBody.tipos = legacyFields.tipos;
    }
    if (customFields !== undefined) convertedBody.custom_fields = customFields;

    const { data, error } = await safeDataMassUpdate(supabase, id, convertedBody);

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json(normalizeResponse(data));
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
