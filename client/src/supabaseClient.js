import { createClient } from '@supabase/supabase-js';

// Read config from Vite env vars (see .env.example). These are the PUBLIC
// URL + anon key — safe to expose to the browser.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// True only when both values are present. The UI uses this to show a
// "configure Supabase" banner instead of crashing on a blank page.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy client/.env.example to client/.env.'
  );
}

// createClient() throws if the URL/key are missing, which would blank the page.
// Fall back to harmless placeholders when unconfigured so the app still renders;
// auth calls simply won't work until real values are in client/.env.
export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'public-anon-key-placeholder'
);
