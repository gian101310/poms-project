-- ============================================================
-- POMS — Migration 005: Shift hours, worked-time tracking,
-- clock-in security, daily orchestrator reports.
-- Run AFTER 001–004, in the Supabase SQL editor.
-- ============================================================

-- 1. Per-shift standard paid minutes. Anything worked beyond this counts
--    as overtime. NULL = shift length (no built-in overtime).
alter table shifts add column if not exists standard_minutes int;

-- 2. Attendance: worked time + clock-in security fields
alter table attendance_records add column if not exists worked_minutes int not null default 0;
alter table attendance_records add column if not exists clock_in_ip text;
alter table attendance_records add column if not exists clock_out_ip text;
alter table attendance_records add column if not exists flagged boolean not null default false;

-- 3. Update seeded shifts to the real store shifts:
--    Morning   08:00–18:00 (10h on site, 9h standard → 1h built-in overtime)
--    Afternoon 13:00–22:00 (9h on site, 9h standard → no overtime)
update shifts set name = 'Morning',   start_time = '08:00', end_time = '18:00', standard_minutes = 540 where name = 'Opening';
update shifts set name = 'Afternoon', start_time = '13:00', end_time = '22:00', standard_minutes = 540 where name = 'Mid Shift';
update shifts set is_active = false where name = 'Closing';

-- 4. Daily orchestrator reports
create table if not exists daily_reports (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid references stores(id),
  report_date date not null unique,
  content     jsonb not null,
  created_at  timestamptz not null default now()
);
alter table daily_reports enable row level security;
create policy reports_read_mgr on daily_reports for select using (app.is_manager_up());
-- written by the orchestrator (service role) only

-- 5. Clock-in security settings (edit in Admin → Settings)
--    clock_ip_mode: "off" (no check) | "flag" (allow but mark ⚠ for review) | "block"
--    allowed_clock_ips: comma-separated IPs or prefixes, e.g. "94.204.10.7,94.204."
insert into app_settings (store_id, key, value)
select id, 'clock_ip_mode', '"off"'::jsonb from stores where code = 'MAIN'
on conflict (store_id, key) do nothing;
insert into app_settings (store_id, key, value)
select id, 'allowed_clock_ips', '""'::jsonb from stores where code = 'MAIN'
on conflict (store_id, key) do nothing;
