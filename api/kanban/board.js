import { supabase } from '../lib/supabase.js';
import { setCorsHeaders } from '../lib/auth.js';
import { snakeToCamelObj } from '../lib/case-converter.js';

export default async function handler(req, res) {
  setCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [{ data: columns, error: colError }, { data: cards, error: cardError }, { data: tasks, error: taskError }] = await Promise.all([
      supabase.from('kanban_columns').select('*').order('position', { ascending: true }),
      supabase.from('kanban_cards').select('*').order('position', { ascending: true }),
      supabase.from('kanban_tasks').select('*').order('position', { ascending: true }),
    ]);

    if (colError) throw colError;
    if (cardError) throw cardError;
    if (taskError) throw taskError;

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
      parent_id: 'parentId',
      card_id: 'cardId',
      criado_em: 'criadoEm',
      atualizado_em: 'atualizadoEm',
    };
    const lowercaseToCamel = (obj) => snakeToCamelObj(obj, keyMap);

    return res.status(200).json({
      columns: (columns || []).map(lowercaseToCamel),
      cards: (cards || []).map(lowercaseToCamel),
      tasks: (tasks || []).map(lowercaseToCamel),
    });
  } catch (error) {
    console.error('Board error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
