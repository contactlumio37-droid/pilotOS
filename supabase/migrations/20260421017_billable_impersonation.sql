-- Migration 017 : Billing safety + impersonation
-- Ajoute is_billable (généré), can_impersonate sur organisation_members
-- + table impersonation_logs dédiée

-- ── is_billable : colonne générée — impossible à falsifier depuis l'app ──────
-- superadmin = accès plateforme, non facturé à l'org
-- tous les autres rôles org (admin, manager, director, contributor, terrain, reader) sont facturés
ALTER TABLE organisation_members
  ADD COLUMN is_billable BOOLEAN NOT NULL
    GENERATED ALWAYS AS (role NOT IN ('superadmin')) STORED;

-- ── can_impersonate : permission explicite, ne découle pas du rôle ────────────
ALTER TABLE organisation_members
  ADD COLUMN can_impersonate BOOLEAN NOT NULL DEFAULT false;

-- Donner can_impersonate aux superadmins existants
UPDATE organisation_members SET can_impersonate = true WHERE role = 'superadmin';

-- ── Index billing : COUNT rapide des sièges facturés par org ─────────────────
CREATE INDEX idx_org_members_billable
  ON organisation_members (organisation_id)
  WHERE is_billable = true AND is_active = true;

-- ── impersonation_logs : audit immuable ───────────────────────────────────────
CREATE TABLE impersonation_logs (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  impersonator_id      UUID        NOT NULL REFERENCES auth.users(id),
  impersonated_user_id UUID        NOT NULL REFERENCES auth.users(id),
  organisation_id      UUID        NOT NULL REFERENCES organisations(id),
  reason               TEXT,
  ip_address           TEXT,
  user_agent           TEXT,
  started_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at             TIMESTAMPTZ,

  CONSTRAINT no_self_impersonation CHECK (impersonator_id <> impersonated_user_id)
);

ALTER TABLE impersonation_logs ENABLE ROW LEVEL SECURITY;

-- Seuls les superadmins lisent les logs d'impersonation
CREATE POLICY "impersonation_logs_superadmin_read" ON impersonation_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.user_id = auth.uid()
        AND om.role = 'superadmin'
        AND om.is_active = true
    )
  );

-- L'app écrit via Edge Function (service_role) uniquement — pas de INSERT côté client
-- Aucune policy INSERT/UPDATE/DELETE pour authenticated

CREATE INDEX idx_impersonation_impersonator ON impersonation_logs (impersonator_id);
CREATE INDEX idx_impersonation_org          ON impersonation_logs (organisation_id, started_at DESC);

-- ── Fonction SQL : sièges facturés vs limite ──────────────────────────────────
CREATE OR REPLACE FUNCTION get_billing_status(p_org_id UUID)
RETURNS TABLE (used INT, seat_limit INT, has_capacity BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    COUNT(om.id)::INT                                   AS used,
    (o.seats_included + o.seats_extra)::INT             AS seat_limit,
    COUNT(om.id) < (o.seats_included + o.seats_extra)   AS has_capacity
  FROM organisations o
  LEFT JOIN organisation_members om
    ON om.organisation_id = o.id
   AND om.is_billable = true
   AND om.is_active = true
  WHERE o.id = p_org_id
  GROUP BY o.seats_included, o.seats_extra;
$$;
