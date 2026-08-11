-- Support multiple keyring variants per order (multi-select order form)
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  keyring_variant_id UUID REFERENCES public.keyring_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_keyring_variant_id ON public.order_items(keyring_variant_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Admins can manage all order items
CREATE POLICY "Admins can manage all order items"
  ON public.order_items
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Customers can view the line items belonging to their own orders
CREATE POLICY "Customers can view own order items"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (SELECT id FROM public.orders WHERE customer_email = auth.email())
  );

-- Order creation happens via the create-checkout edge function using the service role key
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO service_role;
GRANT SELECT ON public.order_items TO authenticated;
