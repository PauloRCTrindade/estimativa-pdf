import { supabase } from '../../lib/supabase.js';
import { setCorsHeaders, verifyAuth, unauthorized } from '../../lib/auth.js';
import { camelToSnakeObj, snakeToCamelObj } from '../../lib/case-converter.js';

const keyMap = {
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

function lowercaseToCamel(obj) {
  return snakeToCamelObj(obj, keyMap);
}

export default async function handler(req, res) {
  setCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const slug = req.query.slug || [];
  const id = slug[0];

  if (slug.length > 1) {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    // Collection routes: /api/kanban/cards
    if (!id) {
      if (req.method === 'GET') {
        let query = supabase.from('kanban_cards').select('*').order('position', { ascending: true });
        if (req.query.column_id) query = query.eq('column_id', req.query.column_id);
        if (req.query.is_template) query = query.eq('is_template', req.query.is_template === 'true');
        if (req.query.is_default_template) query = query.eq('is_default_template', req.query.is_default_template === 'true');
        if (req.query.is_archived) query = query.eq('is_archived', req.query.is_archived === 'true');

        const { data, error } = await query;
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json((data || []).map((item) => lowercaseToCamel(item)));
      }

      if (req.method === 'POST') {
        const user = await verifyAuth(req);
        if (!user) return unauthorized(res);

        if (!req.body || typeof req.body !== 'object') {
          return res.status(400).json({ error: 'Request body is required' });
        }

        // Preserva a estrutura interna de cronogramaReal (JSONB) sem converter recursivamente.
        const { cronogramaReal, ...restBody } = req.body || {};
        const convertedBody = camelToSnakeObj(restBody);
        if (cronogramaReal !== undefined) {
          convertedBody.cronograma_real = cronogramaReal;
        }

        const { data, error } = await supabase
          .from('kanban_cards')
          .insert([convertedBody])
          .select()
          .single();

        if (error) return res.status(400).json({ error: error.message });
        return res.status(201).json(lowercaseToCamel(data));
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Item routes: /api/kanban/cards/:id
    if (req.method === 'PUT') {
      const user = await verifyAuth(req);
      if (!user) return unauthorized(res);

      // Preserva a estrutura interna de cronogramaReal (JSONB) sem converter recursivamente.
      const { cronogramaReal, ...restBody } = req.body || {};
      const convertedBody = camelToSnakeObj(restBody);
      if (cronogramaReal !== undefined) {
        convertedBody.cronograma_real = cronogramaReal;
      }

      const { data, error } = await supabase
        .from('kanban_cards')
        .update(convertedBody)
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json(lowercaseToCamel(data));
    }

    if (req.method === 'DELETE') {
      const user = await verifyAuth(req);
      if (!user) return unauthorized(res);

      const { error } = await supabase.from('kanban_cards').delete().eq('id', id);
      if (error) return res.status(400).json({ error: error.message });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Cards error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
