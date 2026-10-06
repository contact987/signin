-- Sugar Shot Studio OS — DAILY UPDATE: missed-day approval requests
-- Run in Supabase → SQL Editor. Safe to re-run.
-- "I couldn't post (on time) on <day> because <reason>" → lead approves/denies.
-- An approved day shows as Excused (not Missed) on the attendance calendar.

create table if not exists public.daily_exemptions (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users (id),
  author      text not null,
  day         date not null,
  reason      text not null,
  status      text not null default 'pending' check (status in ('pending','approved','denied')),
  decided_by  text,
  created_at  timestamptz not null default now(),
  unique (author, day)
);

alter table public.daily_exemptions enable row level security;

drop policy if exists "dex view" on public.daily_exemptions;
create policy "dex view" on public.daily_exemptions
  for select to authenticated using (true);
drop policy if exists "dex insert" on public.daily_exemptions;
create policy "dex insert" on public.daily_exemptions
  for insert to authenticated with check (auth.uid() = user_id);
-- Decisions: any signed-in user may update (the app shows the buttons to
-- leads/supervisors, and the requester can't decide their own in the UI).
drop policy if exists "dex decide" on public.daily_exemptions;
create policy "dex decide" on public.daily_exemptions
  for update to authenticated using (true) with check (true);
drop policy if exists "dex withdraw" on public.daily_exemptions;
create policy "dex withdraw" on public.daily_exemptions
  for delete to authenticated using (auth.uid() = user_id);

alter table public.daily_exemptions replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.daily_exemptions;
  exception when duplicate_object then null;
  end;
end $$;
