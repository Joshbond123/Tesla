-- Corrective, forward-only migration.
--
-- 20260715000001_payment_methods_extended.sql referenced a `logo_id` column that
-- the base table never created, so it failed to apply. Add the missing columns
-- here (idempotently) and re-apply the intended logo assignments so brand logos
-- resolve. Also add `proof_back_url` so Apple Gift Card proofs can store the
-- back-of-card image.

alter table public.payment_methods add column if not exists logo_id text;
alter table public.payment_proofs  add column if not exists proof_back_url text;

update public.payment_methods set logo_id = 'pay-paypal'      where name = 'paypal'     and logo_id is null;
update public.payment_methods set logo_id = 'pay-cashapp'     where name = 'cashapp'    and logo_id is null;
update public.payment_methods set logo_id = 'pay-venmo'       where name = 'venmo'      and logo_id is null;
update public.payment_methods set logo_id = 'pay-zelle'       where name = 'zelle'      and logo_id is null;
update public.payment_methods set logo_id = 'pay-bitcoin'     where name = 'bitcoin'    and logo_id is null;
update public.payment_methods set logo_id = 'pay-ethereum'    where name = 'ethereum'   and logo_id is null;
update public.payment_methods set logo_id = 'pay-usdt'        where name = 'usdt-erc20' and logo_id is null;
update public.payment_methods set logo_id = 'pay-usdt-trc20'  where name = 'usdt-trc20' and logo_id is null;
update public.payment_methods set logo_id = 'pay-creditcard'  where name = 'creditcard' and logo_id is null;
update public.payment_methods set logo_id = 'pay-applegift'   where name = 'applegift'  and logo_id is null;

-- The edge function persists the full, rich per-method configuration as a JSON
-- document in admin_settings (key = 'payment_methods') so nested config such as
-- wallets, QR codes and instructions survives without a wide, brittle schema.
insert into public.admin_settings (key, value)
values ('payment_methods', '{"methods":[]}'::jsonb)
on conflict (key) do nothing;
