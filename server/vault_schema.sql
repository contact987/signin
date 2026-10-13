-- Sugar Shot Studio OS — VAULT (shared subscription credentials)
-- Run in Supabase → SQL Editor. Safe to re-run.
-- Plain text by the team's explicit choice (2026-10-13): every signed-in
-- member can read and edit; each change is stamped with who + when and kept
-- in a per-entry history.

create table if not exists public.vault (
  id          bigint generated always as identity primary key,
  service     text not null,
  url         text not null default '',
  login       text not null default '',
  password    text not null default '',
  notes       text not null default '',
  updated_by  text,
  updated_at  timestamptz,
  edits       jsonb not null default '[]',
  created_at  timestamptz not null default now()
);

alter table public.vault enable row level security;
drop policy if exists "vault view" on public.vault;
create policy "vault view" on public.vault for select to authenticated using (true);
drop policy if exists "vault write" on public.vault;
create policy "vault write" on public.vault for all to authenticated using (true) with check (true);

alter table public.vault replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.vault;
  exception when duplicate_object then null;
  end;
end $$;
