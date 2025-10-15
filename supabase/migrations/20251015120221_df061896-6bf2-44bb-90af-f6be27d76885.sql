-- Remove public read access to campaigns table to fix security vulnerability
-- This protects sensitive business data (company names, addresses, contact info) from public access
-- The order flow will continue to work as it only needs the unique_code for validation

DROP POLICY IF EXISTS "Public can view active campaigns" ON campaigns;