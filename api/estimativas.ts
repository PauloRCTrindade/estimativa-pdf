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
          return res.status(400).json({ erro: 'Erro ao consultar banco', detalhes: error.message });
        }

        console.log(`✅ Retornando ${data?.length || 0} estimativas`);

        // Retornar dados brutos do Supabase sem conversão (debug)
        return res.status(200).json(data || []);
      } catch (queryError: any) {
        console.error('❌ Erro na query Supabase:', queryError);
        return res.status(500).json({ erro: 'Erro ao consultar banco de dados', detalhes: queryError.message });
      }
    }

    if (req.method === 'POST') {
      try {
        console.log('📨 Recebido POST body:', JSON.stringify(req.body).substring(0, 200));
        
        // Enviar direto para Supabase sem conversão (debug)
        const { data, error } = await supabase
          .from('estimativas')
          .insert([req.body])
          .select()
          .single();

        if (error) {
          console.error('❌ Erro ao inserir:', error);
          return res.status(400).json({ erro: 'Erro ao criar estimativa', detalhes: error.message });
        }

        console.log('✅ Estimativa criada:', data?.id);
        return res.status(201).json(data);
      } catch (insertError: any) {
        console.error('❌ Erro na inserção:', insertError);
        return res.status(500).json({ erro: 'Erro ao criar estimativa', detalhes: insertError.message });
      }
    }

    return res.status(405).json({ erro: 'Método não permitido' });
  } catch (error: any) {
    console.error('Erro:', error);
    return res.status(500).json({ erro: error.message || 'Erro no servidor' });
  }
}
