-- Sugar Shot Studio OS — Client POC on deals & projects
-- Run in Supabase → SQL Editor. Safe to re-run.
alter table public.cards    add column if not exists cpoc text not null default '';
alter table public.projects add column if not exists cpoc text not null default '';
