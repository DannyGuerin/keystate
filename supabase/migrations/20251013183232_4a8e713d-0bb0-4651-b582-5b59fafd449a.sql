-- Add 'pending_payment' and 'paid' status to order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'paid';