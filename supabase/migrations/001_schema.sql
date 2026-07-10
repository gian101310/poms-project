-- ============================================================
-- POMS — Migration 001: Core Schema
-- Pet Store Operations Management System
-- Postgres 17 / Supabase. Run first.
-- All timestamps are timestamptz (UTC); rendered in store timezone.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
create type user_role        as enum ('super_admin','manager','supervisor','staff');
create type employee_status  as enum ('active','suspended','resigned');
create type task_status      as enum ('pending','started','completed','verified');
create type instance_status  as enum ('open','submitted','closed');
create type schedule_status  as enum ('scheduled','leave','off');
create type attendance_status as enum ('present','late','absent','on_leave','holiday');
create type leave_status     as enum ('pending','approved','rejected','cancelled');
create type handover_status  as enum ('draft','submitted','approved');
create type incident_status  as enum ('open','investigating','resolved','closed');
create type inspection_type  as enum ('opening','mid_shift','closing','random');
create type welfare_type     as enum ('observation','medication','isolation','mortality','vaccination','special_care','daily_monitoring');
create type animal_status    as enum ('available','reserved','sold','isolated','under_treatment','deceased');
create type memo_status      as enum ('issued','acknowledged','responded','closed');

-- ---------- CORE / ORG ----------
create table stores (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text not null unique,
  timezone    text not null default 'Asia/Dubai',
  settings    jsonb not null default '{}',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table departments (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id),
  name        text not null,
  code        text not null,
  icon        text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (store_id, code)
);

create table positions (
  id          uuid primary key default gen_random_uuid(),
  title       text not null unique,
  level       user_role not null default 'staff',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 1:1 with auth.users. Staff log in with employee_code
-- (mapped to synthetic email EMPxxxx@poms.local in Supabase Auth).
create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  store_id          uuid not null references stores(id),
  employee_code     text not null unique,          -- login ID, e.g. EMP0001
  full_name         text not null,
  photo_url         text,
  position_id       uuid references positions(id),
  role              user_role not null default 'staff',
  phone             text,
  email             text,                          -- real email, optional
  date_hired        date,
  status            employee_status not null default 'active',
  emergency_contact jsonb not null default '{}',   -- {name, relation, phone}
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Employee ↔ department (supports multi-dept + primary/backup supervisors)
create table department_assignments (
  id                    uuid primary key default gen_random_uuid(),
  profile_id            uuid not null references profiles(id),
  department_id         uuid not null references departments(id),
  is_primary_supervisor boolean not null default false,
  is_backup_supervisor  boolean not null default false,
  assigned_at           timestamptz not null default now(),
  unique (profile_id, department_id)
);

create table shifts (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id),
  name          text not null,
  start_time    time not null,
  end_time      time not null,
  grace_minutes int  not null default 10,
  is_active     boolean not null default true,
  unique (store_id, name)
);

create table employee_schedules (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id),
  shift_id    uuid references shifts(id),
  work_date   date not null,
  status      schedule_status not null default 'scheduled',
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  unique (profile_id, work_date)
);

-- ---------- TIME & ATTENDANCE ----------
create table login_sessions (               -- append-only, never overwritten
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references profiles(id),
  login_at         timestamptz not null default now(),
  logout_at        timestamptz,
  closed_by        text check (closed_by in ('user','system')),
  device           text,
  browser          text,
  ip_address       text,
  last_activity_at timestamptz not null default now()
);

create table attendance_records (           -- built nightly by cron
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references profiles(id),
  work_date         date not null,
  shift_snapshot    jsonb,                  -- {name, start, end, grace} at time of record
  clock_in          timestamptz,
  clock_out         timestamptz,
  late_minutes      int not null default 0,
  early_out_minutes int not null default 0,
  overtime_minutes  int not null default 0,
  status            attendance_status not null,
  created_at        timestamptz not null default now(),
  unique (profile_id, work_date)
);

create table leave_requests (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id),
  leave_type  text not null,                -- annual / sick / emergency / unpaid...
  date_from   date not null,
  date_to     date not null,
  reason      text,
  status      leave_status not null default 'pending',
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  check (date_to >= date_from)
);

