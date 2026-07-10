-- ============================================================
-- POMS — Migration 002: Row Level Security
-- Default-deny: RLS enabled on every table; no policy = no access.
-- Writes that need elevation (account creation, cron jobs) use the
-- service-role key from the Next.js server only.
-- ============================================================

-- ---------- HELPERS (security definer avoids RLS recursion) ----------
create schema if not exists app;

create or replace function app.my_role() returns user_role
language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

create or replace function app.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'super_admin' and status = 'active') $$;

create or replace function app.is_manager_up() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role in ('super_admin','manager') and status = 'active') $$;

create or replace function app.is_supervisor_up() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role in ('super_admin','manager','supervisor') and status = 'active') $$;

create or replace function app.is_active() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and status = 'active') $$;

-- departments the current user belongs to
create or replace function app.my_departments() returns setof uuid
language sql stable security definer set search_path = public as
$$ select department_id from department_assignments where profile_id = auth.uid() $$;

-- departments the current user supervises (primary or backup)
create or replace function app.supervised_departments() returns setof uuid
language sql stable security definer set search_path = public as
$$ select department_id from department_assignments
   where profile_id = auth.uid() and (is_primary_supervisor or is_backup_supervisor) $$;

-- ---------- ENABLE RLS EVERYWHERE ----------
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------- CORE / ORG ----------
create policy stores_read on stores for select using (app.is_active());
create policy stores_admin_write on stores for all using (app.is_admin()) with check (app.is_admin());

create policy departments_read on departments for select using (app.is_active());
create policy departments_admin_write on departments for all using (app.is_admin()) with check (app.is_admin());

create policy positions_read on positions for select using (app.is_active());
create policy positions_admin_write on positions for all using (app.is_admin()) with check (app.is_admin());

-- Profiles: staff see only themselves; supervisors see their departments' staff;
-- managers/admins see all. Only admins modify (via server, service role).
create policy profiles_self_read on profiles for select using (id = auth.uid());
create policy profiles_supervisor_read on profiles for select using (
  app.is_supervisor_up() and exists (
    select 1 from department_assignments da
    where da.profile_id = profiles.id
      and da.department_id in (select app.supervised_departments())
  )
);
create policy profiles_manager_read on profiles for select using (app.is_manager_up());
create policy profiles_admin_write on profiles for update using (app.is_admin()) with check (app.is_admin());
-- INSERT/DELETE intentionally not granted: account creation via service role only.

create policy dept_assign_read_own on department_assignments for select using (profile_id = auth.uid());
create policy dept_assign_read_sup on department_assignments for select using (app.is_supervisor_up());
create policy dept_assign_admin_write on department_assignments for all using (app.is_admin()) with check (app.is_admin());

create policy shifts_read on shifts for select using (app.is_active());
create policy shifts_admin_write on shifts for all using (app.is_admin()) with check (app.is_admin());

create policy schedules_read_own on employee_schedules for select using (profile_id = auth.uid());
create policy schedules_read_sup on employee_schedules for select using (app.is_supervisor_up());
create policy schedules_admin_write on employee_schedules for all using (app.is_manager_up()) with check (app.is_manager_up());

-- ---------- TIME & ATTENDANCE ----------
create policy sessions_insert_own on login_sessions for insert with check (profile_id = auth.uid());
create policy sessions_update_own on login_sessions for update using (profile_id = auth.uid()); -- logout / heartbeat
create policy sessions_read_own on login_sessions for select using (profile_id = auth.uid());
create policy sessions_read_mgr on login_sessions for select using (app.is_manager_up());

create policy attendance_read_own on attendance_records for select using (profile_id = auth.uid());
create policy attendance_read_sup on attendance_records for select using (app.is_supervisor_up());
-- attendance rows written by cron (service role) only.

create policy leave_own on leave_requests for select using (profile_id = auth.uid());
create policy leave_insert_own on leave_requests for insert with check (profile_id = auth.uid());
create policy leave_read_sup on leave_requests for select using (app.is_supervisor_up());
create policy leave_review on leave_requests for update using (app.is_manager_up()) with check (app.is_manager_up());

create policy holidays_read on holidays for select using (app.is_active());
create policy holidays_admin_write on holidays for all using (app.is_admin()) with check (app.is_admin());

-- ---------- CHECKLIST ENGINE ----------
create policy templates_read on checklist_templates for select using (app.is_active());
create policy templates_admin_write on checklist_templates for all using (app.is_admin()) with check (app.is_admin());
create policy ttasks_read on template_tasks for select using (app.is_active());
create policy ttasks_admin_write on template_tasks for all using (app.is_admin()) with check (app.is_admin());

create policy instances_read_own on checklist_instances for select using (profile_id = auth.uid());
create policy instances_read_sup on checklist_instances for select using (
  app.is_manager_up()
  or (app.is_supervisor_up() and department_id in (select app.supervised_departments()))
);
-- instances created by cron (service role).

