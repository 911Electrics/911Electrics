-- Enable Row Level Security on the internal / server-only tables that were
-- still exposed to Supabase's PostgREST `anon` and `authenticated` roles.
--
-- Why this is safe and needs no policies:
--   * The app never uses @supabase/supabase-js — it connects only through `pg`
--     (src/db/client.ts) with DATABASE_URL, i.e. as the `postgres` role, which
--     has rolbypassrls = true. `service_role` (rolbypassrls = true) is likewise
--     unaffected. So enabling RLS does not change application access.
--   * `anon` / `authenticated` (used by the auto-generated PostgREST API and the
--     public anon key) have rolbypassrls = false. With RLS on and no policy,
--     they get default-deny — closing the "anyone with the anon key can read or
--     modify every row" hole the Supabase advisor flagged.
--
-- These tables are all admin/server-only (sessions, audit trail, throttling,
-- editor-managed content), so there is intentionally NO anon/authenticated
-- policy. RLS is ENABLEd but NOT FORCEd, so the `postgres` owner the app
-- connects as keeps full access.
--
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY is idempotent.

ALTER TABLE public.studio_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_throttle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_integration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.url_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reply_templates ENABLE ROW LEVEL SECURITY;
