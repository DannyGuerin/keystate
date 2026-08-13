-- Support tracking partial refunds: a dedicated status so a partially
-- refunded order is visibly distinct from a normal paid one, plus a column
-- to record how much has actually been refunded (always set from Stripe's
-- own authoritative charge.amount_refunded, never accumulated locally).
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'partially_refunded';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount_refunded numeric DEFAULT 0;
