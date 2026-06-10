import { supabase } from '../lib/supabase.js';
import { setCorsHeaders, verifyAuth, unauthorized } from '../lib/auth.js';
import { camelToSnakeObj, snakeToCamelObj } from '../lib/case-converter.js';

const keyMap = {
  cardid: 'cardId',
  parentid: 'parentId',
  duedate: 'dueDate',
  criadoem: 'criadoEm',
  atualizadoem: 'atualizadoEm',
};

function lowercaseToCamel(obj) {
  return snakeToCamelObj(obj, keyMap);
}

function lowercaseToCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const keyMap = {
    cardid: 'cardId',
    parentid: 'parentId',
    duedate: 'dueDate',
    criadoem: 'criadoEm',
    atualizadoem: 'atualizadoEm',
  };
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = keyMap[key] || key;
    if (Array.isArray(value)) {
      converted[camelKey] = value.map(item => typeof item === 'object' ? lowercaseToCamel(item) : item);
    } else if (typeof value === 'object' && value !== null) {
      converted[camelKey] = lowercaseToCamel(value);
    } else {
      converted[camelKey] = value;
    }
  }
  return converted;
}

export default async function handler(req, res) {
  setCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      let query = supabase.from('kanban_tasks').select('*').order('position', { ascending: true });
      if (req.query.card_id) query = query.eq('card_id', req.query.card_id);

      const { data, error } = await query;
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json((data || []).map((item) => lowercaseToCamel(item)));
    }

    if (req.method === 'POST') {
      const user = await verifyAuth(req);
      if (!user) return unauthorized(res);
      const convertedBody = camelToSnakeObj(req.body);
      const { data, error } = await supabase
        .from('kanban_tasks')
        .insert([convertedBody])
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });
      return res.status(201).json(lowercaseToCamel(data));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Tasks error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
