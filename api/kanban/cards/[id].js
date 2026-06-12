import { supabase } from '../../lib/supabase.js';
import { setCorsHeaders, verifyAuth, unauthorized } from '../../lib/auth.js';
import { camelToSnakeObj, snakeToCamelObj } from '../../lib/case-converter.js';

const keyMap = {
  estimateid: 'estimateId',
  columnid: 'columnId',
  duedate: 'dueDate',
  istemplate: 'isTemplate',
  isdefaulttemplate: 'isDefaultTemplate',
  isarchived: 'isArchived',
  completed: 'completed',
  completedestimatetaskids: 'completedEstimateTaskIds',
  criadoem: 'criadoEm',
  atualizadoem: 'atualizadoEm',
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

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID is required' });

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('kanban_cards').select('*').eq('id', id).single();
      if (error) return res.status(404).json({ error: error.message });
      return res.status(200).json(lowercaseToCamel(data));
    }

    if (req.method === 'PUT') {
      const user = await verifyAuth(req);
      if (!user) return unauthorized(res);
      const convertedBody = camelToSnakeObj(req.body || {});
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
    console.error('Card id error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
