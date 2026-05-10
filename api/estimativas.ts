import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';

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

      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      // Criar nova estimativa
      const { data, error } = await supabase
        .from('estimativas')
        .insert([req.body])
        .select()
        .single();

      if (error) {
        return res.status(400).json({ erro: error.message });
      }

      return res.status(201).json(data);
    }

    return res.status(405).json({ erro: 'Método não permitido' });
  } catch (error: any) {
    console.error('Erro:', error);
    return res.status(500).json({ erro: error.message || 'Erro no servidor' });
  }
}
