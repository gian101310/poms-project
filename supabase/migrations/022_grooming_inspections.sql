-- 022_grooming_inspections.sql
-- Admin inspection notes for daily grooming bookings.

create table if not exists public.grooming_inspections (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  inspection_date date not null default current_date,
  grooming_booking_id uuid not null references public.grooming_bookings(id) on delete cascade,
  inspector_name text not null,
  inspection_shift text not null check (inspection_shift in ('Morning', 'Afternoon', 'Night')),
  booking_ok boolean not null default true,
  client_updated_ok boolean not null default true,
  status text not null default 'ok' check (status in ('ok', 'needs_attention')),
  remarks text,
  action_needed text,
  created_at timestamptz not null default now()
);

create index if not exists grooming_inspections_store_date_idx on public.grooming_inspections(store_id, inspection_date desc, created_at desc);
create index if not exists grooming_inspections_booking_idx on public.grooming_inspections(grooming_booking_id, created_at desc);
create index if not exists grooming_inspections_status_idx on public.grooming_inspections(status);

alter table public.grooming_inspections enable row level security;

drop policy if exists grooming_inspections_read_mgr on public.grooming_inspections;
create policy grooming_inspections_read_mgr on public.grooming_inspections
for select
using (app.is_manager_up());

-- Inserts are done by the public server API after password validation.
