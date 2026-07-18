-- 025_owner_admin_access_controls.sql
-- Owner/admin operational access, with project-level controls reserved for BossG.

begin;

create or replace function app.is_project_owner() returns boolean
language sql stable as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
      and upper(employee_code) = 'BOSSG'
      and status = 'active'
  )
$$;

drop policy if exists stores_admin_write on public.stores;
drop policy if exists stores_manager_write on public.stores;
create policy stores_manager_write on public.stores for all
using (app.is_manager_up())
with check (app.is_manager_up());

drop policy if exists departments_admin_write on public.departments;
drop policy if exists departments_manager_write on public.departments;
create policy departments_manager_write on public.departments for all
using (app.is_manager_up())
with check (app.is_manager_up());

drop policy if exists sections_admin_write on public.sections;
drop policy if exists sections_manager_write on public.sections;
create policy sections_manager_write on public.sections for all
using (app.is_manager_up())
with check (app.is_manager_up());

drop policy if exists staff_sections_admin_write on public.staff_section_assignments;
drop policy if exists staff_sections_manager_write on public.staff_section_assignments;
create policy staff_sections_manager_write on public.staff_section_assignments for all
using (app.is_manager_up())
with check (app.is_manager_up());

drop policy if exists shifts_admin_write on public.shifts;
drop policy if exists shifts_manager_write on public.shifts;
create policy shifts_manager_write on public.shifts for all
using (app.is_manager_up())
with check (app.is_manager_up());

drop policy if exists settings_admin_write on public.app_settings;
drop policy if exists settings_manager_write on public.app_settings;
create policy settings_manager_write on public.app_settings for all
using (
  app.is_manager_up()
  and (
    key not in ('project_enabled', 'task_scheduling_enabled')
    or app.is_project_owner()
  )
)
with check (
  app.is_manager_up()
  and (
    key not in ('project_enabled', 'task_scheduling_enabled')
    or app.is_project_owner()
  )
);

update public.profiles
set role = 'manager',
    status = 'active'
where upper(employee_code) in ('OWN001', 'OWN002', 'GIAN001');

update public.profiles
set role = 'manager',
    status = 'active'
where upper(employee_code) = 'ADMIN001';

update public.profiles
set role = 'super_admin',
    status = 'active'
where upper(employee_code) = 'BOSSG';

commit;
