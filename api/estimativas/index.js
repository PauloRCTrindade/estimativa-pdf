// const { supabase } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      try {
        console.log('📨 GET /api/estimativas - retornando array vazio');
        return res.status(200).json([]);
      } catch (queryError) {
        console.error('❌ Erro exception GET:', queryError);
        return res.status(500).json({ erro: 'Erro ao consultar banco de dados', detalhes: queryError.message });
      }
    }

    if (req.method === 'POST') {
      try {
        console.log('📨 POST /api/estimativas - retornando erro (não implementado)');
        return res.status(500).json({ erro: 'POST não implementado' });
      } catch (insertError) {
        console.error('❌ Erro exception POST:', insertError);
        return res.status(500).json({ erro: 'Erro ao criar estimativa', detalhes: insertError.message });
      }
    }

    return res.status(405).json({ erro: 'Método não permitido' });
  } catch (error) {
    console.error('❌ Erro geral:', error);
    return res.status(500).json({ erro: error.message || 'Erro no servidor' });
  }
}
