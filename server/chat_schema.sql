-- Sugar Shot Studio OS — CHAT schema (Slack-style channels/messages/reactions)
-- Run this in Supabase → SQL Editor (paste the whole file and click "Run").
-- Safe to re-run: everything is IF NOT EXISTS / drop-then-create.

-- 1. Channels ---------------------------------------------------------------
create table if not exists public.chat_channels (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  -- member display names (the Studio works with names, not ids)
  members     text[] not null default '{}',
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now()
);

-- 2. Messages ---------------------------------------------------------------
create table if not exists public.chat_messages (
  id          bigint generated always as identity primary key,
  channel_id  bigint not null references public.chat_channels (id) on delete cascade,
  user_id     uuid references auth.users (id),
  author      text not null,            -- display name shown in the UI
  text        text not null,
  tags        text[] not null default '{}',  -- @mentioned display names
  created_at  timestamptz not null default now()
);
create index if not exists chat_messages_channel_idx
  on public.chat_messages (channel_id, id);

-- 3. Reactions --------------------------------------------------------------
create table if not exists public.chat_reactions (
  id          bigint generated always as identity primary key,
  message_id  bigint not null references public.chat_messages (id) on delete cascade,
  user_id     uuid references auth.users (id),
  author      text not null,
  emoji       text not null,
  created_at  timestamptz not null default now(),
  unique (message_id, author, emoji)
);
-- So realtime DELETE events carry the full old row (needed to un-render live)
alter table public.chat_reactions replica identity full;

-- 4. Row Level Security -----------------------------------------------------
-- Internal team tool: any signed-in user can read everything and write as
-- themselves. Anonymous visitors get nothing.
alter table public.chat_channels  enable row level security;
alter table public.chat_messages  enable row level security;
alter table public.chat_reactions enable row level security;

drop policy if exists "chat read channels"  on public.chat_channels;
create policy "chat read channels"  on public.chat_channels  for select to authenticated using (true);
drop policy if exists "chat make channels"  on public.chat_channels;
create policy "chat make channels"  on public.chat_channels  for insert to authenticated with check (auth.uid() = created_by);
drop policy if exists "chat edit channels"  on public.chat_channels;
create policy "chat edit channels"  on public.chat_channels  for update to authenticated using (true) with check (true);

drop policy if exists "chat read messages"  on public.chat_messages;
create policy "chat read messages"  on public.chat_messages  for select to authenticated using (true);
drop policy if exists "chat send messages"  on public.chat_messages;
create policy "chat send messages"  on public.chat_messages  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "chat read reactions" on public.chat_reactions;
create policy "chat read reactions" on public.chat_reactions for select to authenticated using (true);
drop policy if exists "chat add reactions"  on public.chat_reactions;
create policy "chat add reactions"  on public.chat_reactions for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "chat del reactions"  on public.chat_reactions;
create policy "chat del reactions"  on public.chat_reactions for delete to authenticated using (auth.uid() = user_id);

-- 5. Realtime ---------------------------------------------------------------
-- Broadcast inserts/updates/deletes on these tables to connected clients.
do $$
begin
  begin
    alter publication supabase_realtime add table public.chat_channels;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.chat_messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.chat_reactions;
  exception when duplicate_object then null;
  end;
end $$;

-- 6. Seed the #general channel ----------------------------------------------
insert into public.chat_channels (name, members)
select 'general', array['Sandeep Sugumaran','Anirudh Venkatachalam','Prithvi Dhondaley','Sean Somanna','Aasish Suresh','Aparajitha Rajaram','Ivan Prince','Rahul KD']
where not exists (select 1 from public.chat_channels where name = 'general');
