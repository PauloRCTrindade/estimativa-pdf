import { supabase } from '../../lib/supabase.js';

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID is required' });

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('kanban_tasks').select('*').eq('id', id).single();
      if (error) return res.status(404).json({ error: error.message });
      return res.status(200).json(lowercaseToCamel(data));
    }

    if (req.method === 'PUT') {
      const convertedBody = {};
      for (const [key, value] of Object.entries(req.body || {})) {
        convertedBody[key.toLowerCase()] = value;
      }
      const { data, error } = await supabase
        .from('kanban_tasks')
        .update(convertedBody)
        .eq('id', id)
        .select()
        .single();
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json(lowercaseToCamel(data));
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase.from('kanban_tasks').delete().eq('id', id);
      if (error) return res.status(400).json({ error: error.message });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Task id error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
