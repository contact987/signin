-- Sugar Shot Studio OS — CHAT READ RECEIPTS ("Seen by ...")
-- Run this in Supabase → SQL Editor (paste the whole file and click "Run").
-- Safe to re-run. Requires chat_schema.sql to have been run first.

-- One row per (channel, person): the id of the last message they've seen.
create table if not exists public.chat_reads (
  channel_id  bigint not null references public.chat_channels (id) on delete cascade,
  user_id     uuid references auth.users (id),
  author      text not null,          -- display name shown in "Seen by"
  last_read   bigint not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (channel_id, author)
);

alter table public.chat_reads enable row level security;

drop policy if exists "reads view"   on public.chat_reads;
create policy "reads view"   on public.chat_reads for select to authenticated using (true);
drop policy if exists "reads insert" on public.chat_reads;
create policy "reads insert" on public.chat_reads for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "reads update" on public.chat_reads;
create policy "reads update" on public.chat_reads for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

do $$
begin
  begin
    alter publication supabase_realtime add table public.chat_reads;
  exception when duplicate_object then null;
  end;
end $$;
