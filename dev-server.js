import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

// Configurar variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL || 'https://zhsdfjmagcpayeemijkb.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_apBH3BadubIdBW_AILf7rw_yDV4IILE';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = 3000;

// Conversor de camelCase para lowercase (schema do banco)
function camelToLowercase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    // Converter chave para lowercase
    const lowerKey = key.toLowerCase();
    // Se for objeto ou array, processar recursivamente
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
function lowercaseToCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    // Converter apenas algumas chaves conhecidas
    let camelKey = key;
    if (key === 'releasealvo') camelKey = 'releaseAlvo';
    else if (key === 'chgdias') camelKey = 'chgDias';
    else if (key === 'esteirapreprod') camelKey = 'esteiraPreProd';
    else if (key === 'diasparados') camelKey = 'diasParados';
    else if (key === 'criadoem') camelKey = 'criadoEm';
    else if (key === 'atualizadoem') camelKey = 'atualizadoEm';
    
    // Se for array, processar recursivamente
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

// Middleware
app.use(cors());
app.use(express.json());

// GET /api/estimativas - Listar todas
app.get('/api/estimativas', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('estimativas')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Converter resposta para camelCase
    const converted = data?.map(lowercaseToCamel) || [];
    res.json(converted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/estimativas - Criar
app.post('/api/estimativas', async (req, res) => {
  try {
    // Converter camelCase para lowercase
    const convertedBody = camelToLowercase(req.body);
    
    const { data, error } = await supabase
      .from('estimativas')
      .insert([convertedBody])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Converter resposta para camelCase
    res.status(201).json(lowercaseToCamel(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/estimativas/:id - Obter uma
app.get('/api/estimativas/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('estimativas')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Estimativa não encontrada' });
    }

    // Converter resposta para camelCase
    res.json(lowercaseToCamel(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/estimativas/:id - Atualizar
app.put('/api/estimativas/:id', async (req, res) => {
  try {
    // Converter camelCase para lowercase
    const convertedBody = camelToLowercase(req.body);
    
    const { data, error } = await supabase
      .from('estimativas')
      .update(convertedBody)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Converter resposta para camelCase
    res.json(lowercaseToCamel(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/estimativas/:id - Deletar
app.delete('/api/estimativas/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('estimativas')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Estimativa deletada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'API local is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 API local running on http://localhost:${PORT}`);
  console.log(`📊 Supabase: ${supabaseUrl}`);
  console.log(`\n✅ Endpoints available:`);
  console.log(`  GET    /api/estimativas`);
  console.log(`  POST   /api/estimativas`);
  console.log(`  GET    /api/estimativas/:id`);
  console.log(`  PUT    /api/estimativas/:id`);
  console.log(`  DELETE /api/estimativas/:id`);
  console.log(`  GET    /health`);
});
