alter table public.bookings
add column if not exists start_time time,
add column if not exists end_time time,
add column if not exists estimated_price numeric(10, 2),
add column if not exists final_price numeric(10, 2),
add column if not exists pricing_override_note text;

create or replace function public.get_admin_bookings_for_household(target_household_id bigint)
returns table (
  id bigint,
  household_id bigint,
  pet_id bigint,
  pet_name text,
  service_type text,
  start_date date,
  end_date date,
  start_time time,
  end_time time,
  status text,
  notes text,
  drop_off_note text,
  pick_up_note text,
  special_instructions text,
  estimated_price numeric,
  final_price numeric,
  pricing_override_note text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    b.id,
    b.household_id,
    b.pet_id,
    p.name as pet_name,
    b.service_type,
    b.start_date,
    b.end_date,
    b.start_time,
    b.end_time,
    b.status,
    b.notes,
    b.drop_off_note,
    b.pick_up_note,
    b.special_instructions,
    b.estimated_price,
    b.final_price,
    b.pricing_override_note,
    b.created_at
  from public.bookings b
  left join public.pets p on p.id = b.pet_id
  where b.household_id = target_household_id
    and exists (
      select 1
      from public.profiles profiles
      where profiles.user_id = auth.uid()
        and profiles.role = 'admin'
    )
  order by b.start_date asc, b.created_at asc;
$$;

create or replace function public.admin_update_booking_pricing(
  target_booking_id bigint,
  next_final_price numeric,
  override_note text default null
)
returns table (
  id bigint,
  household_id bigint,
  pet_id bigint,
  pet_name text,
  service_type text,
  start_date date,
  end_date date,
  start_time time,
  end_time time,
  status text,
  notes text,
  drop_off_note text,
  pick_up_note text,
  special_instructions text,
  estimated_price numeric,
  final_price numeric,
  pricing_override_note text,
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

  update public.bookings
  set
    final_price = next_final_price,
    pricing_override_note = nullif(trim(override_note), '')
  where id = target_booking_id;

  return query
  select
    b.id,
    b.household_id,
    b.pet_id,
    p.name as pet_name,
    b.service_type,
    b.start_date,
    b.end_date,
    b.start_time,
    b.end_time,
    b.status,
    b.notes,
    b.drop_off_note,
    b.pick_up_note,
    b.special_instructions,
    b.estimated_price,
    b.final_price,
    b.pricing_override_note,
    b.created_at
  from public.bookings b
  left join public.pets p on p.id = b.pet_id
  where b.id = target_booking_id;
end;
$$;
