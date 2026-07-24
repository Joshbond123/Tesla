-- Payment Proofs table — full schema with customer info columns
-- Applied directly via Supabase Management API on 2026-07-24

create table if not exists public.payment_proofs (
  id              uuid      primary key default gen_random_uuid(),
  user_id         uuid      references public.giveaway_users(id),
  order_id        text      not null,
  payment_method  text      not null,
  proof_url       text,
  proof_type      text      not null default 'file',
  amount          text,
  status          text      not null default 'pending',
  admin_notes     text,
  reviewed_at     timestamptz,
  reviewed_by     text,
  proof_back_url  text,
  -- Customer info stored at submit time (denormalised for admin display speed)
  car_model       text,
  customer_name   text,
  customer_email  text,
  customer_phone  text,
  delivery_method text,
  created_at      timestamptz not null default now()
);

alter table public.payment_proofs enable row level security;

-- Service role: full CRUD
drop policy if exists "Service role full access payment_proofs" on public.payment_proofs;
create policy "Service role full access payment_proofs"
  on public.payment_proofs for all
  to service_role
  using (true) with check (true);

-- Anon: read-only (needed by payment-confirmation.html live status check)
drop policy if exists "Anon read payment proofs" on public.payment_proofs;
create policy "Anon read payment proofs"
  on public.payment_proofs for select
  to anon
  using (true);

-- Supabase Storage bucket 'payment-proofs' (public, 10 MB limit)
-- Created via Storage API — bucket name: payment-proofs
