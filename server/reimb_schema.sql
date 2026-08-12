-- Sugar Shot Studio OS — REIMBURSEMENTS schema (persistent claims + bill files)
-- Run this in Supabase → SQL Editor (paste the whole file and click "Run").
-- Safe to re-run.

-- 1. Claims ------------------------------------------------------------------
create table if not exists public.reimbursements (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users (id),
  who         text not null,             -- display name shown in the UI
  cat         text not null check (cat in ('Travel','Food','Art','Other')),
  descr       text not null,
  amount      numeric(12,2) not null check (amount > 0),
  date        date not null default current_date,
  proj        text not null default '',
  bill        text,                      -- original file name (null = total entered directly)
  bill_path   text,                      -- storage path in the 'bills' bucket
  status      text not null default 'Pending'
              check (status in ('Pending','Approved','Rejected','Paid')),
  decided_by  text,
  created_at  timestamptz not null default now()
);
create index if not exists reimbursements_who_idx on public.reimbursements (who, id desc);
-- Realtime DELETE events need the full old row (live "withdraw" on other screens)
alter table public.reimbursements replica identity full;

-- 2. Row Level Security ------------------------------------------------------
alter table public.reimbursements enable row level security;

drop policy if exists "reimb read"   on public.reimbursements;
create policy "reimb read"   on public.reimbursements for select to authenticated using (true);
drop policy if exists "reimb submit" on public.reimbursements;
create policy "reimb submit" on public.reimbursements for insert to authenticated with check (auth.uid() = user_id);
-- Approvals: any signed-in user may update status (the app restricts the
-- buttons to Supervisors; tighten to a roles table later if needed).
drop policy if exists "reimb decide" on public.reimbursements;
create policy "reimb decide" on public.reimbursements for update to authenticated using (true) with check (true);
-- Withdraw: owners can delete their own claims.
drop policy if exists "reimb withdraw" on public.reimbursements;
create policy "reimb withdraw" on public.reimbursements for delete to authenticated using (auth.uid() = user_id);

-- 3. Realtime ----------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.reimbursements;
  exception when duplicate_object then null;
  end;
end $$;

-- 4. Private storage bucket for bill photos/PDFs -----------------------------
insert into storage.buckets (id, name, public)
values ('bills', 'bills', false)
on conflict (id) do nothing;

-- Signed-in team members can upload and view bills (bucket-scoped).
drop policy if exists "bills upload" on storage.objects;
create policy "bills upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'bills');
drop policy if exists "bills read" on storage.objects;
create policy "bills read" on storage.objects
  for select to authenticated using (bucket_id = 'bills');
