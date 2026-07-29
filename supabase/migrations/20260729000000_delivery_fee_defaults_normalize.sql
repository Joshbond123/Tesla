-- ────────────────────────────────────────────────────────────────────────────
-- Normalize delivery-fee settings (Currency + Standard + Express)
-- ────────────────────────────────────────────────────────────────────────────
-- Guarantees realistic, editable defaults (Standard $299, Express $399, currency
-- USD) and ensures BOTH the canonical snake_case keys (standard_fee / express_fee)
-- and the legacy aliases (standard / express) plus the currency are populated so
-- every consumer reads a consistent value. Existing admin-set values are
-- preserved; only gaps fill. Safe to run repeatedly (idempotent). The Edge
-- Function performs the same self-initialization on first read.
insert into public.admin_settings (key, value)
values ('delivery_fee', '{"standard_fee": 299, "express_fee": 399, "standard": 299, "express": 399, "currency": "USD"}'::jsonb)
on conflict (key) do update
  set value = jsonb_build_object(
        'standard_fee', coalesce(
              nullif(admin_settings.value->>'standard_fee','')::numeric,
              nullif(admin_settings.value->>'standard','')::numeric,
              nullif(admin_settings.value->>'amount','')::numeric,
              299),
        'express_fee', coalesce(
              nullif(admin_settings.value->>'express_fee','')::numeric,
              nullif(admin_settings.value->>'express','')::numeric,
              399),
        'standard', coalesce(
              nullif(admin_settings.value->>'standard_fee','')::numeric,
              nullif(admin_settings.value->>'standard','')::numeric,
              299),
        'express', coalesce(
              nullif(admin_settings.value->>'express_fee','')::numeric,
              nullif(admin_settings.value->>'express','')::numeric,
              399),
        'currency', coalesce(nullif(admin_settings.value->>'currency',''), 'USD')
      ),
      updated_at = now();
