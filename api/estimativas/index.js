import { supabase } from '../_lib/supabase.js';
import { setCorsHeaders, verifyAuth, unauthorized } from '../_lib/auth.js';

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

function estimativaCamelToLowercase(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (key === 'pacotes') {
      converted[lowerKey] = value;
      continue;
    }
    if (Array.isArray(value)) {
      converted[lowerKey] = value.map((item) =>
        typeof item === 'object' ? estimativaCamelToLowercase(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      converted[lowerKey] = estimativaCamelToLowercase(value);
    } else {
      converted[lowerKey] = value;
    }
  }
  return converted;
}

export default async function handler(req, res) {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { arquiteto, titulo } = req.query;
    let query = supabase.from('estimativas').select('*');
    if (arquiteto?.trim()) query = query.ilike('arquiteto', `%${arquiteto}%`);
    if (titulo?.trim()) query = query.ilike('titulo', `%${titulo}%`);

    const { data, error } = await query.order('criadoem', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json((data || []).map(estimativaLowercaseToCamel));
  }

  if (req.method === 'POST') {
    const user = await verifyAuth(req);
    if (!user) return unauthorized(res);

    const convertedBody = estimativaCamelToLowercase(req.body);
    const { data, error } = await supabase
      .from('estimativas')
      .insert([convertedBody])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(estimativaLowercaseToCamel(data));
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
