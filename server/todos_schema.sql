-- Sugar Shot Studio OS — SHARED TO-DO LIST
-- Run in Supabase → SQL Editor. Safe to re-run.
-- Everyone sees everyone's tasks; you can only add/tick/delete your own.

create table if not exists public.todos (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users (id),
  author      text not null,                  -- display name, e.g. 'Sean Somanna'
  text        text not null,
  due         date,
  status      text not null default 'open' check (status in ('open','done')),
  done_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists todos_author_idx on public.todos (author, status, due);

alter table public.todos enable row level security;

drop policy if exists "todo view" on public.todos;
create policy "todo view" on public.todos
  for select to authenticated using (true);
drop policy if exists "todo insert" on public.todos;
create policy "todo insert" on public.todos
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "todo update" on public.todos;
create policy "todo update" on public.todos
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "todo delete" on public.todos;
create policy "todo delete" on public.todos
  for delete to authenticated using (auth.uid() = user_id);

alter table public.todos replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.todos;
  exception when duplicate_object then null;
  end;
end $$;
