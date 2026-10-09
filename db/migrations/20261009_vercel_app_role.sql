-- Dedicated login for the app's Vercel deployment (project `911electrics`).
--
-- The site previously connected as `postgres`. A separate role lets the new
-- hosting project have its own credential, rotated or revoked without touching
-- anything else. BYPASSRLS matches what the app had as `postgres`: every
-- public table has RLS on with no policies (so the anon/authenticated API keys
-- read nothing), and the app is the trusted server-side reader.
--
-- The password is NOT in this file. It was set separately with a pre-hashed
-- SCRAM verifier (ALTER ROLE vercel_app PASSWORD 'SCRAM-SHA-256$…'), so the
-- plaintext never reached the database or its logs. To rotate it, generate a new
-- verifier and ALTER ROLE again, then update DATABASE_URL in Vercel.
--
-- Connection (transaction pooler):
--   postgresql://vercel_app.hywqbbjwepliduwamhip:<password>@aws-1-us-east-2.pooler.supabase.com:6543/postgres

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vercel_app') THEN
    CREATE ROLE vercel_app LOGIN BYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO vercel_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vercel_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO vercel_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO vercel_app;

-- Tables added later by hand-applied migrations (run as postgres) are covered too.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vercel_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO vercel_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO vercel_app;
