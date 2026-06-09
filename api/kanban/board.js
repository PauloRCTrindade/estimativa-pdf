import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

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

    const lowercaseToCamel = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      const keyMap = {
        estimateid: 'estimateId',
        columnid: 'columnId',
        duedate: 'dueDate',
        istemplate: 'isTemplate',
        isdefaulttemplate: 'isDefaultTemplate',
        parentid: 'parentId',
        cardid: 'cardId',
        criadoem: 'criadoEm',
        atualizadoem: 'atualizadoEm',
      };
      const converted = {};
      for (const [key, value] of Object.entries(obj)) {
        const camelKey = keyMap[key] || key;
        if (Array.isArray(value)) {
          converted[camelKey] = value.map(item => typeof item === 'object' ? lowercaseToCamel(item) : item);
        } else if (typeof value === 'object' && value !== null) {
          converted[camelKey] = lowercaseToCamel(value);
        } else {
          converted[camelKey] = value;
        }
      }
      return converted;
    };

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
