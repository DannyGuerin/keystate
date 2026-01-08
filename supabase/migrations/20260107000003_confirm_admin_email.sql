-- Manually confirm the user's email
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'admin@keystate.com';
