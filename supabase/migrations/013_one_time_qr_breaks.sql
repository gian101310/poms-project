-- 013_one_time_qr_breaks.sql (idempotent)
-- One-time QR tokens and monitored staff break sessions.

begin;

create table if not exists qr_tokens (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  token       text not null unique,
  purpose     text not null check (purpose in ('login','break')),
  expires_at  timestamptz not null,
  used_at     timestamptz,
  used_by     uuid references profiles(id),
  created_at  timestamptz not null default now()
);
create index if not exists qr_tokens_lookup_idx on qr_tokens(token, purpose, expires_at);
create index if not exists qr_tokens_active_idx on qr_tokens(store_id, purpose, expires_at)
  where used_at is null;

alter table qr_tokens enable row level security;
drop policy if exists qr_tokens_admin_read on qr_tokens;
create policy qr_tokens_admin_read on qr_tokens for select using (app.is_manager_up());
drop policy if exists qr_tokens_admin_write on qr_tokens;
create policy qr_tokens_admin_write on qr_tokens for all
  using (app.is_admin()) with check (app.is_admin());
-- Service role creates/consumes public kiosk tokens.

create table if not exists break_sessions (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references profiles(id) on delete cascade,
  store_id          uuid not null references stores(id),
  work_date         date not null,
  login_session_id  uuid references login_sessions(id),
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  duration_minutes  int,
  start_latitude    double precision,
  start_longitude   double precision,
  end_latitude      double precision,
  end_longitude     double precision,
  start_distance_m  int,
  end_distance_m    int,
  start_qr_token_id uuid references qr_tokens(id),
  end_qr_token_id   uuid references qr_tokens(id),
  flagged           boolean not null default false,
  flag_reason       text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index if not exists one_open_break_per_profile
  on break_sessions(profile_id) where ended_at is null;
create index if not exists break_sessions_date_idx on break_sessions(work_date, started_at desc);
create index if not exists break_sessions_profile_idx on break_sessions(profile_id, work_date desc);

alter table break_sessions enable row level security;
drop policy if exists breaks_read_own on break_sessions;
create policy breaks_read_own on break_sessions for select using (profile_id = auth.uid());
drop policy if exists breaks_read_mgr on break_sessions;
create policy breaks_read_mgr on break_sessions for select using (app.is_manager_up());
drop policy if exists breaks_staff_insert on break_sessions;
create policy breaks_staff_insert on break_sessions for insert with check (profile_id = auth.uid());
drop policy if exists breaks_staff_update on break_sessions;
create policy breaks_staff_update on break_sessions for update
  using (profile_id = auth.uid() and ended_at is null)
  with check (profile_id = auth.uid());
drop policy if exists breaks_admin_write on break_sessions;
create policy breaks_admin_write on break_sessions for all
  using (app.is_admin()) with check (app.is_admin());

insert into app_settings (store_id, key, value)
select id, 'break_allowed_minutes', '60'::jsonb from stores
on conflict do nothing;

insert into app_settings (store_id, key, value)
select id, 'qr_token_ttl_seconds', '45'::jsonb from stores
on conflict do nothing;

commit;
