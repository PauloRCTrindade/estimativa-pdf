// Mapeador de colunas: camelCase (aplicação) ↔ snake_case (Supabase)
export const columnMap = {
  // Leitura: snake_case (banco) → camelCase (app)
  'release_alvo': 'releaseAlvo',
  'chg_dias': 'chgDias',
  'esteira_pre_prod': 'esteiraPreProd',
  'dias_parados': 'diasParados',
  'created_at': 'criadoEm',
  'updated_at': 'atualizadoEm',
};

// Mapeamento reverso para escrita
export const reverseColumnMap = Object.entries(columnMap).reduce((acc, [snake, camel]) => {
  acc[camel] = snake;
  return acc;
}, {});

/**
 * Converte objeto com camelCase para snake_case (para enviar ao Supabase)
 */
export function camelToSnake(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = reverseColumnMap[key] || key;
    result[snakeKey] = value;
  }
  return result;
}

/**
 * Converte objeto com snake_case para camelCase (ao receber do Supabase)
 */
export function snakeToCamel(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = columnMap[key] || key;
    result[camelKey] = value;
  }
  return result;
}

/**
 * Converte array de objetos
 */
export function convertArray(arr, converter) {
  return arr.map(item => converter(item));
}
