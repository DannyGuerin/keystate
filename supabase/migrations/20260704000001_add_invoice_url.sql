-- Add invoice_url column to orders for storing Stripe hosted invoice links
ALTER TABLE public.orders
  ADD COLUMN invoice_url TEXT;

-- Re-run grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO anon;
