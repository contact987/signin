// Express backend for the finance-tracker scaffold.
// Its one job right now: verify a Supabase access token sent by the frontend
// and expose a single protected endpoint. Extend this with your own routes
// (transactions, budgets, etc.) as the finance tracker grows.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  CLIENT_ORIGIN = 'http://localhost:5173',
  PORT = 3001,
} = process.env;

// Fail fast with a clear message if the secrets aren't configured.
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and fill them in.'
  );
  process.exit(1);
}

// Server-side Supabase client. The SERVICE ROLE key bypasses Row Level
// Security and must NEVER be shipped to the browser — that's why it lives
// only in the backend's .env.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const app = express();

// Only allow the frontend's origin to call this API.
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

/**
 * Express middleware that pulls the Bearer token from the Authorization
 * header, asks Supabase who it belongs to, and attaches the user to req.
 * Responds 401 for anything missing or invalid.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  // Verify the JWT against Supabase's auth server.
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = data.user;
  next();
}

// Simple sanity-check route. Returns a greeting with the verified user's email.
app.get('/api/hello', requireAuth, (req, res) => {
  res.json({
    message: 'Hello, verified user!',
    email: req.user.email,
  });
});

// ---------------------------------------------------------------------------
// Transactions CRUD
//
// Every route below is protected by requireAuth, so req.user is always set.
// We scope every query to req.user.id so a user can only ever touch their own
// rows. (The service_role client bypasses RLS, so this filtering is what keeps
// users isolated at the API layer — never trust a user_id from the client.)
// ---------------------------------------------------------------------------

// Fields a client is allowed to set/change. user_id, id, created_at are server-owned.
const EDITABLE_FIELDS = ['type', 'amount', 'category', 'note', 'occurred_on'];

/** Pick only the editable fields from a request body. */
function pickEditable(body = {}) {
  const out = {};
  for (const key of EDITABLE_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

// LIST — all of the current user's transactions, newest first.
app.get('/api/transactions', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', req.user.id)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// CREATE — add a transaction owned by the current user.
app.post('/api/transactions', requireAuth, async (req, res) => {
  const fields = pickEditable(req.body);

  // Minimal validation; the DB has CHECK constraints as a backstop.
  if (fields.type !== 'income' && fields.type !== 'expense') {
    return res.status(400).json({ error: "type must be 'income' or 'expense'" });
  }
  if (fields.amount === undefined || isNaN(Number(fields.amount))) {
    return res.status(400).json({ error: 'amount must be a number' });
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...fields, user_id: req.user.id })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// UPDATE — change one of the current user's transactions.
app.patch('/api/transactions/:id', requireAuth, async (req, res) => {
  const fields = pickEditable(req.body);
  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'No editable fields provided' });
  }

  const { data, error } = await supabase
    .from('transactions')
    .update(fields)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id) // ensures you can't edit someone else's row
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Transaction not found' });
  res.json(data);
});

// DELETE — remove one of the current user's transactions.
app.delete('/api/transactions/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Transaction not found' });
  res.json({ deleted: data.id });
});

// Simple unauthenticated health check, handy while developing.
app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Allowing CORS from ${CLIENT_ORIGIN}`);
});
