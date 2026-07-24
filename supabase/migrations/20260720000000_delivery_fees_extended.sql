-- Extended Admin Settings - Standard + Express Delivery Fees
-- Run after the base admin_settings migration

-- Update delivery_fee to include both standard and express fee
insert into public.admin_settings (key, value) 
values ('delivery_fee', '{"standard_fee": 299, "express_fee": 399}'::jsonb)
on conflict (key) do update set 
  value = '{"standard_fee": 299, "express_fee": 399}'::jsonb, 
  updated_at = now()
where admin_settings.key = 'delivery_fee';
