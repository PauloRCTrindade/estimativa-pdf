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

export default async function handler(req, res) {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('data_masses')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json((data || []).map(toCamel));
  }

  if (req.method === 'POST') {
    const user = await verifyAuth(req);
    if (!user) return unauthorized(res);

    const { customFields, ...restBody } = req.body || {};
    const convertedBody = camelToSnakeObj(restBody);
    if (customFields !== undefined) convertedBody.custom_fields = customFields;

    const { data, error } = await supabase
      .from('data_masses')
      .insert([convertedBody])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(toCamel(data));
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
