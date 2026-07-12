-- 011_cashier_and_blocked.sql (idempotent)
-- 1) "Can't complete" state on checklist tasks (reason required, set by staff).
-- 2) Cashier cash report — opening/shift-change/closing money log for a day.

begin;

-- ---- 1) Can't-complete ----
alter table checklist_tasks add column if not exists blocked boolean not null default false;
alter table checklist_tasks add column if not exists blocked_reason text;

-- ---- 2) Cashier cash report ----
create table if not exists cash_reports (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id),
  report_date   date not null,
  phase         text not null check (phase in ('opening','shift_change','closing')),
  opening_float numeric(10,2),
  closing_float numeric(10,2),
  cash_sales    numeric(10,2),   -- money drop / total cash sales
  card_sales    numeric(10,2),
  tips          numeric(10,2),
  expenses      numeric(10,2),
  expense_notes text,
  notes         text,
  submitted_by  uuid references profiles(id),
  created_at    timestamptz not null default now()
);
create index if not exists cash_reports_date_idx on cash_reports(report_date desc);

alter table cash_reports enable row level security;

-- Any active staff (cashier) can log a report.
drop policy if exists cash_reports_insert on cash_reports;
create policy cash_reports_insert on cash_reports for insert with check (app.is_active());

-- Managers/owners/admins see everything; the person who filed it can see their own.
drop policy if exists cash_reports_read on cash_reports;
create policy cash_reports_read on cash_reports for select
  using (app.is_manager_up() or submitted_by = auth.uid());

-- Only admins edit/delete after the fact.
drop policy if exists cash_reports_admin_write on cash_reports;
create policy cash_reports_admin_write on cash_reports for all
  using (app.is_admin()) with check (app.is_admin());

commit;
