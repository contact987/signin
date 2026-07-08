-- Finance Tracker — database schema
-- Run this in Supabase → SQL Editor (paste the whole file and click "Run").
-- It creates a `transactions` table and locks it down with Row Level Security
-- so every user can only ever see and modify their OWN rows.

-- 1. The table -------------------------------------------------------------
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  -- 'income' or 'expense'
  type        text not null check (type in ('income', 'expense')),
  -- amount stored in the smallest currency unit's decimal; positive number
  amount      numeric(12, 2) not null check (amount >= 0),
  category    text not null default 'uncategorized',
  note        text,
  -- date the transaction happened (not the row-creation time)
  occurred_on date not null default current_date,
  created_at  timestamptz not null default now()
);

-- Helpful index for the common "my transactions, newest first" query.
create index if not exists transactions_user_occurred_idx
  on public.transactions (user_id, occurred_on desc);

-- 2. Row Level Security ----------------------------------------------------
-- With RLS on and no policies, ALL access is denied by default. We then add
-- policies that only allow rows where user_id = the logged-in user's id.
alter table public.transactions enable row level security;

-- Policies are dropped-then-created so this whole file is safe to re-run.

-- SELECT: users can read their own rows.
drop policy if exists "Users can view their own transactions" on public.transactions;
create policy "Users can view their own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

-- INSERT: users can only insert rows owned by themselves.
drop policy if exists "Users can insert their own transactions" on public.transactions;
create policy "Users can insert their own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

-- UPDATE: users can only change their own rows (and can't reassign ownership).
drop policy if exists "Users can update their own transactions" on public.transactions;
create policy "Users can update their own transactions"
  on public.transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: users can only delete their own rows.
drop policy if exists "Users can delete their own transactions" on public.transactions;
create policy "Users can delete their own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- NOTE: The Express backend uses the service_role key, which BYPASSES RLS.
-- That's fine here because the backend verifies the user's token first and
-- explicitly filters every query by that user's id. The RLS policies above
-- are still valuable: they protect you if the client ever talks to Supabase
-- directly with the anon key.
