-- Fix RLS policy for orders table to allow anonymous inserts
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Create a new policy that explicitly allows anonymous users to insert orders
CREATE POLICY "Allow anonymous order creation"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);