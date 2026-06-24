create or replace function public.admin_update_pet_profile(
  target_pet_id bigint,
  next_name text,
  next_breed text default null,
  next_age text default null,
  next_vaccination_status text default null,
  next_notes text default null,
  next_photo_url text default null
)
returns table (
  id bigint,
  household_id bigint,
  name text,
  breed text,
  age text,
  vaccination_status text,
  notes text,
  photo_url text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.profiles profiles
    where profiles.user_id = auth.uid()
      and profiles.role = 'admin'
  ) then
    raise exception 'This action is only available to admin accounts.';
  end if;

  update public.pets
  set
    name = trim(next_name),
    breed = nullif(trim(coalesce(next_breed, '')), ''),
    age = nullif(trim(coalesce(next_age, '')), ''),
    vaccination_status = nullif(trim(coalesce(next_vaccination_status, '')), ''),
    notes = nullif(trim(coalesce(next_notes, '')), ''),
    photo_url = nullif(trim(coalesce(next_photo_url, '')), '')
  where public.pets.id = target_pet_id;

  return query
  select
    p.id,
    p.household_id,
    p.name,
    p.breed,
    p.age,
    p.vaccination_status,
    p.notes,
    p.photo_url,
    p.created_at
  from public.pets p
  where p.id = target_pet_id;
end;
$$;
