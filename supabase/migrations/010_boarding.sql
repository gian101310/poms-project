-- 010_boarding.sql — Boarding / Kennel intake (idempotent)
-- A boarding "stay" (owner + dates + payment + items brought) with one or more
-- pets. Visible to and creatable by every active staff member.

begin;

create table if not exists boarding_stays (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null references stores(id),
  owner_name     text not null,
  owner_contact  text not null,
  owner_email    text,
  check_in_date  date not null,
  check_out_date date not null,
  payment_status text not null default 'unpaid' check (payment_status in ('paid','unpaid','partial')),
  amount         numeric(10,2),
  amount_paid    numeric(10,2),
  brought_cage   boolean not null default false,
  brought_food   boolean not null default false,
  brought_toys   boolean not null default false,
  brought_bags   boolean not null default false,
  brought_other  text,
  notes          text,
  status         text not null default 'active' check (status in ('active','checked_out','cancelled')),
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (check_out_date >= check_in_date)
);

create table if not exists boarding_pets (
  id           uuid primary key default gen_random_uuid(),
  stay_id      uuid not null references boarding_stays(id) on delete cascade,
  pet_type     text not null,   -- Dog, Cat, Bird, Fish, Reptile, Small Animal
  pet_breed    text,            -- breed / species / variety (from app taxonomy)
  pet_color    text,
  pet_name     text,
  description  text,            -- markings, temperament, notes
  feeding_notes text,
  meds_notes   text,
  created_at   timestamptz not null default now()
);

create index if not exists boarding_pets_stay_idx on boarding_pets(stay_id);
create index if not exists boarding_stays_status_idx on boarding_stays(status, check_out_date);

alter table boarding_stays enable row level security;
alter table boarding_pets  enable row level security;

-- Everyone active can view and record boardings.
drop policy if exists boarding_stays_read on boarding_stays;
create policy boarding_stays_read on boarding_stays for select using (app.is_active());
drop policy if exists boarding_stays_write on boarding_stays;
create policy boarding_stays_write on boarding_stays for all using (app.is_active()) with check (app.is_active());

drop policy if exists boarding_pets_read on boarding_pets;
create policy boarding_pets_read on boarding_pets for select using (app.is_active());
drop policy if exists boarding_pets_write on boarding_pets;
create policy boarding_pets_write on boarding_pets for all using (app.is_active()) with check (app.is_active());

commit;
