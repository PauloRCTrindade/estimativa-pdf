import { supabase } from '../_lib/supabase.js';
import { setCorsHeaders, verifyAuth, unauthorized } from '../_lib/auth.js';
import { camelToSnakeObj, snakeToCamelObj } from '../_lib/case-converter.js';
import { migrateLegacyRows, rowToDataMass, extractPayload, buildLegacyFields, safeDataMassInsert } from '../_lib/dataMassHelpers.js';

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

export default async function handler(req, res) {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { rows, error } = await migrateLegacyRows(supabase);

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json((rows || []).map(normalizeResponse));
  }

  if (req.method === 'POST') {
    const user = await verifyAuth(req);
    if (!user) return unauthorized(res);

    const { lines, customFields, restBody } = extractPayload(req.body || {});
    const convertedBody = camelToSnakeObj(restBody);

    if (lines !== undefined) convertedBody.lines = lines;
    if (customFields !== undefined) convertedBody.custom_fields = customFields;

    const legacyFields = buildLegacyFields(lines);
    convertedBody.linha = legacyFields.linha;
    convertedBody.observacao = legacyFields.observacao;
    convertedBody.tipos = legacyFields.tipos;

    const { data, error } = await safeDataMassInsert(supabase, convertedBody);

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(normalizeResponse(data));
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
