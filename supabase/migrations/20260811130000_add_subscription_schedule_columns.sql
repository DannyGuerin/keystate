-- Support deferred (next-billing-cycle) subscription quantity changes via Stripe Subscription Schedules

ALTER TABLE public.orders
  ADD COLUMN stripe_subscription_id text,
  ADD COLUMN stripe_subscription_schedule_id text,
  ADD COLUMN pending_total_amount numeric(10,2),
  ADD COLUMN pending_effective_date date;

ALTER TABLE public.order_items
  ADD COLUMN stripe_subscription_item_id text,
  ADD COLUMN pending_quantity integer CHECK (pending_quantity IS NULL OR pending_quantity > 0);

CREATE INDEX idx_orders_stripe_subscription_id ON public.orders(stripe_subscription_id);
