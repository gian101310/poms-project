-- 023_public_boarding_animals.sql
-- Live public boarding sheet records plus append-only history.

create table if not exists public.public_boarding_animals (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  category text not null check (category in ('dogs', 'cats', 'birds', 'reptiles', 'small_animals')),
  status text not null default 'active' check (status in ('active', 'deleted', 'checked_out')),
  row_data jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id),
  created_by_name text not null default '',
  updated_by_profile_id uuid references public.profiles(id),
  updated_by_name text not null default '',
  deleted_by_profile_id uuid references public.profiles(id),
  deleted_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.public_boarding_animal_logs (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid references public.public_boarding_animals(id) on delete set null,
  store_id uuid not null references public.stores(id),
  action text not null check (action in ('add', 'update', 'delete', 'all_done')),
  actor_profile_id uuid references public.profiles(id),
  actor_name text not null default '',
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists public_boarding_animals_store_category_idx
  on public.public_boarding_animals(store_id, category, status, updated_at desc);

create index if not exists public_boarding_animal_logs_animal_idx
  on public.public_boarding_animal_logs(animal_id, created_at desc);

create index if not exists public_boarding_animal_logs_store_idx
  on public.public_boarding_animal_logs(store_id, created_at desc);

alter table public.public_boarding_animals enable row level security;
alter table public.public_boarding_animal_logs enable row level security;

drop policy if exists public_boarding_animals_read_mgr on public.public_boarding_animals;
create policy public_boarding_animals_read_mgr on public.public_boarding_animals
for select
using (app.is_manager_up());

drop policy if exists public_boarding_animal_logs_read_mgr on public.public_boarding_animal_logs;
create policy public_boarding_animal_logs_read_mgr on public.public_boarding_animal_logs
for select
using (app.is_manager_up());

-- Public sheet writes are performed by server API with service role after staff validation.
