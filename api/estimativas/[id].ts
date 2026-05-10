import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';

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

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ erro: 'ID inválido' });
  }

  try {
    if (req.method === 'GET') {
      // Obter uma estimativa específica
      const { data, error } = await supabase
        .from('estimativas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return res.status(404).json({ erro: 'Estimativa não encontrada' });
      }

      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      // Atualizar estimativa
      const { data, error } = await supabase
        .from('estimativas')
        .update(req.body)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ erro: error.message });
      }

      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      // Deletar estimativa
      const { error } = await supabase
        .from('estimativas')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(400).json({ erro: error.message });
      }

      return res.status(204).end();
    }

    return res.status(405).json({ erro: 'Método não permitido' });
  } catch (error: any) {
    console.error('Erro:', error);
    return res.status(500).json({ erro: error.message || 'Erro no servidor' });
  }
}

    return res.status(405).json({ erro: 'Método não permitido' });
  } catch (error: any) {
    console.error('Erro:', error);
    return res.status(500).json({ erro: error.message || 'Erro no servidor' });
  }
}
