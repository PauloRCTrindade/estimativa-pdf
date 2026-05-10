import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';

// Conversor de camelCase para lowercase (schema do banco)
function camelToLowercase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const converted: any = {};
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

// Conversor de lowercase para camelCase (resposta ao cliente)
function lowercaseToCamel(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const converted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    let camelKey = key;
    if (key === 'releasealvo') camelKey = 'releaseAlvo';
    else if (key === 'chgdias') camelKey = 'chgDias';
    else if (key === 'esteirapreprod') camelKey = 'esteiraPreProd';
    else if (key === 'diasparados') camelKey = 'diasParados';
    else if (key === 'criadoem') camelKey = 'criadoEm';
    else if (key === 'atualizadoem') camelKey = 'atualizadoEm';
    
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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      // Listar todas as estimativas
      const { data, error } = await supabase
        .from('estimativas')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        return res.status(400).json({ erro: error.message });
      }

      // Converter para camelCase
      const converted = data?.map(lowercaseToCamel) || [];
      return res.status(200).json(converted);
    }

    if (req.method === 'POST') {
      // Converter camelCase para lowercase antes de enviar
      const convertedBody = camelToLowercase(req.body);
      
      // Criar nova estimativa
      const { data, error } = await supabase
        .from('estimativas')
        .insert([convertedBody])
        .select()
        .single();

      if (error) {
        return res.status(400).json({ erro: error.message });
      }

      // Converter resposta para camelCase
      return res.status(201).json(lowercaseToCamel(data));
    }

    return res.status(405).json({ erro: 'Método não permitido' });
  } catch (error: any) {
    console.error('Erro:', error);
    return res.status(500).json({ erro: error.message || 'Erro no servidor' });
  }
}
