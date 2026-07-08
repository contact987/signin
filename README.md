# Finance Tracker — Full-Stack Auth Scaffold

A minimal, cleanly-structured starting point for a finance tracker:

- **`/client`** — React + Vite + Tailwind single-page app with Supabase auth (sign up / log in).
- **`/server`** — Node/Express API with one protected route that verifies Supabase tokens server-side.

The frontend talks to Supabase directly for auth, then calls the backend with the
session's access token. The backend verifies that token using the Supabase
**service role** key before responding. Secrets are split so the service role key
never reaches the browser.

> The existing `index.html` at the repo root is a separate prototype and is not part of this scaffold.

---

## 1. Create a Supabase project

1. Go to <https://supabase.com>, sign in, and click **New project**.
2. Give it a name and database password, pick a region, and wait for it to provision.
3. Open **Project Settings → API**. You'll need three values:

   | Value | Where it goes | Exposed to browser? |
   |-------|---------------|---------------------|
   | **Project URL** (e.g. `https://abcd.supabase.co`) | both `client/.env` and `server/.env` | yes (public) |
   | **`anon` `public` key** | `client/.env` | yes (public) |
   | **`service_role` secret key** | `server/.env` only | **no — keep secret** |

4. (Optional) Under **Authentication → Providers → Email**, you can toggle
   **"Confirm email"**. If it's **on**, new signups must click a confirmation
   link before they can log in (the app shows a message telling them so). If it's
   **off**, signup logs the user in immediately.

---

## 2. Configure environment variables

### `client/.env` (copy from `client/.env.example`)

```
VITE_SUPABASE_URL=https://abcd.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_API_URL=http://localhost:3001
```

### `server/.env` (copy from `server/.env.example`)

```
SUPABASE_URL=https://abcd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
CLIENT_ORIGIN=http://localhost:5173
PORT=3001
```

Both `.env` files are git-ignored. **Never** put the service role key in the client.

---

## 3. Run it

Open two terminals.

**Backend:**

```bash
cd server
npm install
npm run dev        # http://localhost:3001
```

**Frontend:**

```bash
cd client
npm install
npm run dev        # http://localhost:5173
```

Open <http://localhost:5173>, sign up (or log in), then click **Call Backend** —
you should see `{ "message": "Hello, verified user!", "email": "you@example.com" }`.

---

## How it fits together

```
Browser (React)  ──signUp / signInWithPassword──►  Supabase Auth
      │
      │  GET /api/hello
      │  Authorization: Bearer <access_token>
      ▼
Express (/server)  ──supabase.auth.getUser(token)──►  Supabase
      │                                                   │
      └──────────────  { email }  ◄──────────────────────┘
```

- `client/src/supabaseClient.js` — shared browser Supabase client (anon key).
- `client/src/App.jsx` — auth UI, session handling, and the protected fetch.
- `server/index.js` — `requireAuth` middleware + `GET /api/hello`.

## Extending into a finance tracker

- Add tables in Supabase (e.g. `transactions`) and turn on **Row Level Security**.
- Add new protected routes in `server/index.js` behind the same `requireAuth` middleware.
- Build out the logged-in view in `App.jsx` (or split into more components/routes).
