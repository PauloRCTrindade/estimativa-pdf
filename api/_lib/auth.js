import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ SUPABASE_URL ou SUPABASE_ANON_KEY não definidos. Autenticação desativada.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Verifica o token JWT do Supabase no header Authorization.
 * Retorna o objeto user se válido, ou null se inválido/ausente.
 */
export async function verifyAuth(req) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) return null;

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;

    return data.user;
  } catch {
    return null;
  }
}

/**
 * Helper para responder com 401 Unauthorized
 */
export function unauthorized(res) {
  res.status(401).json({ error: 'Unauthorized' });
}

/**
 * CORS seguro - restringe à origem do frontend
 */
export function setCorsHeaders(res, req) {
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
  ];

  // Em produção, permitir o próprio domínio
  if (process.env.VERCEL_URL) {
    allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Fallback seguro para desenvolvimento
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0] || 'http://localhost:5173');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}