create table holidays (
  id        uuid primary key default gen_random_uuid(),
  store_id  uuid not null references stores(id),
  date      date not null,
  name      text not null,
  unique (store_id, date)
);

-- ---------- CHECKLIST ENGINE ----------
-- Templates are versioned; editing publishes a new version, old rows immutable.
create table checklist_templates (
  id            uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id),
  shift_id      uuid not null references shifts(id),
  name          text not null,
  version       int  not null default 1,
  is_active     boolean not null default true,   -- only one active per dept+shift
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now()
);
create unique index one_active_template
  on checklist_templates (department_id, shift_id) where (is_active);

create table template_tasks (
  id                uuid primary key default gen_random_uuid(),
  template_id       uuid not null references checklist_templates(id),
  title             text not null,
  description       text,
  sort_order        int  not null default 0,
  priority          text not null default 'normal' check (priority in ('low','normal','high','critical')),
  tags              text[] not null default '{}',   -- low_stock, maintenance, animal_health, cleaning, customer_concern, equipment
  requires_photo    boolean not null default false,
  estimated_minutes int,
  recurrence        jsonb not null default '{"type":"daily"}'
  -- {"type":"daily"} | {"type":"weekdays","days":[1,4]} | {"type":"every_n_days","n":3} | {"type":"monthly","day":1}
);

-- One instance per employee+template+date, generated by daily cron.
create table checklist_instances (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references profiles(id),
  department_id    uuid not null references departments(id),
  shift_id         uuid not null references shifts(id),
  template_id      uuid not null references checklist_templates(id),
  template_version int  not null,
  work_date        date not null,
  status           instance_status not null default 'open',
  generated_at     timestamptz not null default now(),
  unique (profile_id, template_id, work_date)
);

create table checklist_tasks (
  id                 uuid primary key default gen_random_uuid(),
  instance_id        uuid not null references checklist_instances(id),
  template_task_id   uuid references template_tasks(id),
  title              text not null,             -- snapshot (template edits can't rewrite history)
  description        text,
  sort_order         int not null default 0,
  priority           text not null default 'normal',
  tags               text[] not null default '{}',
  requires_photo     boolean not null default false,
  status             task_status not null default 'pending',
  started_at         timestamptz,
  completed_at       timestamptz,
  duration_minutes   int,
  employee_remarks   text,
  supervisor_remarks text,
  verified_by        uuid references profiles(id),
  verified_at        timestamptz,
  is_overdue         boolean not null default false,
  updated_at         timestamptz not null default now()
);

create table task_events (                  -- append-only status history
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references checklist_tasks(id),
  actor_id    uuid references profiles(id),
  from_status task_status,
  to_status   task_status not null,
  note        text,
  created_at  timestamptz not null default now()
);

create table task_photos (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references checklist_tasks(id),
  storage_path text not null,
  uploaded_by  uuid not null references profiles(id),
  uploaded_at  timestamptz not null default now()
);

-- ---------- ANIMAL WELFARE ----------
create table animals (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id),
  department_id uuid not null references departments(id),
  tag_code      text not null,
  name          text,
  species       text not null,
  breed         text,
  enclosure     text,
  intake_date   date,
  status        animal_status not null default 'available',
  photo_url     text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (store_id, tag_code)
);

create table welfare_records (
  id           uuid primary key default gen_random_uuid(),
  animal_id    uuid not null references animals(id),
  record_type  welfare_type not null,
  details      jsonb not null default '{}',  -- typed per record_type (medication dose, vaccine name, temp/humidity, etc.)
  remarks      text,
  photos       text[] not null default '{}', -- storage paths
  recorded_by  uuid not null references profiles(id),
  recorded_at  timestamptz not null default now()
);

-- ---------- OPERATIONS ----------
create table shift_handovers (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references profiles(id),
  department_id       uuid not null references departments(id),
  shift_id            uuid not null references shifts(id),
  work_date           date not null,
  completed_summary   text,
  pending_summary     text,
  issues              text,
  animal_concerns     text,
  inventory_concerns  text,
  maintenance_requests text,
  customer_followups  text,
  notes               text,
  status              handover_status not null default 'draft',
  submitted_at        timestamptz,
  approved_by         uuid references profiles(id),
  approved_at         timestamptz,
  acknowledged_by     uuid references profiles(id),  -- incoming shift staff
  acknowledged_at     timestamptz,
  unique (profile_id, work_date, shift_id)
);

