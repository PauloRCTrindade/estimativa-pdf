import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

// Configurar variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const MANAGEMENT_TOKEN = process.env.SUPABASE_MANAGEMENT_TOKEN;

const app = express();
const PORT = process.env.PORT || 3000;

async function execSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MANAGEMENT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'SQL error');
  return data;
}

// Conversor de camelCase para snake_case (schema do banco)
function camelToSnake(key) {
  return key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
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
    const convertedBody = camelToSnakeCase(req.body);
    
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
    const convertedBody = camelToSnakeCase(req.body);
    
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

// ================================
// KANBAN ENDPOINTS (via Management API SQL)
// ================================

const kanbanKeyMap = {
  estimate_id: 'estimateId', column_id: 'columnId', due_date: 'dueDate',
  is_template: 'isTemplate', is_default_template: 'isDefaultTemplate',
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

function sqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (Array.isArray(val)) return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function buildInsertSql(table, obj) {
  // Filtrar propriedades que não existem no banco (ex: tasks é uma relação separada)
  const keys = Object.keys(obj).filter(k => k !== 'tasks');
  const cols = keys.join(', ');
  const vals = keys.map(k => sqlValue(obj[k])).join(', ');
  return `INSERT INTO ${table} (${cols}) VALUES (${vals}) RETURNING *;`;
}

function buildUpdateSql(table, id, obj) {
  // Filtrar propriedades que não existem no banco (ex: tasks é uma relação separada)
  const sets = Object.entries(obj)
    .filter(([k]) => k !== 'tasks')
    .map(([k, v]) => `${k} = ${sqlValue(v)}`).join(', ');
  return `UPDATE ${table} SET ${sets} WHERE id = '${id}' RETURNING *;`;
}

// GET /api/kanban/board - Board completo
app.get('/api/kanban/board', async (req, res) => {
  try {
    const columns = await execSql("SELECT * FROM kanban_columns ORDER BY position ASC;");
    const cards = await execSql("SELECT * FROM kanban_cards ORDER BY position ASC;");
    const tasks = await execSql("SELECT * FROM kanban_tasks ORDER BY position ASC;");
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
    const data = await execSql("SELECT * FROM kanban_columns ORDER BY position ASC;");
    res.json((data || []).map(toCamelKanban));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/kanban/columns', async (req, res) => {
  try {
    const data = await execSql(buildInsertSql('kanban_columns', camelToSnakeCase(req.body)));
    res.status(201).json(toCamelKanban(data[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/kanban/columns/:id', async (req, res) => {
  try {
    const body = {};
    for (const [key, value] of Object.entries(req.body || {})) body[key.toLowerCase()] = value;
    const data = await execSql(buildUpdateSql('kanban_columns', req.params.id, body));
    res.json(toCamelKanban(data[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/kanban/columns/:id', async (req, res) => {
  try {
    await execSql(`DELETE FROM kanban_columns WHERE id = '${req.params.id}';`);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Cards
app.get('/api/kanban/cards', async (req, res) => {
  try {
    let sql = "SELECT * FROM kanban_cards";
    const wheres = [];
    if (req.query.column_id) wheres.push(`column_id = '${req.query.column_id}'`);
    if (req.query.is_template) wheres.push(`is_template = ${req.query.is_template === 'true'}`);
    if (req.query.is_default_template) wheres.push(`is_default_template = ${req.query.is_default_template === 'true'}`);
    if (wheres.length) sql += " WHERE " + wheres.join(" AND ");
    sql += " ORDER BY position ASC;";
    const data = await execSql(sql);
    res.json((data || []).map(toCamelKanban));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/kanban/cards', async (req, res) => {
  try {
    const data = await execSql(buildInsertSql('kanban_cards', camelToSnakeCase(req.body)));
    res.status(201).json(toCamelKanban(data[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/kanban/cards/:id', async (req, res) => {
  try {
    const body = {};
    for (const [key, value] of Object.entries(req.body || {})) body[key.toLowerCase()] = value;
    const data = await execSql(buildUpdateSql('kanban_cards', req.params.id, body));
    res.json(toCamelKanban(data[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/kanban/cards/:id', async (req, res) => {
  try {
    await execSql(`DELETE FROM kanban_cards WHERE id = '${req.params.id}';`);
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tasks
app.get('/api/kanban/tasks', async (req, res) => {
  try {
    let sql = "SELECT * FROM kanban_tasks";
    if (req.query.card_id) sql += ` WHERE card_id = '${req.query.card_id}'`;
    sql += " ORDER BY position ASC;";
    const data = await execSql(sql);
    res.json((data || []).map(toCamelKanban));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/kanban/tasks', async (req, res) => {
  try {
    const data = await execSql(buildInsertSql('kanban_tasks', camelToSnakeCase(req.body)));
    res.status(201).json(toCamelKanban(data[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/kanban/tasks/:id', async (req, res) => {
  try {
    const body = {};
    for (const [key, value] of Object.entries(req.body || {})) body[key.toLowerCase()] = value;
    const data = await execSql(buildUpdateSql('kanban_tasks', req.params.id, body));
    res.json(toCamelKanban(data[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/kanban/tasks/:id', async (req, res) => {
  try {
    await execSql(`DELETE FROM kanban_tasks WHERE id = '${req.params.id}';`);
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
