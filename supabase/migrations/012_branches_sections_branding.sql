-- 012_branches_sections_branding.sql (idempotent)
-- Branch/store support, staff section assignment, and configurable portal name.

begin;

-- Friendly name for the tenant/company using the portal.
insert into app_settings (store_id, key, value)
select id, 'portal_name', '"POMS"'::jsonb from stores where code = 'MAIN'
on conflict do nothing;

-- Staff can be assigned to one or more specific sections inside their department.
create table if not exists staff_section_assignments (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  section_id  uuid not null references sections(id) on delete cascade,
  is_primary  boolean not null default false,
  assigned_at timestamptz not null default now(),
  unique (profile_id, section_id)
);
create index if not exists staff_section_assignments_profile_idx on staff_section_assignments(profile_id);
create index if not exists staff_section_assignments_section_idx on staff_section_assignments(section_id);

alter table staff_section_assignments enable row level security;

drop policy if exists staff_sections_read on staff_section_assignments;
create policy staff_sections_read on staff_section_assignments for select using (
  app.is_manager_up()
  or profile_id = auth.uid()
  or exists (
    select 1
    from sections s
    join department_assignments da on da.department_id = s.department_id
    where s.id = section_id
      and da.profile_id = auth.uid()
      and (da.is_primary_supervisor or da.is_backup_supervisor)
  )
);

drop policy if exists staff_sections_admin_write on staff_section_assignments;
create policy staff_sections_admin_write on staff_section_assignments for all
  using (app.is_admin()) with check (app.is_admin());

-- Make the seeded first branch explicit.
update stores set name = 'Springs Souk', code = 'SPRINGS' where code = 'MAIN';

commit;
