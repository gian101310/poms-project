-- 009_sections.sql — department -> section hierarchy (idempotent)
-- Adds a sections table under the 7 parent departments, normalizes parent names,
-- retires granular flat departments (now represented as sections), and seeds
-- a Pet World-based baseline. Safe to re-run.

begin;

create table if not exists sections (
  id            uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id) on delete cascade,
  name          text not null,
  code          text,
  sort_order    int  not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (department_id, name)
);
create index if not exists sections_department_idx on sections(department_id);

alter table sections enable row level security;
drop policy if exists sections_read on sections;
create policy sections_read on sections for select using (app.is_active());
drop policy if exists sections_admin_write on sections;
create policy sections_admin_write on sections for all using (app.is_admin()) with check (app.is_admin());

-- Normalize the 7 parent departments
update departments set name = 'Pharmacy'               where code = 'PHARMA';
update departments set name = 'Kennel', code = 'KENNEL' where code = 'BOARD';
-- Dogs, Cats, Small Animals, Birds, Grooming already correctly named.

-- Retire granular flat departments now represented as sections (kept, not deleted)
update departments set is_active = false where code in (
  'BIRD SEC','CDF','CAT - LITTER -TRAYS','CAT-T','CT-SC','CWF','C&L','TRAVEL',
  'DG&G BOWLS','D&C BEDS','DRF','DT','DTREATS','DWF','FISH','GH SECTION',
  'REPTILES','TRAIN'
);
-- Operational departments (CASHIER, SALES, WAREHOUSE, ONLINE STORE) left active & untouched.

-- Seed sections
insert into sections (department_id, name, sort_order)
select d.id, v.name, v.ord
from (values
  ('DOGS', 'Dry Food', 10),
  ('DOGS', 'Wet Food', 20),
  ('DOGS', 'Treats & Snacks', 30),
  ('DOGS', 'Supplements', 40),
  ('DOGS', 'Toys', 50),
  ('DOGS', 'Collars / Leads / Harnesses', 60),
  ('DOGS', 'Beds, Cushions & Blankets', 70),
  ('DOGS', 'Carriers & Crates', 80),
  ('DOGS', 'Bowls & Feeders', 90),
  ('DOGS', 'Grooming & Cosmetics', 100),
  ('DOGS', 'Health & Wellness', 110),
  ('DOGS', 'Flea, Tick & Health Care', 120),
  ('DOGS', 'Clothing', 130),
  ('CATS', 'Dry Food', 10),
  ('CATS', 'Wet Food', 20),
  ('CATS', 'Treats & Snacks', 30),
  ('CATS', 'Supplements', 40),
  ('CATS', 'Toys & Catnip', 50),
  ('CATS', 'Litter & Accessories', 60),
  ('CATS', 'Beds & Cushions', 70),
  ('CATS', 'Collars, Leashes & Harnesses', 80),
  ('CATS', 'Bowls, Feeders & Fountains', 90),
  ('CATS', 'Trees & Scratchers', 100),
  ('CATS', 'Carriers & Crates', 110),
  ('CATS', 'Grooming & Cosmetics', 120),
  ('CATS', 'Health Care', 130),
  ('CATS', 'Clothing', 140),
  ('SMALL', 'Food & Treats', 10),
  ('SMALL', 'Bedding & Litter', 20),
  ('SMALL', 'Bowls, Housing & Accessories', 30),
  ('SMALL', 'Habitats & Cages', 40),
  ('SMALL', 'Carriers & Travel', 50),
  ('SMALL', 'Toys', 60),
  ('SMALL', 'Health Care & Hygiene', 70),
  ('SMALL', 'Fish / Aquatics', 80),
  ('SMALL', 'Reptiles', 90),
  ('BIRDS', 'Food & Treats', 10),
  ('BIRDS', 'Toys & Perches', 20),
  ('BIRDS', 'Bowls & Feeders', 30),
  ('BIRDS', 'Nesting & Breeding', 40),
  ('BIRDS', 'Cages, Houses & Stands', 50),
  ('BIRDS', 'Carriers & Travel', 60),
  ('BIRDS', 'Cage Accessories', 70),
  ('BIRDS', 'Health Care & Hygiene', 80),
  ('PHARMA', 'Flea & Tick', 10),
  ('PHARMA', 'Dewormers', 20),
  ('PHARMA', 'Supplements & Multivitamins', 30),
  ('PHARMA', 'Skin & Coat Care', 40),
  ('PHARMA', 'Ear & Eye Care', 50),
  ('PHARMA', 'Dental Care', 60),
  ('PHARMA', 'Digestive & Gut Care', 70),
  ('PHARMA', 'First Aid & Recovery', 80),
  ('PHARMA', 'Stress & Anxiety', 90),
  ('PHARMA', 'Prescription Diets', 100),
  ('KENNEL', 'Boarding / Pet Hotel', 10),
  ('KENNEL', 'Feeding Station', 20),
  ('KENNEL', 'Cleaning & Sanitation', 30),
  ('KENNEL', 'Animal Welfare & Husbandry', 40),
  ('KENNEL', 'Intake & Records', 50),
  ('GROOM', 'Grooming Station', 10),
  ('GROOM', 'Shampoos & Perfumes', 20),
  ('GROOM', 'Treatment Shampoos', 30),
  ('GROOM', 'Tools & Accessories', 40),
  ('GROOM', 'Clippers & Blades', 50),
  ('GROOM', 'Towels & Dryers', 60),
  ('GROOM', 'Booking & Records', 70)
) as v(dept_code, name, ord)
join departments d on d.code = v.dept_code
on conflict (department_id, name) do nothing;

commit;
