-- ============================================================
-- POMS — Migration 007: Follow-up tasks + QR login gate
-- Run AFTER 006 in the Supabase SQL editor.
-- ============================================================

-- Follow-up tasks: management notes that become tasks on the NEXT checklist.
-- profile_id NULL = applies to every scheduled employee in the department.
create table if not exists followup_tasks (
  id            uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id),
  profile_id    uuid references profiles(id),
  title         text not null,
  note          text,
  priority      text not null default 'high' check (priority in ('low','normal','high','critical')),
  target_date   date not null,
  created_by    uuid not null references profiles(id),
  consumed_at   timestamptz,
  created_at    timestamptz not null default now()
);
alter table followup_tasks enable row level security;
create policy followups_read on followup_tasks for select using (app.is_supervisor_up());
create policy followups_write on followup_tasks for all using (app.is_manager_up()) with check (app.is_manager_up());
create index idx_followups_target on followup_tasks(target_date) where consumed_at is null;

create trigger audit_followup_tasks after insert or update or delete on followup_tasks
  for each row execute function app.audit_trigger();

-- QR login gate settings:
--   qr_login_mode: "off" | "flag" | "block" — staff must scan the daily shop QR to log in
--   qr_secret: used to derive the rotating daily code (regenerate to invalidate all QRs)
insert into app_settings (store_id, key, value)
select id, 'qr_login_mode', '"off"'::jsonb from stores where code = 'MAIN'
on conflict (store_id, key) do nothing;
insert into app_settings (store_id, key, value)
select id, 'qr_secret', to_jsonb(md5(gen_random_uuid()::text)) from stores where code = 'MAIN'
on conflict (store_id, key) do nothing;
