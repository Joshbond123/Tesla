create extension if not exists pgcrypto;

create table if not exists public.giveaway_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  email text not null unique,
  phone text not null,
  first_name text not null default '',
  last_name text not null default '',
  verification_token text not null unique,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified')),
  entry_count integer not null default 1 check (entry_count = 1),
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create table if not exists public.user_sessions (
  token text primary key,
  user_id uuid not null references public.giveaway_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create table if not exists public.selected_cars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.giveaway_users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.delivery_details (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.giveaway_users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,
  tracking_number text not null unique,
  user_id uuid not null references public.giveaway_users(id) on delete cascade,
  selected_car_id uuid references public.selected_cars(id) on delete set null,
  delivery_details_id uuid references public.delivery_details(id) on delete set null,
  delivery_method jsonb not null default '{}'::jsonb,
  payment_method jsonb not null default '{}'::jsonb,
  status text not null default 'confirmed',
  order_date timestamptz not null default now(),
  estimated_delivery date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tracking_data (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  stage text not null,
  stage_order integer not null,
  timestamp timestamptz,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique(order_id, stage_order)
);

alter table public.giveaway_users enable row level security;
alter table public.user_sessions enable row level security;
alter table public.selected_cars enable row level security;
alter table public.delivery_details enable row level security;
alter table public.orders enable row level security;
alter table public.tracking_data enable row level security;

drop policy if exists "Users can read own giveaway profile" on public.giveaway_users;
drop policy if exists "Users can read own selected cars" on public.selected_cars;
drop policy if exists "Users can read own delivery details" on public.delivery_details;
drop policy if exists "Users can read own orders" on public.orders;
drop policy if exists "Users can read own tracking" on public.tracking_data;
create policy "Users can read own giveaway profile" on public.giveaway_users for select to authenticated using (auth.uid() = auth_user_id);
create policy "Users can read own selected cars" on public.selected_cars for select to authenticated using (exists (select 1 from public.giveaway_users u where u.id = user_id and u.auth_user_id = auth.uid()));
create policy "Users can read own delivery details" on public.delivery_details for select to authenticated using (exists (select 1 from public.giveaway_users u where u.id = user_id and u.auth_user_id = auth.uid()));
create policy "Users can read own orders" on public.orders for select to authenticated using (exists (select 1 from public.giveaway_users u where u.id = user_id and u.auth_user_id = auth.uid()));
create policy "Users can read own tracking" on public.tracking_data for select to authenticated using (exists (select 1 from public.orders o join public.giveaway_users u on u.id = o.user_id where o.id = tracking_data.order_id and u.auth_user_id = auth.uid()));
