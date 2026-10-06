-- Sugar Shot Studio OS — TO-DO v2: project link + priority
-- Run in Supabase → SQL Editor. Safe to re-run. Requires todos_schema.sql.

alter table public.todos add column if not exists proj text not null default '';
alter table public.todos add column if not exists priority text not null default 'normal'
  check (priority in ('low','normal','high'));
