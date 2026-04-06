-- Run this in the Supabase SQL editor.
-- Purpose:
-- 1. detect duplicate account contact values already in the database
-- 2. enforce one email and one phone number per household/account
--
-- Important:
-- - auth.users already enforces email uniqueness for Auth users
-- - this script adds public-table protection for household contact data
-- - phone uniqueness is normalized by stripping non-digits before comparison

-- Check for duplicate household emails before adding the unique index.
select
  lower(trim(contact_email)) as normalized_email,
  count(*) as duplicate_count
from public.households
where contact_email is not null
  and btrim(contact_email) <> ''
group by lower(trim(contact_email))
having count(*) > 1;

-- Check for duplicate household phone numbers before adding the unique index.
select
  regexp_replace(contact_phone, '\D', '', 'g') as normalized_phone,
  count(*) as duplicate_count
from public.households
where contact_phone is not null
  and regexp_replace(contact_phone, '\D', '', 'g') <> ''
group by regexp_replace(contact_phone, '\D', '', 'g')
having count(*) > 1;

-- Only run the indexes below after the duplicate queries above return zero rows.
create unique index if not exists households_contact_email_unique_idx
on public.households (lower(trim(contact_email)))
where contact_email is not null
  and btrim(contact_email) <> '';

create unique index if not exists households_contact_phone_unique_idx
on public.households ((regexp_replace(contact_phone, '\D', '', 'g')))
where contact_phone is not null
  and regexp_replace(contact_phone, '\D', '', 'g') <> '';
