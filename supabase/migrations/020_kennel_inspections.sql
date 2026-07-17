-- 020_kennel_inspections.sql
-- Admin inspection remarks for animals submitted through kennel_reports.

create table if not exists public.kennel_inspections (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  inspection_date date not null default current_date,
  kennel_report_id uuid not null references public.kennel_reports(id) on delete cascade,
  row_id text not null,
  category text not null check (category in ('dogs', 'cats', 'birds', 'reptiles', 'small_animals')),
  pet_type text not null,
  animal_name text,
  cage_number text,
  inspector_name text not null,
  inspection_shift text not null check (inspection_shift in ('Morning', 'Afternoon', 'Night')),
  feeding_ok boolean not null default true,
  cleaning_ok boolean not null default true,
  walking_ok boolean,
  status text not null default 'ok' check (status in ('ok', 'needs_attention')),
  remarks text,
  action_needed text,
  created_at timestamptz not null default now()
);

create index if not exists kennel_inspections_store_date_idx on public.kennel_inspections(store_id, inspection_date desc, created_at desc);
create index if not exists kennel_inspections_report_row_idx on public.kennel_inspections(kennel_report_id, row_id, created_at desc);
create index if not exists kennel_inspections_status_idx on public.kennel_inspections(status);

alter table public.kennel_inspections enable row level security;

drop policy if exists kennel_inspections_read_mgr on public.kennel_inspections;
create policy kennel_inspections_read_mgr on public.kennel_inspections
for select
using (app.is_manager_up());

-- Inserts are done by the public server API after password validation.
