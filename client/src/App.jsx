import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// Base URL for the backend API. In production on Vercel the serverless
// functions live at the same origin, so this is empty and calls go to
// `/api/...`. Override with VITE_API_URL for a separately-hosted backend.
const API_URL = import.meta.env.VITE_API_URL || '';

// Version tag for the embedded Studio (client/public/studio.html). Bump this
// whenever studio.html changes — it cache-busts the iframe so every browser
// picks up the new build on a normal reload (no hard refresh needed).
const STUDIO_V = '2026-10-06-6';

export default function App() {
  // The current Supabase session (null when logged out).
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Grab any existing session on load (survives page refresh)...
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      if (s) {
        // "Stay signed in" was unticked → the session should not outlive the
        // browser. sessionStorage dies when the browser/app closes, so a
        // missing marker means this is a NEW browser session: sign out.
        const stay = localStorage.getItem('ss_stay') !== '0';
        const sameBrowserSession = !!sessionStorage.getItem('ss_sess');
        // Inactivity rule: not opened for 7+ days → sign out automatically.
        const last = Number(localStorage.getItem('ss_lastseen') || 0);
        const idleTooLong = last && Date.now() - last > 7 * 24 * 60 * 60 * 1000;
        if ((!stay && !sameBrowserSession) || idleTooLong) {
          supabase.auth.signOut();
          setSession(null);
          return;
        }
      }
      setSession(s);
    });

    // Record activity so the 7-day idle logout counts from the LAST visit.
    const touch = () => {
      localStorage.setItem('ss_lastseen', String(Date.now()));
      sessionStorage.setItem('ss_sess', '1');
    };
    touch();
    window.addEventListener('focus', touch);

    // ...and keep it in sync on login/logout/token-refresh.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener('focus', touch);
    };
  }, []);

  // Once signed in, show the full-screen Studio OS app.
  if (session) {
    return <LoggedIn session={session} />;
  }

  // Signed out: Google-only sign-in card. No email/password, no sign-up —
  // accounts exist purely through the office Google login (and the database
  // allowlist decides who gets in).
  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-6">
          Sugar Shot <span className="text-[#FF4C4C]">Studio OS</span>
        </h1>
        {!isSupabaseConfigured && (
          <div className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <strong>Supabase not configured.</strong> Copy{' '}
            <code>client/.env.example</code> to <code>client/.env</code> and add your
            project URL and anon key, then reload. Auth won’t work until then.
          </div>
        )}
        <GoogleSignInCard />
      </div>
    </div>
  );
}

/**
 * The only way in: "Continue with Google" with the office Workspace account.
 * `hd` pre-selects the sugarshotfilms.com domain in Google's account chooser;
 * hard enforcement comes from the Internal OAuth consent screen (Google side)
 * plus the allowed_emails/domain trigger (database side).
 */
function GoogleSignInCard() {
  const [stay, setStay] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setError('');
    setLoading(true);
    // Remember the choice BEFORE the OAuth redirect. '0' = sign out when the
    // browser/app closes; '1' = stay signed in (until 7 idle days).
    localStorage.setItem('ss_stay', stay ? '1' : '0');
    sessionStorage.setItem('ss_sess', '1');
    localStorage.setItem('ss_lastseen', String(Date.now()));
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { hd: 'sugarshotfilms.com', prompt: 'select_account' },
      },
    });
    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-4">
      <p className="text-sm text-slate-600 text-center">
        Sign in with your <strong>@sugarshotfilms.com</strong> Google account.
      </p>
      <button
        type="button"
        onClick={signIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 border border-slate-300 hover:bg-slate-50 disabled:opacity-60 rounded-md py-3 font-medium text-slate-700"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        {loading ? 'Opening Google…' : 'Continue with Google'}
      </button>
      <label className="flex items-center justify-center gap-2 text-sm text-slate-600 select-none cursor-pointer">
        <input
          type="checkbox"
          checked={stay}
          onChange={(e) => setStay(e.target.checked)}
          className="w-4 h-4 accent-[#FF4C4C]"
        />
        Stay signed in
      </label>
      {error && (
        <p className="text-sm text-red-700 bg-red-50 rounded-md px-3 py-2">{error}</p>
      )}
      <p className="text-xs text-slate-400 text-center">
        Only Sugar Shot team accounts can sign in. You&apos;ll be signed out
        automatically after 7 days of inactivity.
      </p>
    </div>
  );
}

/**
 * Logged-in view: shows the full-screen Sugar Shot Studio OS (served as a
 * static page from /studio.html) with logout handled via its sidebar.
 */
function LoggedIn({ session }) {
  // The Studio's own "Log out" button (in its sidebar) posts a message to this
  // parent window; we catch it here and sign out via Supabase.
  useEffect(() => {
    function onMessage(e) {
      if (e.data && e.data.type === 'sso-logout') supabase.auth.signOut();
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <div className="fixed inset-0">
      {/* The Studio OS fills the whole screen. One common experience for the
          whole team — no Supervisor/Expert split. Logout lives in its sidebar. */}
      {/* `v` is a cache-buster: bump STUDIO_V whenever studio.html changes so
          every browser fetches the new build without needing a hard refresh. */}
      <iframe
        src={`/studio.html?role=partner&v=${STUDIO_V}`}
        title="Sugar Shot Studio OS"
        className="w-full h-full border-0"
      />
    </div>
  );
}
