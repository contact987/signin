-- Sugar Shot Studio OS — lock signups to the office domain
-- Run this in Supabase → SQL Editor (paste the whole file and click "Run").
--
-- Blocks ANY account creation whose email is not @sugarshotfilms.com — at the
-- database level, so it also stops people who bypass the signup form and call
-- the auth API directly. (It applies to dashboard-invited users too, which is
-- what we want: office addresses only.)

create or replace function public.enforce_office_domain()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.email is null or lower(new.email) not like '%@sugarshotfilms.com' then
    raise exception 'Signups are restricted to @sugarshotfilms.com office accounts';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_office_domain on auth.users;
create trigger enforce_office_domain
  before insert on auth.users
  for each row execute function public.enforce_office_domain();

-- Optional cleanup: see which existing accounts are NOT office addresses
-- (delete the fake/test ones in Dashboard → Authentication → Users):
--   select id, email, created_at from auth.users
--   where lower(email) not like '%@sugarshotfilms.com';
