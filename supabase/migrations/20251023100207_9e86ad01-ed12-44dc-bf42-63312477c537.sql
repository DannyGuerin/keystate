-- Drop the conflicting restrictive policy that blocks anonymous access
DROP POLICY IF EXISTS "Only admins can view campaigns" ON public.campaigns;

-- The newer "Public can view active campaigns by code" policy will now work correctly