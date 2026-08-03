-- ──────────────────────────────────────────────────────────────────────────────
-- Backfill customer_email and user_id on payment_proofs rows where they are NULL.
-- This fixes the DB-driven hasPaymentProof check for proofs uploaded before the
-- fix that always resolves the email from the session/order at submit time.
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Backfill via order_id → orders → giveaway_users
UPDATE payment_proofs pp
SET
  customer_email = gu.email,
  user_id        = gu.id
FROM orders o
JOIN giveaway_users gu ON gu.id = o.user_id
WHERE pp.order_id = o.order_id
  AND (pp.customer_email IS NULL OR pp.customer_email = '')
  AND (pp.user_id IS NULL);

-- 2. Backfill user_id where customer_email is already set but user_id is still NULL
UPDATE payment_proofs pp
SET user_id = gu.id
FROM giveaway_users gu
WHERE lower(gu.email) = lower(pp.customer_email)
  AND pp.user_id IS NULL
  AND pp.customer_email IS NOT NULL
  AND pp.customer_email != '';
