-- Admin Settings table for delivery fee and other configurable values
create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Insert default delivery fee
insert into public.admin_settings (key, value) 
values ('delivery_fee', '{"amount": 299}'::jsonb)
on conflict (key) do nothing;

-- Admin API key for dashboard authentication  
create table if not exists public.admin_api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'default',
  key_hash text not null unique,
  created_at timestamptz not null default now()
);

-- Insert default admin password hash (admin123 -> SHA-256)
insert into public.admin_api_keys (name, key_hash)
values ('default', '240be518fabd2724ddb6f04eeb1da5967448d7e83198408c64e9defa8ff52cf3')
on conflict (key_hash) do nothing;

alter table public.admin_settings enable row level security;
alter table public.admin_api_keys enable row level security;
