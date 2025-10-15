-- Remove duplicate/legacy policies to simplify security configuration
-- Keep only the new explicit SELECT policies

-- Drop old policy for orders (keeping "Only admins can view orders")
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;

-- Drop old policy for leads (keeping "Only admins can view leads")  
DROP POLICY IF EXISTS "Admins can view all leads" ON leads;