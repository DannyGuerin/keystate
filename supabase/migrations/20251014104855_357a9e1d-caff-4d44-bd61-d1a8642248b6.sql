-- Create enum for lead status
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'converted', 'closed');

-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status lead_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert leads (public form submission)
CREATE POLICY "Anyone can submit leads"
  ON public.leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view/manage leads
CREATE POLICY "Admins can view all leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update leads"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete leads"
  ON public.leads
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();