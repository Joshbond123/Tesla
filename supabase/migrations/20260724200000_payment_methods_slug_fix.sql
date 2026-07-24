-- Payment methods DB fix: add slug + config + description columns
    -- Applied: 2026-07-24

    -- Add columns
    ALTER TABLE public.payment_methods
    ADD COLUMN IF NOT EXISTS slug text,
    ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS description text;

    -- Populate slug from logo_id or name for existing rows
    UPDATE public.payment_methods
    SET slug = COALESCE(NULLIF(logo_id, ''), LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g')))
    WHERE slug IS NULL;

    -- Set logo_id from slug where null
    UPDATE public.payment_methods
    SET logo_id = slug
    WHERE logo_id IS NULL AND slug IS NOT NULL;

    -- Unique constraint on slug for upsert support
    ALTER TABLE public.payment_methods
    DROP CONSTRAINT IF EXISTS payment_methods_slug_unique;
    ALTER TABLE public.payment_methods
    ADD CONSTRAINT payment_methods_slug_unique UNIQUE (slug);

    -- Enable RLS
    ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

    -- Service role: full CRUD
    DROP POLICY IF EXISTS "Service role full access payment_methods" ON public.payment_methods;
    CREATE POLICY "Service role full access payment_methods"
    ON public.payment_methods FOR ALL
    TO service_role USING (true) WITH CHECK (true);

    -- Anon: read enabled methods (for payment page direct REST call)
    DROP POLICY IF EXISTS "Anon read enabled payment_methods" ON public.payment_methods;
    CREATE POLICY "Anon read enabled payment_methods"
    ON public.payment_methods FOR SELECT
    TO anon USING (enabled = true);
    