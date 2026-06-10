/**
 * Converte camelCase para snake_case.
 * Ex: estimateId -> estimate_id, dueDate -> due_date, isDefaultTemplate -> is_default_template
 */
function camelToSnake(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Converte um objeto com chaves camelCase para snake_case recursivamente.
 * Arrays e objetos aninhados são processados.
 * Valores nulos e primitivos são preservados.
 */
export function camelToSnakeObj(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => (typeof item === 'object' && item !== null ? camelToSnakeObj(item) : item));
  }
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    if (Array.isArray(value)) {
      converted[snakeKey] = value.map(item => (typeof item === 'object' && item !== null ? camelToSnakeObj(item) : item));
    } else if (typeof value === 'object' && value !== null) {
      converted[snakeKey] = camelToSnakeObj(value);
    } else {
      converted[snakeKey] = value;
    }
  }
  return converted;
}

/**
 * Converte snake_case para camelCase usando um mapa de chaves conhecidas.
 */
export function snakeToCamelObj(obj, keyMap = {}) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => (typeof item === 'object' && item !== null ? snakeToCamelObj(item, keyMap) : item));
  }
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = keyMap[key] || key;
    if (Array.isArray(value)) {
      converted[camelKey] = value.map(item => (typeof item === 'object' && item !== null ? snakeToCamelObj(item, keyMap) : item));
    } else if (typeof value === 'object' && value !== null) {
      converted[camelKey] = snakeToCamelObj(value, keyMap);
    } else {
      converted[camelKey] = value;
    }
  }
  return converted;
}
