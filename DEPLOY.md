# Deploying to the web (Vercel, all-in-one)

This deploys the **React frontend + the Express backend (as Vercel serverless
functions)** as a single Vercel project. Supabase stays as your cloud auth/DB.

- Frontend: the Vite app in `/client`
- Backend: serverless functions in `/client/api` (`hello`, `transactions`)
- The Vercel project's **Root Directory is `client`**, so the repo-root
  `index.html` (the separate Sugarshot prototype) is ignored.

---

## 0. Rotate your Supabase service_role key (do this first!)

The service_role key was shared in chat during setup, so treat it as
compromised before going public:

1. Supabase → **Project Settings → API → service_role → "Reset"**.
2. Use the NEW value wherever `SUPABASE_SERVICE_ROLE_KEY` is set (Vercel env
   vars below, and your local `server/.env`).

---

## 1. Get the code onto GitHub

The finance app currently lives (untracked) inside the `Sugarshot-Tracker`
repo. Pick one:

**Option A — new dedicated repo (recommended):** create an empty repo on
github.com (e.g. `finance-tracker`), then from the project folder:

```bash
# fresh git history just for the finance app
git init -b main
git add client server README.md DEPLOY.md .gitignore
git commit -m "Finance tracker scaffold"
git remote add finance https://github.com/<you>/finance-tracker.git
git push -u finance main
```

**Option B — reuse the Sugarshot repo:** just commit the two folders and push;
Vercel's Root Directory = `client` keeps the deploy scoped to the finance app.

> `.gitignore` already excludes `.env` and `node_modules`, so no secrets or
> deps get pushed.

---

## 2. Import into Vercel

1. Go to <https://vercel.com> → sign in with GitHub → **Add New → Project**.
2. Import the repo from step 1.
3. **Root Directory:** click **Edit** and set it to **`client`**. (Critical —
   this makes Vercel build the Vite app and pick up `client/api` functions.)
4. Framework Preset should auto-detect **Vite**. Leave build settings default.

---

## 3. Set Environment Variables (in the Vercel import screen)

Add all four (same values as your local `.env` files, but the NEW service_role
key):

| Name | Value | Used by |
|------|-------|---------|
| `VITE_SUPABASE_URL` | `https://atlvwgqpimltjzrhgkhy.supabase.co` | frontend (build) |
| `VITE_SUPABASE_ANON_KEY` | your anon public key | frontend (build) |
| `SUPABASE_URL` | `https://atlvwgqpimltjzrhgkhy.supabase.co` | serverless functions |
| `SUPABASE_SERVICE_ROLE_KEY` | your **new** service_role key | serverless functions |

Then click **Deploy**.

---

## 4. Point Supabase at the deployed URL

After deploy you get a URL like `https://your-app.vercel.app`.

1. Supabase → **Authentication → URL Configuration** → set **Site URL** to your
   Vercel URL (and add it to **Redirect URLs**). This matters once you use
   email links / password resets.

That's it — open the Vercel URL and sign up / log in.

---

## Notes
- The current UI only does auth (browser → Supabase), so the app works even
  before the serverless functions are used. The `/api/*` functions are deployed
  and ready for when the tracker UI starts calling them.
- Local dev is unchanged: `npm run dev` in `/client` and `/server`.
- To test the serverless functions locally the Vercel way, you can later use
  `vercel dev` (install the Vercel CLI). Not required for the deploy.
