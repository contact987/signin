-- Sugar Shot Studio OS — EXACT email allowlist (strongest signup lock)
-- Run this in Supabase → SQL Editor AFTER editing the address list below.
--
-- Upgrades the office-domain lock: instead of accepting ANY
-- @sugarshotfilms.com address (even invented ones like test@...), account
-- creation is only allowed for the EXACT addresses listed in
-- public.allowed_emails. Everything else is rejected inside the database,
-- so it cannot be bypassed by calling the auth API directly.

-- 1. The allowlist table ----------------------------------------------------
create table if not exists public.allowed_emails (
  email      text primary key,
  added_at   timestamptz not null default now()
);
-- RLS on, no policies: only the SQL editor / service role can see or edit it.
alter table public.allowed_emails enable row level security;

-- 2. Fill in the team's REAL office addresses -------------------------------
-- EDIT THIS LIST before running: uncomment and correct each line.
-- Until an address is in this table, that person cannot sign up.
insert into public.allowed_emails (email) values
  ('contact@sugarshotfilms.com')
  -- ,('sandeep@sugarshotfilms.com')      -- Sandeep Sugumaran
  -- ,('anirudh@sugarshotfilms.com')      -- Anirudh Venkatachalam
  -- ,('prithvi@sugarshotfilms.com')      -- Prithvi Dhondaley
  -- ,('sean@sugarshotfilms.com')         -- Sean Somanna
  -- ,('aasish@sugarshotfilms.com')       -- Aasish Suresh
  -- ,('aparajitha@sugarshotfilms.com')   -- Aparajitha Rajaram
  -- ,('ivan@sugarshotfilms.com')         -- Ivan Prince
  -- ,('rahul@sugarshotfilms.com')        -- Rahul KD
on conflict (email) do nothing;

-- 3. Tighten the signup trigger to require allowlist membership -------------
-- (Same function name as auth_domain_lock.sql, so this REPLACES that check —
-- domain rule stays, exact-address rule is added on top.)
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

-- 4. Clean up accounts that should not exist --------------------------------
-- First LOOK at what's there:
--   select id, email, created_at from auth.users order by created_at;
-- Then delete the fake/test ones (uncomment, edit the address, run):
--   delete from auth.users where lower(email) = 'test@sugarshotfilms.com';
-- (Deleting in Dashboard → Authentication → Users works the same way.)

-- 5. Adding someone later ---------------------------------------------------
--   insert into public.allowed_emails (email) values ('newperson@sugarshotfilms.com');
