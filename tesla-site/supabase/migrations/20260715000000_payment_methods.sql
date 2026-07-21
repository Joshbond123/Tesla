-- Payment Methods table
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_name text not null,
  type text not null default 'wallet',
  wallet_address text,
  account_details text,
  qr_code_url text,
  payment_instructions text,
  logo_url text,
  icon_emoji text default '💳',
  sort_order integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insert default payment methods
insert into public.payment_methods (name, display_name, type, icon_emoji, sort_order, enabled) values
  ('paypal', 'PayPal', 'wallet', '💳', 1, true),
  ('cashapp', 'Cash App', 'wallet', '💵', 2, true),
  ('bitcoin', 'Bitcoin (BTC)', 'crypto', '₿', 3, true),
  ('ethereum', 'Ethereum (ETH)', 'crypto', '♦', 4, true),
  ('usdt', 'USDT (Tether)', 'crypto', '💎', 5, true),
  ('creditcard', 'Credit Card', 'card', '🏦', 6, true),
  ('applegift', 'Apple Gift Card', 'gift', '🍎', 7, true)
on conflict (id) do nothing;

-- Payment Proofs table
create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.giveaway_users(id),
  order_id text not null,
  payment_method text not null,
  proof_url text not null,
  proof_type text not null default 'file',
  amount text,
  status text not null default 'pending',
  admin_notes text,
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now()
);

-- Social Settings table
create table if not exists public.social_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Insert default social settings
insert into public.social_settings (key, value) values
  ('whatsapp', '{"number":"+1234567890","enabled":true,"label":"Chat with us on WhatsApp"}'::jsonb),
  ('telegram', '{"username":"TeslaAwardBot","enabled":false,"label":"Chat with us on Telegram"}'::jsonb)
on conflict (key) do nothing;

-- Enable RLS
alter table public.payment_methods enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.social_settings enable row level security;

-- Allow public read for enabled payment methods
create policy "Anyone can read enabled payment methods"
  on public.payment_methods for select
  using (enabled = true);

-- Allow service role full access
create policy "Service role full access payment_methods"
  on public.payment_methods for all
  using (true)
  with check (true);

create policy "Service role full access payment_proofs"
  on public.payment_proofs for all
  using (true)
  with check (true);

create policy "Service role full access social_settings"
  on public.social_settings for all
  using (true)
  with check (true);
