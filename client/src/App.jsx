import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// Base URL for the backend API. In production on Vercel the serverless
// functions live at the same origin, so this is empty and calls go to
// `/api/...`. Override with VITE_API_URL for a separately-hosted backend.
const API_URL = import.meta.env.VITE_API_URL || '';

// Version tag for the embedded Studio (client/public/studio.html). Bump this
// whenever studio.html changes — it cache-busts the iframe so every browser
// picks up the new build on a normal reload (no hard refresh needed).
const STUDIO_V = '2026-08-12-7';

export default function App() {
  // The current Supabase session (null when logged out).
  const [session, setSession] = useState(null);
  // True right after a successful signup — shows the "Proceed to sign in"
  // screen. Lives here (not in SignupForm) so it survives the brief
  // auto-login/logout that signup triggers when email confirmation is off.
  const [justSignedUp, setJustSignedUp] = useState(false);
  // Set when a signup is waiting on the emailed 6-digit code (email
  // confirmation ON). Shows the OTP entry screen for that address.
  const [pendingEmail, setPendingEmail] = useState(null);
  // Which role to open the Studio OS in — chosen on the sign-in page.
  // Persisted to localStorage so it survives the Google OAuth redirect.
  const [role, setRoleState] = useState(
    () => localStorage.getItem('ss_role') || 'partner'
  ); // 'partner' | 'employee'
  const setRole = (r) => {
    localStorage.setItem('ss_role', r);
    setRoleState(r);
  };

  useEffect(() => {
    // Grab any existing session on load (survives page refresh)...
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    // ...and keep it in sync on login/logout/token-refresh.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Decide which screen to show. The "just signed up" confirmation takes
  // priority over the session so a transient signup session can't flash the
  // logged-in view.

  // Once logged in (and not mid-signup), show the full-screen Studio OS app.
  if (session && !justSignedUp && !pendingEmail) {
    return <LoggedIn session={session} role={role} />;
  }

  // Otherwise show the centered auth card (login / signup / signup-success).
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-6">
          Finance Tracker
        </h1>
        {!isSupabaseConfigured && (
          <div className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <strong>Supabase not configured.</strong> Copy{' '}
            <code>client/.env.example</code> to <code>client/.env</code> and add your
            project URL and anon key, then reload. Auth won’t work until then.
          </div>
        )}
        {pendingEmail ? (
          <OtpForm
            email={pendingEmail}
            onVerified={() => setPendingEmail(null)}
            onBack={() => setPendingEmail(null)}
          />
        ) : justSignedUp ? (
          <SignupSuccess onGoToLogin={() => setJustSignedUp(false)} />
        ) : (
          <AuthPanel
            onSignedUp={() => setJustSignedUp(true)}
            onPendingOtp={setPendingEmail}
            role={role}
            onRole={setRole}
          />
        )}
      </div>
    </div>
  );
}

/** Login / Sign Up tabbed panel, shown when logged out. */
function AuthPanel({ onSignedUp, onPendingOtp, role, onRole }) {
  const [tab, setTab] = useState('login'); // 'login' | 'signup'

  return (
    <div className="bg-white rounded-xl shadow p-6">
      {/* Account type chooser — applies to both Log In and Sign Up. */}
      <RoleToggle role={role} onRole={onRole} />

      {/* Tabs */}
      <div className="flex mb-6 border-b border-slate-200">
        <TabButton active={tab === 'login'} onClick={() => setTab('login')}>
          Log In
        </TabButton>
        <TabButton active={tab === 'signup'} onClick={() => setTab('signup')}>
          Sign Up
        </TabButton>
      </div>

      {tab === 'login' ? (
        <LoginForm />
      ) : (
        <SignupForm onSignedUp={onSignedUp} onPendingOtp={onPendingOtp} />
      )}

      {/* --- Google SSO (Workspace accounts) --- */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400">or</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      <GoogleButton />
    </div>
  );
}

/**
 * "Continue with Google" — signs in via the sugarshotfilms.com Google
 * Workspace. `hd` pre-selects the office domain in Google's account chooser;
 * hard enforcement comes from the Internal OAuth consent screen (Google side)
 * plus the allowed_emails trigger (database side).
 */
function GoogleButton() {
  const [error, setError] = useState('');

  async function signIn() {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { hd: 'sugarshotfilms.com', prompt: 'select_account' },
      },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={signIn}
        className="w-full flex items-center justify-center gap-3 border border-slate-300 hover:bg-slate-50 rounded-md py-2 font-medium text-slate-700"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Continue with Google
      </button>
      <p className="text-xs text-slate-400 text-center">
        Use your @sugarshotfilms.com Google account
      </p>
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

// The two account types. Labels are what the user sees; `value` is the role
// the Studio OS understands (Supervisor = partner, Expert = employee).
const ROLE_OPTIONS = [
  { value: 'partner', label: 'Supervisor' },
  { value: 'employee', label: 'Expert' },
];

/** Supervisor / Expert chooser shown at the top of the sign-in page. */
function RoleToggle({ role, onRole }) {
  return (
    <div className="mb-5">
      <span className="text-sm font-medium text-slate-700">I am a</span>
      <div className="mt-1 flex gap-2">
        {ROLE_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => onRole(value)}
            className={`flex-1 rounded-md py-2 text-sm font-medium border transition-colors ${
              role === value
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 pb-2 text-sm font-medium transition-colors ${
        active
          ? 'text-indigo-600 border-b-2 border-indigo-600'
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

/** Email + password login via supabase.auth.signInWithPassword(). */
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // On success, onAuthStateChange in App flips us to the logged-in view.
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Email" type="email" value={email} onChange={setEmail} />
      <Field label="Password" type="password" value={password} onChange={setPassword} />
      {error && <ErrorText>{error}</ErrorText>}
      <SubmitButton loading={loading}>Log In</SubmitButton>
    </form>
  );
}

/** Email + password + confirm signup via supabase.auth.signUp(). */
function SignupForm({ onSignedUp, onPendingOtp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Client-side checks before hitting the network. (The same office-domain
    // rule is ALSO enforced in the database — see server/auth_domain_lock.sql —
    // so bypassing this form doesn't get anyone in.)
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@sugarshotfilms\.com$/.test(cleanEmail)) {
      setError('Please use your @sugarshotfilms.com office email — other addresses cannot register.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // With "Confirm email" ON there is no session yet — the account is dormant
    // until the emailed 6-digit code (or link) is used. Show the OTP screen.
    if (!data?.session) {
      setLoading(false);
      onPendingOtp(cleanEmail);
      return;
    }

    // "Confirm email" OFF: Supabase auto-created a session. We want the user
    // to sign in explicitly, so clear that fresh session...
    await supabase.auth.signOut();
    setLoading(false);

    // ...and let App show the "Proceed to sign in" screen. (Kept in App so it
    // survives the brief session flip that signout causes here.)
    onSignedUp();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Email" type="email" value={email} onChange={setEmail} />
      <Field label="Password" type="password" value={password} onChange={setPassword} />
      <Field label="Confirm Password" type="password" value={confirm} onChange={setConfirm} />
      {error && <ErrorText>{error}</ErrorText>}
      <SubmitButton loading={loading}>Sign Up</SubmitButton>
    </form>
  );
}

/**
 * OTP entry screen shown right after signup (email confirmation ON): the
 * person types the 6-digit code from their @sugarshotfilms.com inbox. On
 * success Supabase confirms the account AND starts a session, so they land
 * straight in the Studio. The link in the same email keeps working too.
 */
function OtpForm({ email, onVerified, onBack }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function verify(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    const token = code.trim();
    if (!/^\d{6}$/.test(token)) {
      setError('Enter the 6-digit code from the email.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    onVerified(); // session is live now — App switches to the Studio
  }

  async function resend() {
    setError('');
    setInfo('');
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) setError(error.message);
    else setInfo('New code sent — give it a minute and check the inbox.');
  }

  return (
    <form onSubmit={verify} className="bg-white rounded-xl shadow p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Verify your email</h2>
      <p className="text-sm text-slate-600">
        We sent a 6-digit code to <strong>{email}</strong>. Enter it below (or
        click the link in the same email).
      </p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="••••••"
        className="w-full text-center text-2xl tracking-[0.5em] font-semibold border border-slate-300 rounded-md py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {error && <ErrorText>{error}</ErrorText>}
      {info && (
        <p className="text-sm text-green-700 bg-green-50 rounded-md px-3 py-2">{info}</p>
      )}
      <SubmitButton loading={loading}>Verify &amp; Sign In</SubmitButton>
      <div className="flex justify-between text-sm">
        <button type="button" onClick={resend} className="text-indigo-600 hover:underline">
          Resend code
        </button>
        <button type="button" onClick={onBack} className="text-slate-500 hover:underline">
          Back
        </button>
      </div>
    </form>
  );
}

/** Shown after a successful signup: confirmation + button back to sign in. */
function SignupSuccess({ onGoToLogin }) {
  return (
    <div className="bg-white rounded-xl shadow p-6 text-center space-y-4">
      <p className="text-green-700 bg-green-50 rounded-md px-3 py-2 font-medium">
        Sign up successful! Check your @sugarshotfilms.com inbox for a
        confirmation link, then sign in.
      </p>
      <button
        onClick={onGoToLogin}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md py-2"
      >
        Proceed to sign in
      </button>
    </div>
  );
}

/**
 * Logged-in view: shows the full-screen Sugar Shot Studio OS (served as a
 * static page from /studio.html) with a small floating Log out button.
 */
function LoggedIn({ session, role }) {
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
      {/* The Studio OS prototype fills the whole screen, opened in the role
          chosen on the sign-in page. Logout lives in its sidebar. */}
      {/* `v` is a cache-buster: bump STUDIO_V whenever studio.html changes so
          every browser fetches the new build without needing a hard refresh. */}
      <iframe
        src={`/studio.html?role=${role}&v=${STUDIO_V}`}
        title="Sugar Shot Studio OS"
        className="w-full h-full border-0"
      />
    </div>
  );
}

/* ---------- Small shared UI helpers ---------- */

function Field({ label, type, value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
      />
    </label>
  );
}

function ErrorText({ children }) {
  return (
    <p className="text-sm text-red-700 bg-red-50 rounded-md px-3 py-2">{children}</p>
  );
}

function SubmitButton({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-md py-2"
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}
