-- Redesigned Delivery Fee Settings — Standard + Express
-- Store both fees in a single JSON document in admin_settings for front-end consumption

-- Update existing delivery_fee entry to hold both standard and express fees
update public.admin_settings
set value = '{"standard": 299, "express": 399}'::jsonb,
    updated_at = now()
where key = 'delivery_fee';

-- Insert if the key doesn't exist yet
insert into public.admin_settings (key, value)
values ('delivery_fee', '{"standard": 299, "express": 399}'::jsonb)
on conflict (key) do nothing;
