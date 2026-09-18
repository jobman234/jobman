
-- Fix hash_nin to use extensions schema for pgcrypto
CREATE OR REPLACE FUNCTION public.hash_nin(_nin TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT encode(extensions.digest(_nin::bytea, 'sha256'), 'hex');
$$;
