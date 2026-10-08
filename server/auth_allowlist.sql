-- Sugar Shot Studio OS — EXACT email allowlist (strongest signup lock)
-- APPLIED 2026-10-08 with the confirmed team list.
--
-- Account creation (incl. first Google sign-in) is only allowed for the EXACT
-- addresses below. Everything else is rejected inside the database, so it
-- cannot be bypassed by calling the auth API directly. Excluded on purpose:
-- ivan@, shivani@, finance@ and all @sugarbomb.in accounts.

-- 1. The allowlist table ----------------------------------------------------
create table if not exists public.allowed_emails (
  email      text primary key,
  added_at   timestamptz not null default now()
);
-- RLS on, no policies: only the SQL editor / service role can see or edit it.
alter table public.allowed_emails enable row level security;

-- 2. The approved team ------------------------------------------------------
insert into public.allowed_emails (email) values
  ('contact@sugarshotfilms.com'),   -- Sugar Shot (admin — Aasish's current login)
  ('aasish@sugarshotfilms.com'),    -- Aasish Suresh
  ('anirudh@sugarshotfilms.com'),   -- Anirudh Venkatachalam
  ('prithvi@sugarshotfilms.com'),   -- Prithvi Dhondaley
  ('raaghu@sugarshotfilms.com'),    -- Raaghu Raj (note the double a)
  ('sandeep@sugarshotfilms.com'),   -- Sandeep Sugumaran
  ('sean@sugarshotfilms.com')       -- Sean Somanna
on conflict (email) do nothing;

-- 3. Tighten the signup trigger to require allowlist membership -------------
create or replace function public.enforce_office_domain()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.email is null
     or lower(new.email) not like '%@sugarshotfilms.com'
     or not exists (select 1 from public.allowed_emails a
                    where lower(a.email) = lower(new.email)) then
    raise exception 'This email is not an approved Sugar Shot office account';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_office_domain on auth.users;
create trigger enforce_office_domain
  before insert on auth.users
  for each row execute function public.enforce_office_domain();

-- 4. Adding someone later ---------------------------------------------------
--   insert into public.allowed_emails (email) values ('newperson@sugarshotfilms.com');
-- 5. Removing someone -------------------------------------------------------
--   delete from public.allowed_emails where email = 'person@sugarshotfilms.com';
--   (also delete their row in Authentication → Users to end existing access)
