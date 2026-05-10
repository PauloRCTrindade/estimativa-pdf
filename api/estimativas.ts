import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';

// Conversor de camelCase para snake_case (schema do banco)
function camelToLowercase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const keyMap: Record<string, string> = {
    'releaseAlvo': 'release_alvo',
    'chgDias': 'chg_dias',
    'esteiraPreProd': 'esteira_pre_prod',
    'diasParados': 'dias_parados',
    'criadoEm': 'created_at',
    'atualizadoEm': 'updated_at',
  };
  
  const converted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Usar mapeamento se existir, senão converter camelCase para snake_case
    let snakeKey = keyMap[key];
    if (!snakeKey) {
      // Converter camelCase para snake_case automaticamente
      snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    }
    
    if (Array.isArray(value)) {
      converted[snakeKey] = value.map(item => 
        typeof item === 'object' ? camelToLowercase(item) : item
      );
    } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      converted[snakeKey] = camelToLowercase(value);
    } else {
      converted[snakeKey] = value;
    }
  }
  return converted;
}

// Conversor de lowercase para camelCase (resposta ao cliente)
function lowercaseToCamel(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const converted: any = {};
  const keyMap: Record<string, string> = {
    'release_alvo': 'releaseAlvo',
    'chg_dias': 'chgDias',
    'esteira_pre_prod': 'esteiraPreProd',
    'dias_parados': 'diasParados',
    'created_at': 'criadoEm',
    'updated_at': 'atualizadoEm',
    'inicio': 'inicio',  // Manter como está
    'atividades': 'atividades',
  };
  
  for (const [key, value] of Object.entries(obj)) {
    // Usar mapeamento se existir, senão usar a chave como está
    const camelKey = keyMap[key] || key;
    
    if (Array.isArray(value)) {
      converted[camelKey] = value.map(item => 
        typeof item === 'object' ? lowercaseToCamel(item) : item
      );
    } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
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
      try {
        // Listar todas as estimativas
        const { data, error } = await supabase
          .from('estimativas')
          .select('*')
          .order('id', { ascending: false });

        if (error) {
          console.error('❌ Erro Supabase:', error);
          return res.status(400).json({ erro: error.message });
        }

        // Converter resposta para camelCase
        try {
          const converted = data?.map(lowercaseToCamel) || [];
          return res.status(200).json(converted);
        } catch (conversionError) {
          console.error('❌ Erro ao converter dados:', conversionError);
          return res.status(500).json({ erro: 'Erro ao converter dados da API' });
        }
      } catch (queryError) {
        console.error('❌ Erro na query Supabase:', queryError);
        return res.status(500).json({ erro: 'Erro ao consultar banco de dados' });
      }
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
