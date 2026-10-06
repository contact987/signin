-- Sugar Shot Studio OS — TO-DO v3: anyone can edit any task, with edit history
-- Run in Supabase → SQL Editor. Safe to re-run. Requires todos_schema.sql.

-- Edit history lives on the row: [{by, at, what}, ...]
alter table public.todos add column if not exists edits jsonb not null default '[]';

-- Anyone signed in may update any task (tick done, fix text, move project…).
-- Every change by a non-owner is recorded in `edits` by the app.
drop policy if exists "todo update" on public.todos;
create policy "todo update" on public.todos
  for update to authenticated using (true) with check (true);

-- Deleting stays owner-only (history can't be erased by others).
