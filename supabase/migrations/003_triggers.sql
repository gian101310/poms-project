-- ============================================================
-- POMS — Migration 003: Triggers
-- 1. Generic audit trigger (app code cannot bypass or forget)
-- 2. Task status history → task_events (never overwrite history)
-- 3. Task status transition guard + timestamps + duration
-- 4. updated_at maintenance
-- 5. Inspection score rollup
-- ============================================================

-- ---------- 1. GENERIC AUDIT ----------
create or replace function app.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (table_name, row_id, action, old_data, new_data, actor_id)
  values (
    tg_table_name,
    coalesce(
      case when tg_op = 'DELETE' then (to_jsonb(old)->>'id') else (to_jsonb(new)->>'id') end
    ),
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
    auth.uid()
  );
  return coalesce(new, old);
end $$;

-- Attach to every audited business table
do $$
declare t text;
begin
  foreach t in array array[
    'stores','departments','positions','profiles','department_assignments',
    'shifts','employee_schedules','attendance_records','leave_requests','holidays',
    'checklist_templates','template_tasks','checklist_instances','checklist_tasks',
    'animals','welfare_records','shift_handovers','incident_reports','memos',
    'inspections','inspection_items','app_settings'
  ] loop
    execute format(
      'create trigger audit_%1$s after insert or update or delete on public.%1$I
       for each row execute function app.audit_trigger()', t);
  end loop;
end $$;

-- Make audit_log physically append-only even for table owners
create or replace function app.block_change() returns trigger
language plpgsql as $$
begin
  raise exception '% is append-only', tg_table_name;
end $$;
create trigger audit_log_immutable before update or delete on audit_log
  for each row execute function app.block_change();
create trigger task_events_immutable before update or delete on task_events
  for each row execute function app.block_change();
create trigger welfare_immutable before update or delete on welfare_records
  for each row execute function app.block_change();
create trigger login_sessions_no_delete before delete on login_sessions
  for each row execute function app.block_change();

-- ---------- 2 & 3. TASK STATUS: guard, timestamps, event log ----------
create or replace function app.task_status_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from new.status then
    -- forward-only transitions
    if not (
      (old.status = 'pending'   and new.status = 'started') or
      (old.status = 'pending'   and new.status = 'completed') or -- quick tasks
      (old.status = 'started'   and new.status = 'completed') or
      (old.status = 'completed' and new.status = 'verified') or
      (old.status = 'completed' and new.status = 'started')      -- supervisor bounce-back
    ) then
      raise exception 'Invalid task transition: % -> %', old.status, new.status;
    end if;

    if new.status = 'started' and new.started_at is null then
      new.started_at := now();
    elsif new.status = 'completed' then
      new.completed_at := now();
      new.duration_minutes := greatest(0,
        round(extract(epoch from (now() - coalesce(new.started_at, now()))) / 60)::int);
    elsif new.status = 'verified' then
      if new.verified_by is null then new.verified_by := auth.uid(); end if;
      new.verified_at := now();
      if new.verified_by = (
        select ci.profile_id from checklist_instances ci where ci.id = new.instance_id
      ) then
        raise exception 'Staff cannot verify their own tasks';
      end if;
    end if;

    insert into task_events (task_id, actor_id, from_status, to_status)
    values (new.id, auth.uid(), old.status, new.status);
  end if;

  -- history fields are write-once
  new.started_at   := coalesce(old.started_at, new.started_at);
  new.completed_at := case when new.status in ('completed','verified')
                           then coalesce(old.completed_at, new.completed_at) end;
  new.updated_at   := now();
  return new;
end $$;

create trigger task_status_change before update on checklist_tasks
  for each row execute function app.task_status_change();

create or replace function app.task_created_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into task_events (task_id, actor_id, from_status, to_status, note)
  values (new.id, null, null, 'pending', 'generated');
  return new;
end $$;
create trigger task_created after insert on checklist_tasks
  for each row execute function app.task_created_event();

-- ---------- 4. updated_at ----------
create or replace function app.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['stores','departments','profiles','animals','incident_reports'] loop
    execute format(
      'create trigger touch_%1$s before update on public.%1$I
       for each row execute function app.touch_updated_at()', t);
  end loop;
end $$;

-- ---------- 5. INSPECTION SCORE ROLLUP ----------
create or replace function app.inspection_rollup() returns trigger
language plpgsql security definer set search_path = public as $$
declare insp uuid;
begin
  insp := coalesce(new.inspection_id, old.inspection_id);
  update inspections i set
    total_score = (select sum(score)     from inspection_items where inspection_id = insp),
    max_score   = (select sum(max_score) from inspection_items where inspection_id = insp)
  where i.id = insp;
  return coalesce(new, old);
end $$;
create trigger inspection_rollup after insert or update or delete on inspection_items
  for each row execute function app.inspection_rollup();
