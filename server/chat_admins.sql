-- Sugar Shot Studio OS — CHAT: channel admins (WhatsApp-style)
-- Run in Supabase → SQL Editor. Safe to re-run. Requires chat_schema.sql.

-- Admin display names; the channel creator is added by the app on creation.
alter table public.chat_channels add column if not exists admins jsonb not null default '[]';

-- Deleting a channel (admins only in the UI; messages/reactions cascade).
drop policy if exists "chat delete channels" on public.chat_channels;
create policy "chat delete channels" on public.chat_channels
  for delete to authenticated using (true);

-- Realtime DELETE events need the full old row.
alter table public.chat_channels replica identity full;

-- Make the seeded #general managed by supervisors: set its admins once.
update public.chat_channels set admins = '["Anirudh Venkatachalam","Prithvi Dhondaley","Sandeep Sugumaran"]'::jsonb
 where name = 'general' and admins = '[]'::jsonb;
