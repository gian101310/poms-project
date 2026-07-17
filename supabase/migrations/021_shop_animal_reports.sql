-- 021_shop_animal_reports.sql
-- Daily public reports and admin inspections for shop animals on sale/display.

create table if not exists public.shop_animal_reports (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  report_date date not null default current_date,
  submitted_by_profile_id uuid references public.profiles(id),
  submitted_by_name text not null,
  rows jsonb not null default '[]'::jsonb,
  total_animals int not null default 0,
  feeding_done int not null default 0,
  cleaning_done int not null default 0,
  submitted_at timestamptz not null default now()
);

create index if not exists shop_animal_reports_store_date_idx on public.shop_animal_reports(store_id, report_date desc, submitted_at desc);

alter table public.shop_animal_reports enable row level security;

drop policy if exists shop_animal_reports_read_mgr on public.shop_animal_reports;
create policy shop_animal_reports_read_mgr on public.shop_animal_reports
for select
using (app.is_manager_up());

create table if not exists public.shop_animal_inspections (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  inspection_date date not null default current_date,
  shop_animal_report_id uuid not null references public.shop_animal_reports(id) on delete cascade,
  row_id text not null,
  pet_type text not null,
  breed text,
  animal_name text,
  display_area text,
  cage_number text,
  inspector_name text not null,
  inspection_shift text not null check (inspection_shift in ('Morning', 'Afternoon', 'Night')),
  feeding_ok boolean not null default true,
  cleaning_ok boolean not null default true,
  status text not null default 'ok' check (status in ('ok', 'needs_attention')),
  remarks text,
  action_needed text,
  created_at timestamptz not null default now()
);

create index if not exists shop_animal_inspections_store_date_idx on public.shop_animal_inspections(store_id, inspection_date desc, created_at desc);
create index if not exists shop_animal_inspections_report_row_idx on public.shop_animal_inspections(shop_animal_report_id, row_id, created_at desc);
create index if not exists shop_animal_inspections_status_idx on public.shop_animal_inspections(status);

alter table public.shop_animal_inspections enable row level security;

drop policy if exists shop_animal_inspections_read_mgr on public.shop_animal_inspections;
create policy shop_animal_inspections_read_mgr on public.shop_animal_inspections
for select
using (app.is_manager_up());

-- Inserts are done by the public server APIs after staff/password validation.
