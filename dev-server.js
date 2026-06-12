import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

// Configurar variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


const app = express();
const PORT = process.env.PORT || 3000;

// Conversor de camelCase para snake_case (schema do banco)
function camelToSnake(key) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

function camelToSnakeCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    if (Array.isArray(value)) {
      converted[snakeKey] = value.map(item => 
        typeof item === 'object' ? camelToSnakeCase(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      converted[snakeKey] = camelToSnakeCase(value);
    } else {
      converted[snakeKey] = value;
    }
  }
  return converted;
}

// Tenta inserir/atualizar no Supabase removendo automaticamente campos que não existem no schema
async function safeEstimativaInsert(body) {
  let attemptBody = { ...body };
  const removedFields = [];
  
  while (true) {
    const { data, error } = await supabase
      .from('estimativas')
      .insert([attemptBody])
      .select()
      .single();
    
    if (!error) return { data, error: null };
    
    // Se o erro for "column not found", extrai o nome da coluna e remove
    const match = error.message.match(/Could not find the '([^']+)' column/);
    if (match) {
      const col = match[1];
      if (attemptBody.hasOwnProperty(col)) {
        delete attemptBody[col];
        removedFields.push(col);
        continue; // tenta novamente
      }
    }
    
    // Outro tipo de erro: retorna
    return { data, error };
  }
}

async function safeEstimativaUpdate(id, body) {
  let attemptBody = { ...body };
  
  while (true) {
    const { data, error } = await supabase
      .from('estimativas')
      .update(attemptBody)
      .eq('id', id)
      .select()
      .single();
    
    if (!error) return { data, error: null };
    
    const match = error.message.match(/Could not find the '([^']+)' column/);
    if (match) {
      const col = match[1];
      if (attemptBody.hasOwnProperty(col)) {
        delete attemptBody[col];
        continue;
      }
    }
    
    return { data, error };
  }
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

// Middleware - Configurar CORS com origins específicas
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',     // Vite dev
      'http://localhost:5174',     // Vite dev (port 2)
      'http://localhost:5175',     // Vite dev (port 3)
      'http://localhost:3000',      // Local
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL,     // Produção (Vercel)
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS não permitido'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

// GET /api/estimativas - Listar todas
app.get('/api/estimativas', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('estimativas')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(400).json({ error: error.message, details: error });
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
    // Converter camelCase para snake_case
    const convertedBody = camelToSnakeCase(req.body);

    const { data, error } = await safeEstimativaInsert(convertedBody);

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
    // Converter camelCase para snake_case
    const convertedBody = camelToSnakeCase(req.body);
    
    const { data, error } = await safeEstimativaUpdate(req.params.id, convertedBody);

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

// ================================
// KANBAN ENDPOINTS (via Management API SQL)
// ================================

const kanbanKeyMap = {
  estimate_id: 'estimateId', column_id: 'columnId', due_date: 'dueDate',
  is_template: 'isTemplate', is_default_template: 'isDefaultTemplate', is_archived: 'isArchived', completed: 'completed',
  completed_estimate_task_ids: 'completedEstimateTaskIds',
  parent_id: 'parentId', card_id: 'cardId', criado_em: 'criadoEm', atualizado_em: 'atualizadoEm',
};

function toCamelKanban(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = kanbanKeyMap[key] || key;
    if (Array.isArray(value)) {
      converted[camelKey] = value.map(item => typeof item === 'object' ? toCamelKanban(item) : item);
    } else if (typeof value === 'object' && value !== null) {
      converted[camelKey] = toCamelKanban(value);
    } else {
      converted[camelKey] = value;
    }
  }
  return converted;
}

// GET /api/kanban/board - Board completo
app.get('/api/kanban/board', async (req, res) => {
  try {
    const [{ data: columns, error: colError }, { data: cards, error: cardError }, { data: tasks, error: taskError }] = await Promise.all([
      supabase.from('kanban_columns').select('*').order('position', { ascending: true }),
      supabase.from('kanban_cards').select('*').order('position', { ascending: true }),
      supabase.from('kanban_tasks').select('*').order('position', { ascending: true }),
    ]);
    if (colError) throw colError;
    if (cardError) throw cardError;
    if (taskError) throw taskError;
    res.json({
      columns: (columns || []).map(toCamelKanban),
      cards: (cards || []).map(toCamelKanban),
      tasks: (tasks || []).map(toCamelKanban),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Columns
app.get('/api/kanban/columns', async (req, res) => {
  try {
    const { data, error } = await supabase.from('kanban_columns').select('*').order('position', { ascending: true });
    if (error) throw error;
    res.json((data || []).map(toCamelKanban));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/kanban/columns', async (req, res) => {
  try {
    const { data, error } = await supabase.from('kanban_columns').insert(camelToSnakeCase(req.body)).select().single();
    if (error) throw error;
    res.status(201).json(toCamelKanban(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/kanban/columns/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('kanban_columns').update(camelToSnakeCase(req.body)).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(toCamelKanban(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/kanban/columns/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('kanban_columns').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Cards
app.get('/api/kanban/cards', async (req, res) => {
  try {
    let query = supabase.from('kanban_cards').select('*').order('position', { ascending: true });
    if (req.query.column_id) query = query.eq('column_id', req.query.column_id);
    if (req.query.is_template) query = query.eq('is_template', req.query.is_template === 'true');
    if (req.query.is_default_template) query = query.eq('is_default_template', req.query.is_default_template === 'true');
    if (req.query.is_archived) query = query.eq('is_archived', req.query.is_archived === 'true');
    const { data, error } = await query;
    if (error) throw error;
    res.json((data || []).map(toCamelKanban));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/kanban/cards', async (req, res) => {
  try {
    const { data, error } = await supabase.from('kanban_cards').insert(camelToSnakeCase(req.body)).select().single();
    if (error) throw error;
    res.status(201).json(toCamelKanban(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/kanban/cards/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('kanban_cards').update(camelToSnakeCase(req.body)).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(toCamelKanban(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/kanban/cards/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('kanban_cards').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tasks
app.get('/api/kanban/tasks', async (req, res) => {
  try {
    let query = supabase.from('kanban_tasks').select('*').order('position', { ascending: true });
    if (req.query.card_id) query = query.eq('card_id', req.query.card_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json((data || []).map(toCamelKanban));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/kanban/tasks', async (req, res) => {
  try {
    const { data, error } = await supabase.from('kanban_tasks').insert(camelToSnakeCase(req.body)).select().single();
    if (error) throw error;
    res.status(201).json(toCamelKanban(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/kanban/tasks/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('kanban_tasks').update(camelToSnakeCase(req.body)).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(toCamelKanban(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/kanban/tasks/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('kanban_tasks').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
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
  console.log(`  GET    /api/kanban/board`);
  console.log(`  GET    /api/kanban/columns`);
  console.log(`  GET    /api/kanban/cards`);
  console.log(`  GET    /api/kanban/tasks`);
  console.log(`  GET    /health`);
});
