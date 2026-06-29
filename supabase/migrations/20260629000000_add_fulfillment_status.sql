-- Create fulfillment_status enum
CREATE TYPE public.fulfillment_status AS ENUM ('pending', 'shipped', 'done');

-- Add fulfillment_status column to orders
ALTER TABLE public.orders
  ADD COLUMN fulfillment_status public.fulfillment_status NOT NULL DEFAULT 'pending';

-- Explicit grants so authenticated users and service_role can read/write orders
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO service_role;
