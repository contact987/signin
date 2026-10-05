-- Sugar Shot Studio OS — CHAT: edit / delete own messages (WhatsApp-style)
-- Safe to re-run. Requires chat_schema.sql.

alter table public.chat_messages add column if not exists edited boolean not null default false;

-- Authors can edit their own messages.
drop policy if exists "msg edit own" on public.chat_messages;
create policy "msg edit own" on public.chat_messages
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Authors can delete their own messages ("delete for everyone";
-- reactions cascade via the chat_reactions FK).
drop policy if exists "msg delete own" on public.chat_messages;
create policy "msg delete own" on public.chat_messages
  for delete to authenticated using (auth.uid() = user_id);

-- Realtime DELETE events need the full old row.
alter table public.chat_messages replica identity full;