create table incident_reports (
  id                  uuid primary key default gen_random_uuid(),
  reporter_id         uuid not null references profiles(id),
  department_id       uuid references departments(id),
  category            text not null,   -- injury, animal_health, customer, equipment, security, other
  description         text not null,
  root_cause          text,
  corrective_action   text,
  supervisor_comments text,
  management_decision text,
  status              incident_status not null default 'open',
  occurred_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table incident_attachments (
  id           uuid primary key default gen_random_uuid(),
  incident_id  uuid not null references incident_reports(id),
  storage_path text not null,
  uploaded_by  uuid not null references profiles(id),
  uploaded_at  timestamptz not null default now()
);

create table memos (
  id                      uuid primary key default gen_random_uuid(),
  issued_by               uuid not null references profiles(id),
  issued_to               uuid not null references profiles(id),
  reason                  text not null,
  body                    text,
  attachments             text[] not null default '{}',
  employee_response       text,
  manager_decision        text,
  status                  memo_status not null default 'issued',
  acknowledgment_deadline timestamptz,
  acknowledged_at         timestamptz,
  issued_at               timestamptz not null default now()
);

create table inspections (
  id             uuid primary key default gen_random_uuid(),
  inspection_type inspection_type not null,
  department_id  uuid not null references departments(id),
  inspector_id   uuid not null references profiles(id),
  work_date      date not null default current_date,
  total_score    numeric(5,2),
  max_score      numeric(5,2),
  remarks        text,
  signature_path text,           -- storage path of digital signature
  status         text not null default 'draft' check (status in ('draft','submitted')),
  created_at     timestamptz not null default now()
);

create table inspection_items (
  id            uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references inspections(id),
  criterion     text not null,
  max_score     numeric(5,2) not null default 10,
  score         numeric(5,2),
  remark        text,
  photo_path    text,
  sort_order    int not null default 0
);

create table notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id),
  type         text not null,   -- checklist_ready, task_overdue, checklist_incomplete, inspection_scheduled, incident_submitted, memo_issued, handover_pending, ...
  title        text not null,
  body         text,
  link         text,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- ---------- SYSTEM ----------
create table audit_log (                    -- trigger-fed; append-only for everyone
  id         bigint generated always as identity primary key,
  table_name text not null,
  row_id     text,
  action     text not null,                 -- INSERT / UPDATE / DELETE
  old_data   jsonb,
  new_data   jsonb,
  actor_id   uuid,
  created_at timestamptz not null default now()
);

create table app_settings (
  id       uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id),
  key      text not null,
  value    jsonb not null,
  unique (store_id, key)
);

-- ---------- INDEXES ----------
create index idx_profiles_store          on profiles(store_id);
create index idx_dept_assign_profile     on department_assignments(profile_id);
create index idx_dept_assign_dept        on department_assignments(department_id);
create index idx_schedules_date          on employee_schedules(work_date);
create index idx_sessions_profile        on login_sessions(profile_id, login_at desc);
create index idx_attendance_profile      on attendance_records(profile_id, work_date desc);
create index idx_instances_profile_date  on checklist_instances(profile_id, work_date desc);
create index idx_instances_dept_date     on checklist_instances(department_id, work_date desc);
create index idx_tasks_instance          on checklist_tasks(instance_id);
create index idx_tasks_status            on checklist_tasks(status) where status in ('pending','started','completed');
create index idx_task_events_task        on task_events(task_id, created_at);
create index idx_welfare_animal          on welfare_records(animal_id, recorded_at desc);
create index idx_animals_dept            on animals(department_id) where status <> 'deceased';
create index idx_handovers_dept_date     on shift_handovers(department_id, work_date desc);
create index idx_incidents_status        on incident_reports(status, created_at desc);
create index idx_memos_recipient         on memos(issued_to, issued_at desc);
create index idx_inspections_dept_date   on inspections(department_id, work_date desc);
create index idx_notifications_recipient on notifications(recipient_id) where read_at is null;
create index idx_audit_table_row         on audit_log(table_name, row_id);
create index idx_audit_created           on audit_log(created_at desc);
