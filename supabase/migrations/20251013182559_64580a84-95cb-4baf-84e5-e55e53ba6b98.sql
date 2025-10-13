-- Add shipping address and Stripe session tracking to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipping_name text,
ADD COLUMN IF NOT EXISTS shipping_address_line1 text,
ADD COLUMN IF NOT EXISTS shipping_address_line2 text,
ADD COLUMN IF NOT EXISTS shipping_city text,
ADD COLUMN IF NOT EXISTS shipping_postal_code text,
ADD COLUMN IF NOT EXISTS shipping_country text,
ADD COLUMN IF NOT EXISTS stripe_session_id text UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;