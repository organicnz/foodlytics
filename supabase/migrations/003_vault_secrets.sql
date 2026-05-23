-- filename: supabase/migrations/003_vault_secrets.sql
-- purpose: Define secure helper function to read decrypted secrets from Supabase Vault
-- brief_section: Supabase Vault integration & secure secret management

-- Create SECURITY DEFINER function to securely query decrypted_secrets
CREATE OR REPLACE FUNCTION get_vault_secret(secret_name text)
RETURNS text
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  secret_val text;
BEGIN
  SELECT decrypted_secret
  INTO secret_val
  FROM vault.decrypted_secrets
  WHERE name = secret_name;
  
  RETURN secret_val;
END;
$$;

-- Grant execution to authenticated users and service role
GRANT EXECUTE ON FUNCTION get_vault_secret(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_vault_secret(text) TO service_role;
