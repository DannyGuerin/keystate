-- Add explicit SELECT policies for all tables to ensure complete security coverage
-- This follows defense-in-depth principles by explicitly blocking unauthorized reads

-- Add explicit SELECT policy for orders (admins only)
CREATE POLICY "Only admins can view orders"
ON orders 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add explicit SELECT policy for leads (admins only)  
CREATE POLICY "Only admins can view leads"
ON leads 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add explicit SELECT policy for campaigns (admins only)
CREATE POLICY "Only admins can view campaigns"
ON campaigns 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));