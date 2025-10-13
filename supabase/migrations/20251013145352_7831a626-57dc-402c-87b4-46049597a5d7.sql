-- Create enum types
CREATE TYPE public.campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered');
CREATE TYPE public.payment_mode AS ENUM ('one-off', 'subscription');
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_address TEXT,
  company_postcode TEXT,
  contact_person TEXT,
  unique_code TEXT UNIQUE NOT NULL,
  status campaign_status DEFAULT 'draft' NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create keyring_variants table
CREATE TABLE public.keyring_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  color TEXT NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  keyring_variant_id UUID REFERENCES public.keyring_variants(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  payment_mode payment_mode NOT NULL,
  promo_code TEXT,
  status order_status DEFAULT 'pending' NOT NULL,
  total_amount DECIMAL(10,2),
  notes TEXT,
  order_date TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Enable Row Level Security
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyring_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns
CREATE POLICY "Admins can manage all campaigns"
  ON public.campaigns
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for keyring_variants
CREATE POLICY "Admins can manage all keyring variants"
  ON public.keyring_variants
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view active campaign variants"
  ON public.keyring_variants
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = keyring_variants.campaign_id
        AND campaigns.status = 'active'
    )
  );

-- RLS Policies for orders
CREATE POLICY "Admins can view all orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can create orders"
  ON public.orders
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admins can update orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for keyring images
INSERT INTO storage.buckets (id, name, public)
VALUES ('keyring-images', 'keyring-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for keyring images
CREATE POLICY "Public can view keyring images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'keyring-images');

CREATE POLICY "Admins can upload keyring images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'keyring-images'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update keyring images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'keyring-images'
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    bucket_id = 'keyring-images'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete keyring images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'keyring-images'
    AND public.has_role(auth.uid(), 'admin')
  );

-- Create indexes for better performance
CREATE INDEX idx_campaigns_unique_code ON public.campaigns(unique_code);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_keyring_variants_campaign_id ON public.keyring_variants(campaign_id);
CREATE INDEX idx_orders_campaign_id ON public.orders(campaign_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_order_date ON public.orders(order_date DESC);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);