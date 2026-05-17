-- Security fix: create impersonation_logs table referenced by impersonate-user edge function.
-- Without this table every impersonation attempt fails with a 500 and no audit trail is recorded.

CREATE TABLE IF NOT EXISTS impersonation_logs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  impersonator_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  impersonated_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id      UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  reason               TEXT,
  ip_address           TEXT,
  user_agent           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE impersonation_logs ENABLE ROW LEVEL SECURITY;

-- Only superadmins can read the log
CREATE POLICY "impersonation_logs_superadmin_read" ON impersonation_logs
  FOR SELECT USING (is_superadmin());

-- Service role only can insert (edge function uses service role key — no JWT INSERT policy needed)
-- Authenticated users cannot insert directly: no INSERT policy = deny by default under RLS
