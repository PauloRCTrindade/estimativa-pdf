import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

// Configurar variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL || 'https://zhsdfjmagcpayeemijkb.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_apBH3BadubIdBW_AILf7rw_yDV4IILE';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = 3000;

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

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/estimativas - Criar
app.post('/api/estimativas', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('estimativas')
      .insert([req.body])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
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

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/estimativas/:id - Atualizar
app.put('/api/estimativas/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('estimativas')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
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
