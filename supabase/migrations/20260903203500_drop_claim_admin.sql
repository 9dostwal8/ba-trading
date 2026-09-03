-- Security Hardening: Revoke and drop the residual bootstrap claim_admin function
-- to eliminate any privilege escalation vectors.

REVOKE ALL ON FUNCTION public.claim_admin() FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.claim_admin();
