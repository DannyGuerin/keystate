-- Add 'refunded' as a valid order_status and 'cancelled' as a valid
-- fulfillment_status. Neither existed previously, so refunds had no
-- correct value to be recorded with.
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE fulfillment_status ADD VALUE IF NOT EXISTS 'cancelled';
