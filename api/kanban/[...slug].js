import { supabase } from '../lib/supabase.js';
import { setCorsHeaders, verifyAuth, unauthorized } from '../lib/auth.js';
import { camelToSnakeObj, snakeToCamelObj } from '../lib/case-converter.js';

const kanbanCardKeyMap = {
  estimate_id: 'estimateId',
  column_id: 'columnId',
  due_date: 'dueDate',
  is_template: 'isTemplate',
  is_default_template: 'isDefaultTemplate',
  is_archived: 'isArchived',
  completed: 'completed',
  completed_estimate_task_ids: 'completedEstimateTaskIds',
  data_real_inicio: 'dataRealInicio',
  dias_impactados: 'diasImpactados',
  chg_dias: 'chgDias',
  esteira_pre_prod: 'esteiraPreProd',
  cronograma_real: 'cronogramaReal',
  real_production_date: 'realProductionDate',
  criado_em: 'criadoEm',
  atualizado_em: 'atualizadoEm',
};

const kanbanColumnKeyMap = {
  criado_em: 'criadoEm',
  atualizado_em: 'atualizadoEm',
};

const kanbanTaskKeyMap = {
  card_id: 'cardId',
  parent_id: 'parentId',
  due_date: 'dueDate',
  criado_em: 'criadoEm',
  atualizado_em: 'atualizadoEm',
};

function kanbanCardLowercaseToCamel(obj) {
  return snakeToCamelObj(obj, kanbanCardKeyMap);
}

function kanbanColumnLowercaseToCamel(obj) {
  return snakeToCamelObj(obj, kanbanColumnKeyMap);
}

function kanbanTaskLowercaseToCamel(obj) {
  return snakeToCamelObj(obj, kanbanTaskKeyMap);
}

function normalizeSlug(slug) {
  if (typeof slug === 'string') return slug.split('/').filter(Boolean);
  if (Array.isArray(slug)) return slug;
  return [];
}

