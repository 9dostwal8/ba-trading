-- Grant admin role to dosty.wal98@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'dosty.wal98@gmail.com'
   OR phone LIKE '%7702269722%'
ON CONFLICT (user_id, role) DO NOTHING;
