-- Add next_due_date column to orders (nullable — one-off orders won't use it)
ALTER TABLE public.orders
  ADD COLUMN next_due_date DATE;

-- Backfill existing subscription orders
UPDATE public.orders
  SET next_due_date = (order_date + interval '1 month')::DATE
  WHERE payment_mode = 'subscription';

-- Re-run grants to be safe
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO service_role;
