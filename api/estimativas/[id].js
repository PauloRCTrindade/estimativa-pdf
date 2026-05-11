import { supabase } from '../lib/supabase.js';

// Convert lowercase to camelCase (for API response)
function lowercaseToCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const keyMap = {
    'releasealvo': 'releaseAlvo',
    'chgdias': 'chgDias',
    'esteirapreprod': 'esteiraPreProd',
    'diasparados': 'diasParados',
    'criadoem': 'criadoEm',
    'atualizadoem': 'atualizadoEm',
  };
  
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = keyMap[key] || key;
    
    if (Array.isArray(value)) {
      converted[camelKey] = value.map(item => 
        typeof item === 'object' ? lowercaseToCamel(item) : item
      );
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

  if (!id) {
    return res.status(400).json({ error: 'ID is required' });
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('estimativas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return res.status(404).json({ error: error.message });
      }

      const converted = lowercaseToCamel(data);
      return res.status(200).json(converted);
    }

    if (req.method === 'PUT') {
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

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const converted = lowercaseToCamel(data);
      return res.status(200).json(converted);
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('estimativas')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
