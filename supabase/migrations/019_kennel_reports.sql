-- 019_kennel_reports.sql
-- Public boarding sheet submissions, visible to managers in Command Center and Daily Reports.

create table if not exists kennel_reports (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  report_date date not null default current_date,
  category text not null check (category in ('dogs', 'cats', 'birds', 'reptiles', 'small_animals')),
  submitted_by_profile_id uuid references profiles(id),
  submitted_by_name text not null,
  rows jsonb not null default '[]'::jsonb,
  total_animals int not null default 0,
  feeding_done int not null default 0,
  cleaning_done int not null default 0,
  walking_done int not null default 0,
  submitted_at timestamptz not null default now()
);

create index if not exists kennel_reports_store_date_idx on kennel_reports(store_id, report_date desc, submitted_at desc);
create index if not exists kennel_reports_category_idx on kennel_reports(category);

alter table kennel_reports enable row level security;

drop policy if exists kennel_reports_read_mgr on kennel_reports;
create policy kennel_reports_read_mgr on kennel_reports
for select
using (app.is_manager_up());

-- Inserts are done by the public server API using service role after validation.
