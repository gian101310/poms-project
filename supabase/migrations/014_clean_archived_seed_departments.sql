-- 014_clean_archived_seed_departments.sql
-- Removes pre-testing archived seed departments and dependent seed rows.

begin;

delete from template_tasks
where template_id in (
  select id from checklist_templates
  where department_id in (
    select id from departments where code in ('ARCH_BIRD_SEC', 'ARCH_CDF')
  )
);

delete from checklist_templates
where department_id in (
  select id from departments where code in ('ARCH_BIRD_SEC', 'ARCH_CDF')
);

delete from welfare_records
where animal_id in (
  select id from animals
  where department_id in (
    select id from departments where code in ('ARCH_BIRD_SEC', 'ARCH_CDF')
  )
);

delete from animals
where department_id in (
  select id from departments where code in ('ARCH_BIRD_SEC', 'ARCH_CDF')
);

delete from inspection_items
where inspection_id in (
  select id from inspections
  where department_id in (
    select id from departments where code in ('ARCH_BIRD_SEC', 'ARCH_CDF')
  )
);

delete from inspections
where department_id in (
  select id from departments where code in ('ARCH_BIRD_SEC', 'ARCH_CDF')
);

delete from departments
where code in ('ARCH_BIRD_SEC', 'ARCH_CDF');

commit;
