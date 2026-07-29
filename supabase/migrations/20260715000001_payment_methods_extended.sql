-- Extended Payment Methods migration v2
-- Adds Venmo, Zelle, and splits USDT into ERC-20 and TRC-20 variants
-- Run after the base payment_methods migration

-- Insert additional default payment methods (idempotent)
insert into public.payment_methods (name, display_name, type, logo_id, sort_order, enabled, payment_instructions) values
  ('venmo', 'Venmo', 'wallet', 'pay-venmo', 3, true, 'Send payment via Venmo. Include your Order ID in the description.'),
  ('zelle', 'Zelle', 'wallet', 'pay-zelle', 4, true, 'Send payment via Zelle. Include your Order ID in the memo.'),
  ('usdt-erc20', 'USDT (ERC-20)', 'crypto', 'pay-usdt', 5, true, 'Send USDT (ERC-20) to the wallet address shown.'),
  ('usdt-trc20', 'USDT (TRC-20)', 'crypto', 'pay-usdt-trc20', 6, true, 'Send USDT (TRC-20) to the wallet address shown.')
on conflict (id) do nothing;

-- Update existing payment methods with logo_id for brand consistency
update public.payment_methods set logo_id = 'pay-paypal' where name = 'paypal' and logo_id is null;
update public.payment_methods set logo_id = 'pay-cashapp' where name = 'cashapp' and logo_id is null;
update public.payment_methods set logo_id = 'pay-bitcoin' where name = 'bitcoin' and logo_id is null;
update public.payment_methods set logo_id = 'pay-ethereum' where name = 'ethereum' and logo_id is null;
update public.payment_methods set logo_id = 'pay-creditcard' where name = 'creditcard' and logo_id is null;
update public.payment_methods set logo_id = 'pay-applegift' where name = 'applegift' and logo_id is null;
