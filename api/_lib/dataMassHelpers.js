import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

export function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

export function createLine(numero = '', tipos = [], observacao = '', customFields = {}) {
  return {
    id: generateId(),
    numero,
    tipos,
    observacao,
    customFields,
  };
}

export function isLegacyRecord(row) {
  const lines = row.lines;
  return !lines || !Array.isArray(lines) || lines.length === 0;
}

export function rowToDataMass(row) {
  let lines = [];

  if (row.lines && Array.isArray(row.lines) && row.lines.length > 0) {
    lines = row.lines.map((line) => ({
      id: line.id || generateId(),
      numero: line.numero || '',
      tipos: Array.isArray(line.tipos) ? line.tipos : [],
      observacao: line.observacao || '',
      customFields: line.customFields || {},
    }));
  } else if (row.linha) {
    lines = [createLine(row.linha, row.tipos || [], row.observacao || '', row.custom_fields || {})];
  }

  if (lines.length === 0) {
    lines = [createLine()];
  }

  return {
    id: row.id,
    cpf: row.cpf || '',
    lines,
    customFields: row.custom_fields || {},
    createdAt: row.criado_em,
    updatedAt: row.atualizado_em,
  };
}

export async function migrateLegacyRows(supabaseClient) {
  const { data: rows, error } = await supabaseClient
    .from('data_masses')
    .select('*')
    .order('criado_em', { ascending: false });

  if (error || !rows || rows.length === 0) return { rows: [], error };

  const legacyRows = rows.filter(isLegacyRecord);
  if (legacyRows.length === 0) return { rows, error: null };

  const grouped = new Map();
  for (const row of legacyRows) {
    const cpf = row.cpf || '';
    if (!grouped.has(cpf)) grouped.set(cpf, []);
    grouped.get(cpf).push(row);
  }

  for (const [cpf, group] of grouped.entries()) {
    // Ordena do mais recente para o mais antigo
    group.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
    const [target, ...duplicates] = group;

    const lines = group
      .slice()
      .reverse()
      .map((row) =>
        createLine(
          row.linha || '',
          Array.isArray(row.tipos) ? row.tipos : [],
          row.observacao || '',
          row.custom_fields || {}
        )
      );

    const { error: updateError } = await supabaseClient
      .from('data_masses')
      .update({
        lines,
        linha: lines[0]?.numero || '',
        observacao: lines[0]?.observacao || '',
        tipos: lines[0]?.tipos || [],
      })
      .eq('id', target.id);

    if (updateError) {
      console.error(`Erro ao migrar CPF ${cpf}:`, updateError.message);
      continue;
    }

    if (duplicates.length > 0) {
      const ids = duplicates.map((d) => d.id);
      const { error: deleteError } = await supabaseClient
        .from('data_masses')
        .delete()
        .in('id', ids);

      if (deleteError) {
        console.error(`Erro ao deletar duplicados do CPF ${cpf}:`, deleteError.message);
      }
    }
  }

  // Recarrega os dados após migração
  const { data: refreshedRows, error: refreshError } = await supabaseClient
    .from('data_masses')
    .select('*')
    .order('criado_em', { ascending: false });

  return { rows: refreshedRows || [], error: refreshError };
}

export async function safeDataMassInsert(supabaseClient, body) {
  let attemptBody = { ...body };

  while (true) {
    const { data, error } = await supabaseClient
      .from('data_masses')
      .insert([attemptBody])
      .select()
      .single();

    if (!error) return { data, error: null };

    const match = error.message.match(/Could not find the '([^']+)' column/);
    if (match) {
      const col = match[1];
      if (Object.prototype.hasOwnProperty.call(attemptBody, col)) {
        delete attemptBody[col];
        continue;
      }
    }

    return { data, error };
  }
}

export async function safeDataMassUpdate(supabaseClient, id, body) {
  let attemptBody = { ...body };

  while (true) {
    const { data, error } = await supabaseClient
      .from('data_masses')
      .update(attemptBody)
      .eq('id', id)
      .select()
      .single();

    if (!error) return { data, error: null };

    const match = error.message.match(/Could not find the '([^']+)' column/);
    if (match) {
      const col = match[1];
      if (Object.prototype.hasOwnProperty.call(attemptBody, col)) {
        delete attemptBody[col];
        continue;
      }
    }

    return { data, error };
  }
}

export function extractPayload(body) {
  const { lines, customFields, ...restBody } = body || {};
  return { lines, customFields, restBody };
}

export function buildLegacyFields(lines = []) {
  const first = lines[0] || {};
  return {
    linha: first.numero || '',
    observacao: first.observacao || '',
    tipos: Array.isArray(first.tipos) ? first.tipos : [],
  };
}
