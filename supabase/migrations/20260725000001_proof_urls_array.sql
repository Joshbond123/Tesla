-- Add proof_urls column to payment_proofs for multiple image support
-- Applied on 2026-07-25

alter table public.payment_proofs
  add column if not exists proof_urls text;

-- Index on order_id for faster JOIN lookups
create index if not exists idx_payment_proofs_order_id on public.payment_proofs(order_id);
