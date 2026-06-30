-- Add last_shipped_date column to orders (nullable — only set when a subscription is shipped)
ALTER TABLE public.orders
  ADD COLUMN last_shipped_date DATE;

-- Re-run grants to be safe
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO service_role;
