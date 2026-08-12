-- The "Public can view active campaign variants" RLS policy (TO anon) has existed since
-- the base schema, but the table-level grant it depends on was never added explicitly —
-- it worked on the hosted project only because Supabase's platform sets default privileges
-- automatically at provisioning time, which a plain `supabase start` local stack does not
-- replicate. Without this grant, Postgres rejects anon reads before RLS is even evaluated.
GRANT SELECT ON public.keyring_variants TO anon;
