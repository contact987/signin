-- Sugar Shot Studio OS — QA round 2: synced kanban columns + edit stamps
-- Run in Supabase → SQL Editor. Safe to re-run.

-- Custom CRM pipeline columns, shared by the whole team.
create table if not exists public.crm_columns (
  name text primary key,
  bg   text not null default '#F2F2F0',
  bd   text not null default '#C4C4C4',
  tx   text not null default '#4A4A48',
  em   text not null default '',
  pos  int  not null default 0
);
alter table public.crm_columns enable row level security;
drop policy if exists "cols view" on public.crm_columns;
create policy "cols view" on public.crm_columns for select to authenticated using (true);
drop policy if exists "cols write" on public.crm_columns;
create policy "cols write" on public.crm_columns for all to authenticated using (true) with check (true);
alter table public.crm_columns replica identity full;
do $$
begin
  begin
    alter publication supabase_realtime add table public.crm_columns;
  exception when duplicate_object then null;
  end;
end $$;

-- Who-changed-what stamps on deals and projects.
alter table public.cards    add column if not exists updated_by text;
alter table public.cards    add column if not exists updated_at timestamptz;
alter table public.cards    add column if not exists edits jsonb not null default '[]';
alter table public.projects add column if not exists updated_by text;
alter table public.projects add column if not exists updated_at timestamptz;
alter table public.projects add column if not exists edits jsonb not null default '[]';
