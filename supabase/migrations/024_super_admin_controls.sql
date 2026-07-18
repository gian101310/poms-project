-- 024_super_admin_controls.sql
-- Super-admin project controls and manager template editing.

insert into public.app_settings (store_id, key, value)
select id, 'project_enabled', 'true'::jsonb
from public.stores
on conflict (store_id, key) do nothing;

insert into public.app_settings (store_id, key, value)
select id, 'task_scheduling_enabled', 'false'::jsonb
from public.stores
on conflict (store_id, key) do nothing;

drop policy if exists templates_admin_write on public.checklist_templates;
create policy templates_manager_write on public.checklist_templates
for all
using (app.is_manager_up())
with check (app.is_manager_up());

drop policy if exists ttasks_admin_write on public.template_tasks;
create policy ttasks_manager_write on public.template_tasks
for all
using (app.is_manager_up())
with check (app.is_manager_up());
