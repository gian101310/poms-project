-- 016_grooming_bookings.sql
-- Daily grooming booking workflow and groomer performance counters.

begin;

create table if not exists grooming_bookings (
  id                  uuid primary key default gen_random_uuid(),
  store_id            uuid not null references stores(id),
  assigned_groomer_id uuid not null references profiles(id) on delete cascade,
  booking_date        date not null,
  appointment_time    time,
  client_name         text not null,
  client_phone        text not null,
  pet_name            text,
  pet_type            text not null default 'Dog',
  dog_breed           text,
  service_notes       text,
  status              text not null default 'booked'
    check (status in ('booked','confirmed','completed','cancelled')),
  confirmed_at        timestamptz,
  completed_at        timestamptz,
  finish_called_at    timestamptz,
  cannot_call_reason  text,
  payment_status      text not null default 'unpaid'
    check (payment_status in ('unpaid','paid')),
  created_by          uuid references profiles(id),
  updated_by          uuid references profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists grooming_bookings_date_idx
  on grooming_bookings(booking_date, appointment_time);
create index if not exists grooming_bookings_groomer_month_idx
  on grooming_bookings(assigned_groomer_id, booking_date desc);

alter table grooming_bookings enable row level security;
drop policy if exists grooming_bookings_read_own on grooming_bookings;
create policy grooming_bookings_read_own on grooming_bookings for select
  using (assigned_groomer_id = auth.uid());
drop policy if exists grooming_bookings_read_mgr on grooming_bookings;
create policy grooming_bookings_read_mgr on grooming_bookings for select
  using (app.is_manager_up());
drop policy if exists grooming_bookings_staff_insert_own on grooming_bookings;
create policy grooming_bookings_staff_insert_own on grooming_bookings for insert
  with check (assigned_groomer_id = auth.uid());
drop policy if exists grooming_bookings_staff_update_own on grooming_bookings;
create policy grooming_bookings_staff_update_own on grooming_bookings for update
  using (assigned_groomer_id = auth.uid())
  with check (assigned_groomer_id = auth.uid());
drop policy if exists grooming_bookings_mgr_write on grooming_bookings;
create policy grooming_bookings_mgr_write on grooming_bookings for all
  using (app.is_manager_up()) with check (app.is_manager_up());

commit;
