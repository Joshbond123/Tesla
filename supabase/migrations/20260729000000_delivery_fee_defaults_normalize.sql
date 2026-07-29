-- ────────────────────────────────────────────────────────────────────────────
-- Normalize delivery-fee settings (Standard + Express)
-- ────────────────────────────────────────────────────────────────────────────
-- Guarantees realistic, editable defaults (Standard $299, Express $399) and
-- ensures BOTH the canonical snake_case keys (standard_fee / express_fee) and
-- the legacy aliases (standard / express) are populated so every consumer reads
-- a consistent value. Existing admin-set values are preserved; only gaps fill.
--
-- Safe to run repeatedly (idempotent). The Edge Function performs the same
-- self-initialization on first read, so this migration primarily benefits fresh
-- databases and keeps the schema documented.
insert into public.admin_settings (key, value)
values ('delivery_fee', '{"standard_fee": 299, "express_fee": 399, "standard": 299, "express": 399}'::jsonb)
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
              399)
      ),
      updated_at = now();
