-- Grant admin role to specific user
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Find the user by email
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'admin@keystate.com';

  IF target_user_id IS NOT NULL THEN
    -- Insert admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'Admin role granted to %', target_user_id;
  ELSE
    RAISE WARNING 'User admin@keystate.com not found';
  END IF;
END $$;
