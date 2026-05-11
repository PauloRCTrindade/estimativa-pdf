import { supabase } from './lib/supabase.js';

// Convert camelCase to lowercase (table schema uses lowercase columns)
function camelToLowercase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (Array.isArray(value)) {
      converted[lowerKey] = value.map(item => 
        typeof item === 'object' ? camelToLowercase(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      converted[lowerKey] = camelToLowercase(value);
    } else {
      converted[lowerKey] = value;
    }
  }
  return converted;
}

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('estimativas')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('GET error:', error);
        return res.status(400).json({ error: error.message });
      }

      // Convert response to camelCase
      const converted = (data || []).map(lowercaseToCamel);
      return res.status(200).json(converted);
    }

    if (req.method === 'POST') {
      console.log('POST raw body:', JSON.stringify(req.body).substring(0, 200));
      
      // Convert request to lowercase
      const convertedBody = camelToLowercase(req.body);
      console.log('POST converted body:', JSON.stringify(convertedBody).substring(0, 200));
      
      const { data, error } = await supabase
        .from('estimativas')
        .insert([convertedBody])
        .select()
        .single();

      if (error) {
        console.error('POST error:', error);
        return res.status(400).json({ error: error.message });
      }

      // Convert response to camelCase
      const converted = lowercaseToCamel(data);
      return res.status(201).json(converted);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
