// Shared helpers for the Vercel serverless functions under /api.
// These run on Vercel's servers (not the browser), so they can safely use the
// Supabase SERVICE ROLE key. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
// the Vercel project's Environment Variables (never commit them).

import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

// Server-side Supabase client. Bypasses Row Level Security, so every query in
// the API functions must filter by the authenticated user's id.
export const supabase = createClient(
  SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Verify the Bearer token on a request and return the Supabase user.
 * On failure it writes a 401 to `res` and returns null — callers should
 * `if (!user) return;` right after.
 */
export async function getUserOr401(req, res) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }

  return data.user;
}

// Fields a client is allowed to set on a transaction.
export const EDITABLE_FIELDS = ['type', 'amount', 'category', 'note', 'occurred_on'];

/** Pick only the editable fields from a request body. */
export function pickEditable(body = {}) {
  const out = {};
  for (const key of EDITABLE_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}