async function handleKanbanBoard(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [columnsResult, cardsResult, tasksResult] = await Promise.all([
      supabase.from('kanban_columns').select('*').order('position', { ascending: true }),
      supabase.from('kanban_cards').select('*').order('position', { ascending: true }),
      supabase.from('kanban_tasks').select('*').order('position', { ascending: true }),
    ]);

    if (columnsResult.error) return res.status(400).json({ error: columnsResult.error.message });
    if (cardsResult.error) return res.status(400).json({ error: cardsResult.error.message });
    if (tasksResult.error) return res.status(400).json({ error: tasksResult.error.message });

    return res.status(200).json({
      columns: (columnsResult.data || []).map(kanbanColumnLowercaseToCamel),
      cards: (cardsResult.data || []).map(kanbanCardLowercaseToCamel),
      tasks: (tasksResult.data || []).map(kanbanTaskLowercaseToCamel),
    });
  } catch (error) {
    console.error('Board error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}

async function handleKanbanCards(req, res, slug) {
  slug = normalizeSlug(slug);
  const id = slug[0];
  if (slug.length > 1) return res.status(404).json({ error: 'Not found' });

  if (!id) {
    if (req.method === 'GET') {
      let query = supabase.from('kanban_cards').select('*').order('position', { ascending: true });
      if (req.query.column_id) query = query.eq('column_id', req.query.column_id);
      if (req.query.is_template) query = query.eq('is_template', req.query.is_template === 'true');
      if (req.query.is_default_template)
        query = query.eq('is_default_template', req.query.is_default_template === 'true');
      if (req.query.is_archived) query = query.eq('is_archived', req.query.is_archived === 'true');

      const { data, error } = await query;
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json((data || []).map(kanbanCardLowercaseToCamel));
    }

    if (req.method === 'POST') {
      const user = await verifyAuth(req);
      if (!user) return unauthorized(res);

      const { cronogramaReal, ...restBody } = req.body || {};
      const convertedBody = camelToSnakeObj(restBody);
      if (cronogramaReal !== undefined) convertedBody.cronograma_real = cronogramaReal;

      const { data, error } = await supabase
        .from('kanban_cards')
        .insert([convertedBody])
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });
      return res.status(201).json(kanbanCardLowercaseToCamel(data));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('kanban_cards')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(kanbanCardLowercaseToCamel(data));
  }

  if (req.method === 'PUT') {
    const user = await verifyAuth(req);
    if (!user) return unauthorized(res);

    const { cronogramaReal, ...restBody } = req.body || {};
    const convertedBody = camelToSnakeObj(restBody);
    if (cronogramaReal !== undefined) convertedBody.cronograma_real = cronogramaReal;

    const { data, error } = await supabase
      .from('kanban_cards')
      .update(convertedBody)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json(kanbanCardLowercaseToCamel(data));
  }

  if (req.method === 'DELETE') {
    const user = await verifyAuth(req);
    if (!user) return unauthorized(res);

    const { error } = await supabase.from('kanban_cards').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleKanbanColumns(req, res, slug) {
  slug = normalizeSlug(slug);
  const id = slug[0];
  if (slug.length > 1) return res.status(404).json({ error: 'Not found' });

  if (!id) {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('position', { ascending: true });

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json((data || []).map(kanbanColumnLowercaseToCamel));
    }

    if (req.method === 'POST') {
      const user = await verifyAuth(req);
      if (!user) return unauthorized(res);

      const convertedBody = camelToSnakeObj(req.body);
      const { data, error } = await supabase
        .from('kanban_columns')
        .insert([convertedBody])
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });
      return res.status(201).json(kanbanColumnLowercaseToCamel(data));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('kanban_columns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(kanbanColumnLowercaseToCamel(data));
  }

  if (req.method === 'PUT') {
    const user = await verifyAuth(req);
    if (!user) return unauthorized(res);

    const convertedBody = camelToSnakeObj(req.body || {});
    const { data, error } = await supabase
      .from('kanban_columns')
      .update(convertedBody)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json(kanbanColumnLowercaseToCamel(data));
  }

  if (req.method === 'DELETE') {
    const user = await verifyAuth(req);
    if (!user) return unauthorized(res);

    const { error } = await supabase.from('kanban_columns').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleKanbanTasks(req, res, slug) {
  slug = normalizeSlug(slug);
  const id = slug[0];
  if (slug.length > 1) return res.status(404).json({ error: 'Not found' });

  if (!id) {
    if (req.method === 'GET') {
      let query = supabase.from('kanban_tasks').select('*').order('position', { ascending: true });
      if (req.query.card_id) query = query.eq('card_id', req.query.card_id);

      const { data, error } = await query;
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json((data || []).map(kanbanTaskLowercaseToCamel));
    }

    if (req.method === 'POST') {
      const user = await verifyAuth(req);
      if (!user) return unauthorized(res);

      const convertedBody = camelToSnakeObj(req.body);
      const { data, error } = await supabase
        .from('kanban_tasks')
        .insert([convertedBody])
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });
      return res.status(201).json(kanbanTaskLowercaseToCamel(data));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('kanban_tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(kanbanTaskLowercaseToCamel(data));
  }

  if (req.method === 'PUT') {
    const user = await verifyAuth(req);
    if (!user) return unauthorized(res);

    const convertedBody = camelToSnakeObj(req.body || {});
    const { data, error } = await supabase
      .from('kanban_tasks')
      .update(convertedBody)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json(kanbanTaskLowercaseToCamel(data));
  }

  if (req.method === 'DELETE') {
    const user = await verifyAuth(req);
    if (!user) return unauthorized(res);

    const { error } = await supabase.from('kanban_tasks').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default async function handler(req, res) {
  setCorsHeaders(res, req);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const rawSlug = req.query.slug || req.query['[...slug]'] || [];
  let slug = Array.isArray(rawSlug) ? rawSlug : (rawSlug ? [rawSlug] : []);
  slug = normalizeSlug(slug);

  const subResource = slug[0];
  const rest = slug.slice(1);

  switch (subResource) {
    case 'board':
      return handleKanbanBoard(req, res);
    case 'cards':
      return handleKanbanCards(req, res, rest);
    case 'columns':
      return handleKanbanColumns(req, res, rest);
    case 'tasks':
      return handleKanbanTasks(req, res, rest);
    default:
      return res.status(404).json({ error: 'Not found' });
  }
}