create policy tasks_read_own on checklist_tasks for select using (
  exists (select 1 from checklist_instances ci where ci.id = instance_id and ci.profile_id = auth.uid())
);
create policy tasks_read_sup on checklist_tasks for select using (
  app.is_manager_up() or exists (
    select 1 from checklist_instances ci
    where ci.id = instance_id and ci.department_id in (select app.supervised_departments())
  )
);
-- Staff update their own tasks, but can never set/alter 'verified'
create policy tasks_update_own on checklist_tasks for update using (
  exists (select 1 from checklist_instances ci where ci.id = instance_id and ci.profile_id = auth.uid())
  and status <> 'verified'
) with check (status in ('pending','started','completed'));
-- Supervisors verify tasks in their departments
create policy tasks_verify_sup on checklist_tasks for update using (
  app.is_manager_up() or exists (
    select 1 from checklist_instances ci
    where ci.id = instance_id and ci.department_id in (select app.supervised_departments())
  )
);

create policy events_read on task_events for select using (
  app.is_supervisor_up() or exists (
    select 1 from checklist_tasks t join checklist_instances ci on ci.id = t.instance_id
    where t.id = task_id and ci.profile_id = auth.uid()
  )
);
-- task_events INSERTed by trigger; no direct client writes, no update/delete for anyone.

create policy photos_read on task_photos for select using (
  app.is_supervisor_up() or uploaded_by = auth.uid() or exists (
    select 1 from checklist_tasks t join checklist_instances ci on ci.id = t.instance_id
    where t.id = task_id and ci.profile_id = auth.uid()
  )
);
create policy photos_insert on task_photos for insert with check (uploaded_by = auth.uid());

-- ---------- ANIMAL WELFARE ----------
create policy animals_read on animals for select using (app.is_active());
create policy animals_write_sup on animals for insert with check (app.is_supervisor_up());
create policy animals_update_sup on animals for update using (app.is_supervisor_up());
create policy animals_write_staff on animals for insert with check (
  department_id in (select app.my_departments())
);

create policy welfare_read on welfare_records for select using (app.is_active());
create policy welfare_insert on welfare_records for insert with check (recorded_by = auth.uid());
-- welfare records are append-only: no UPDATE/DELETE policies.

-- ---------- OPERATIONS ----------
create policy handover_own on shift_handovers for select using (profile_id = auth.uid());
create policy handover_insert_own on shift_handovers for insert with check (profile_id = auth.uid());
create policy handover_update_own on shift_handovers for update using (profile_id = auth.uid() and status = 'draft');
create policy handover_read_dept on shift_handovers for select using (
  app.is_manager_up()
  or department_id in (select app.supervised_departments())
  or department_id in (select app.my_departments())   -- incoming shift can read to acknowledge
);
create policy handover_approve on shift_handovers for update using (
  app.is_manager_up() or department_id in (select app.supervised_departments())
);

create policy incidents_read_own on incident_reports for select using (reporter_id = auth.uid());
create policy incidents_insert on incident_reports for insert with check (reporter_id = auth.uid());
create policy incidents_read_sup on incident_reports for select using (
  app.is_manager_up() or department_id in (select app.supervised_departments())
);
create policy incidents_update_sup on incident_reports for update using (app.is_supervisor_up());

create policy inc_att_read on incident_attachments for select using (
  app.is_supervisor_up() or uploaded_by = auth.uid() or exists (
    select 1 from incident_reports ir where ir.id = incident_id and ir.reporter_id = auth.uid()
  )
);
create policy inc_att_insert on incident_attachments for insert with check (uploaded_by = auth.uid());

create policy memos_read_own on memos for select using (issued_to = auth.uid() or issued_by = auth.uid());
create policy memos_read_mgr on memos for select using (app.is_manager_up());
create policy memos_issue on memos for insert with check (app.is_manager_up() and issued_by = auth.uid());
create policy memos_respond on memos for update using (issued_to = auth.uid() or app.is_manager_up());

create policy inspections_read on inspections for select using (app.is_supervisor_up());
create policy inspections_write on inspections for insert with check (app.is_supervisor_up() and inspector_id = auth.uid());
create policy inspections_update on inspections for update using (inspector_id = auth.uid() and status = 'draft');
create policy insp_items_read on inspection_items for select using (app.is_supervisor_up());
create policy insp_items_write on inspection_items for all using (
  exists (select 1 from inspections i where i.id = inspection_id and i.inspector_id = auth.uid() and i.status = 'draft')
);

create policy notif_read_own on notifications for select using (recipient_id = auth.uid());
create policy notif_mark_read on notifications for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
-- notifications created server-side.

-- ---------- SYSTEM ----------
create policy audit_read_mgr on audit_log for select using (app.is_manager_up());
-- audit_log: no insert/update/delete policies for any client role — trigger-fed only.

create policy settings_read on app_settings for select using (app.is_active());
create policy settings_admin_write on app_settings for all using (app.is_admin()) with check (app.is_admin());

-- ---------- STORAGE BUCKETS ----------
-- Create buckets (id = name), all private.
insert into storage.buckets (id, name, public) values
  ('task-photos','task-photos', false),
  ('welfare-photos','welfare-photos', false),
  ('incident-files','incident-files', false),
  ('memo-files','memo-files', false),
  ('signatures','signatures', false),
  ('profile-photos','profile-photos', false)
on conflict (id) do nothing;

create policy storage_read on storage.objects for select
  using (app.is_active() and bucket_id in ('task-photos','welfare-photos','incident-files','memo-files','signatures','profile-photos'));
create policy storage_insert on storage.objects for insert
  with check (app.is_active() and owner = auth.uid());
