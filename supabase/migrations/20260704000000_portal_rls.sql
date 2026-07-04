-- Add 'cancelled' to order_status enum (needed for subscription cancellation)
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'cancelled';

-- RLS: customers can view their own orders
CREATE POLICY "Customers can view own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (customer_email = auth.email());

-- RLS: customers can update their own orders (shipping details, quantity, cancellation)
CREATE POLICY "Customers can update own orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (customer_email = auth.email())
  WITH CHECK (customer_email = auth.email());

-- RLS: customers can view the campaign their order belongs to
CREATE POLICY "Customers can view own campaign"
  ON public.campaigns
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT campaign_id FROM public.orders WHERE customer_email = auth.email()
    )
  );

-- RLS: customers can view keyring variants for their campaign
CREATE POLICY "Customers can view own variants"
  ON public.keyring_variants
  FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT campaign_id FROM public.orders WHERE customer_email = auth.email()
    )
  );

-- Re-run grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.keyring_variants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.keyring_variants TO service_role;
