-- Table demo_requests : formulaire de demande de démo sur la page /demo
CREATE TABLE IF NOT EXISTS demo_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  email          TEXT NOT NULL,
  organisation_name TEXT NOT NULL,
  sector         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS : seuls les superadmins peuvent lire, INSERT public (pas d'auth requise)
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_requests_insert_public"
  ON demo_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "demo_requests_select_superadmin"
  ON demo_requests FOR SELECT
  TO authenticated
  USING (is_superadmin());
