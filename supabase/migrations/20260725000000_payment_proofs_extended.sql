-- Extended Payment Proofs migration
-- Adds multi-image support and redundant customer info fields for admin display
-- so the admin panel can show full customer details without complex joins.

alter table public.payment_proofs
  add column if not exists proof_images  text[]    default '{}',
  add column if not exists email         text,
  add column if not exists phone         text,
  add column if not exists delivery_method text,
  add column if not exists car_model     text;

-- Migrate existing single proof_url into proof_images array
update public.payment_proofs
set proof_images = case
  when proof_url is not null and proof_url != '' then array[proof_url]
  else '{}'::text[]
end
where proof_images is null or proof_images = '{}'::text[];
