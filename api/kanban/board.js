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
      estimateid: 'estimateId',
      columnid: 'columnId',
      duedate: 'dueDate',
      istemplate: 'isTemplate',
      isdefaulttemplate: 'isDefaultTemplate',
      isarchived: 'isArchived',
      completed: 'completed',
      parentid: 'parentId',
      cardid: 'cardId',
      criadoem: 'criadoEm',
      atualizadoem: 'atualizadoEm',
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
