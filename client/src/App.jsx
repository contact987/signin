import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// Base URL for the backend API. In production on Vercel the serverless
// functions live at the same origin, so this is empty and calls go to
// `/api/...`. Override with VITE_API_URL for a separately-hosted backend.
const API_URL = import.meta.env.VITE_API_URL || '';

export default function App() {
  // The current Supabase session (null when logged out).
  const [session, setSession] = useState(null);
  // True right after a successful signup — shows the "Proceed to sign in"
  // screen. Lives here (not in SignupForm) so it survives the brief
  // auto-login/logout that signup triggers when email confirmation is off.
  const [justSignedUp, setJustSignedUp] = useState(false);

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
  if (session && !justSignedUp) {
    return <LoggedIn session={session} />;
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
        {justSignedUp ? (
          <SignupSuccess onGoToLogin={() => setJustSignedUp(false)} />
        ) : (
          <AuthPanel onSignedUp={() => setJustSignedUp(true)} />
        )}
      </div>
    </div>
  );
}

/** Login / Sign Up tabbed panel, shown when logged out. */
function AuthPanel({ onSignedUp }) {
  const [tab, setTab] = useState('login'); // 'login' | 'signup'

  return (
    <div className="bg-white rounded-xl shadow p-6">
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
        <SignupForm onSignedUp={onSignedUp} />
      )}
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
function SignupForm({ onSignedUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Client-side check before hitting the network.
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // If "Confirm email" is OFF, Supabase auto-creates a session on signup.
    // We want the user to sign in explicitly, so clear that fresh session...
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

/** Shown after a successful signup: confirmation + button back to sign in. */
function SignupSuccess({ onGoToLogin }) {
  return (
    <div className="bg-white rounded-xl shadow p-6 text-center space-y-4">
      <p className="text-green-700 bg-green-50 rounded-md px-3 py-2 font-medium">
        Sign up successful!
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
function LoggedIn({ session }) {
  return (
    <div className="fixed inset-0">
      {/* The Studio OS prototype fills the whole screen. */}
      <iframe
        src="/studio.html"
        title="Sugar Shot Studio OS"
        className="w-full h-full border-0"
      />

      {/* Floating logout control, top-right corner. */}
      <button
        onClick={() => supabase.auth.signOut()}
        title={`Signed in as ${session.user.email}`}
        className="fixed top-3 right-3 z-50 bg-white/90 hover:bg-white text-slate-700 text-xs font-medium rounded-md shadow px-3 py-1.5"
      >
        Log out
      </button>
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
