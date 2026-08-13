-- Sugar Shot Studio OS — DAILY UPDATES (live sync + email reminders)
-- Run this in Supabase → SQL Editor (paste the whole file and click "Run").
-- Safe to re-run.
--
-- Once this exists:
--   • Daily updates sync across everyone's browsers in real time.
--   • The 8:30 PM email reminder (client/api/remind.js) can see who has
--     posted today and nudge only the people who haven't.

create table if not exists public.daily_updates (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users (id),
  author     text not null,                 -- display name, e.g. 'Sean Somanna'
  day        date not null,                 -- the day this update is for
  text       text not null,
  posted_at  timestamptz not null default now(),
  late       boolean not null default false,-- posted after 10:00 PM
  ex_status  text check (ex_status in ('pending','approved','denied')),
  ex_reason  text                           -- required when requesting exemption
);

create index if not exists daily_updates_day_idx on public.daily_updates (day);

alter table public.daily_updates enable row level security;

-- Everyone signed in can read the whole feed (leaderboard, team view).
drop policy if exists "daily view" on public.daily_updates;
create policy "daily view" on public.daily_updates
  for select to authenticated using (true);

-- You can only insert updates as yourself.
drop policy if exists "daily insert" on public.daily_updates;
create policy "daily insert" on public.daily_updates
  for insert to authenticated with check (auth.uid() = user_id);

-- Updates are append-only EXCEPT the exemption fields: the owner sets
-- ex_status='pending' + a reason, and a lead approves/denies. Both are
-- signed-in teammates, so updates are open to authenticated users.
drop policy if exists "daily update" on public.daily_updates;
create policy "daily update" on public.daily_updates
  for update to authenticated using (true) with check (true);

-- No delete policy on purpose: the feed is append-only.

alter table public.daily_updates replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.daily_updates;
  exception when duplicate_object then null;
  end;
end $$;
