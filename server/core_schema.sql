-- Sugar Shot Studio OS — CORE SYNC: CRM cards, Projects (+updates), Leaves
-- Run in Supabase → SQL Editor. Safe to re-run.
-- After this, deals / projects / leave requests sync live across the team.

-- 1. CRM cards ---------------------------------------------------------------
create table if not exists public.cards (
  id         bigint generated always as identity primary key,
  client     text not null,
  project    text not null,
  value      numeric not null default 0,
  poc        text not null default '',
  ref        text not null default '',
  date       date not null default current_date,
  status     text not null default 'ENQUIRIES',
  arch       boolean not null default false,
  del        boolean not null default false,
  notes      text not null default '',
  created_at timestamptz not null default now()
);

-- 2. Projects (mirrors CRM WIP/CLOSED via cid; internal/manual have cid null)
create table if not exists public.projects (
  id         bigint generated always as identity primary key,
  cid        bigint references public.cards (id) on delete set null,
  client     text not null default '',
  name       text not null,
  lead       text not null default '',
  editor     text not null default '',
  team       jsonb not null default '[]',
  start_d    date,
  estart     date,
  close_d    date,
  assigned   date,
  closed     date,
  prog       int not null default 0,
  budget     numeric not null default 0,
  status     text not null default 'WIP',
  is_int     boolean not null default false,
  type       text not null default '',
  sc         jsonb,
  created_at timestamptz not null default now(),
  unique (cid)
);

-- 3. Project updates (append-only feed inside each project) ------------------
create table if not exists public.project_updates (
  id         bigint generated always as identity primary key,
  project_id bigint not null references public.projects (id) on delete cascade,
  who        text not null,
  text       text not null,
  created_at timestamptz not null default now()
);

-- 4. Leaves (incl. comp-offs and optional holidays) --------------------------
create table if not exists public.leaves (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users (id),
  author      text not null,
  type        text not null,
  from_d      date not null,
  to_d        date not null,
  days        int not null default 1,
  reason      text not null default '',
  status      text not null default 'Pending',
  approved_by text,
  created_at  timestamptz not null default now()
);

-- RLS: read for the whole signed-in team; writes open to authenticated
-- (the app enforces who may edit what; leaves inserts must be your own).
do $$
declare t text;
begin
  foreach t in array array['cards','projects','project_updates','leaves'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s view" on public.%I', t, t);
    execute format('create policy "%s view" on public.%I for select to authenticated using (true)', t, t);
    execute format('drop policy if exists "%s write" on public.%I', t, t);
    execute format('create policy "%s write" on public.%I for all to authenticated using (true) with check (true)', t, t);
    execute format('alter table public.%I replica identity full', t);
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
