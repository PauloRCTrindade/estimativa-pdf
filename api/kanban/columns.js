import { supabase } from '../lib/supabase.js';

function camelToLowercase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (Array.isArray(value)) {
      converted[lowerKey] = value.map(item => typeof item === 'object' ? camelToLowercase(item) : item);
    } else if (typeof value === 'object' && value !== null) {
      converted[lowerKey] = camelToLowercase(value);
    } else {
      converted[lowerKey] = value;
    }
  }
  return converted;
}

function lowercaseToCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const keyMap = {
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

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
      return res.status(200).json((data || []).map(lowercaseToCamel));
    }

    if (req.method === 'POST') {
      const convertedBody = camelToLowercase(req.body);
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
    console.error('Columns error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
