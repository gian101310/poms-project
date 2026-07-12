-- 015_staff_delivery_runs.sql
-- Tracks staff temporarily sent out for delivery from Command Center.

begin;

create table if not exists staff_delivery_runs (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  store_id    uuid not null references stores(id),
  work_date   date not null,
  started_by  uuid references profiles(id),
  ended_by    uuid references profiles(id),
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  note        text,
  created_at  timestamptz not null default now()
);

create unique index if not exists one_open_delivery_per_profile
  on staff_delivery_runs(profile_id) where ended_at is null;
create index if not exists staff_delivery_runs_date_idx
  on staff_delivery_runs(work_date, started_at desc);
create index if not exists staff_delivery_runs_profile_idx
  on staff_delivery_runs(profile_id, work_date desc);

alter table staff_delivery_runs enable row level security;
drop policy if exists delivery_runs_manager_read on staff_delivery_runs;
create policy delivery_runs_manager_read on staff_delivery_runs for select using (app.is_manager_up());
drop policy if exists delivery_runs_manager_write on staff_delivery_runs;
create policy delivery_runs_manager_write on staff_delivery_runs for all
  using (app.is_manager_up()) with check (app.is_manager_up());

commit;
