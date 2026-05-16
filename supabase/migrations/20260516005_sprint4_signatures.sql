-- Sprint 4 — Workflow signatures de documents
-- signature_requests : demandes de signature envoyées aux destinataires
-- document_acknowledgments : ajout du chemin de la signature image

-- ── Colonne signature sur les accusés de réception existants ──────────────────

ALTER TABLE document_acknowledgments
  ADD COLUMN IF NOT EXISTS signature_storage_path TEXT;

-- ── Table signature_requests ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS signature_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id       UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  document_id           UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  recipient_id          UUID NOT NULL REFERENCES auth.users(id),
  sent_by               UUID NOT NULL REFERENCES auth.users(id),
  token                 TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex') UNIQUE,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'signed', 'rejected')),
  message               TEXT,
  signed_at             TIMESTAMPTZ,
  signature_storage_path TEXT,
  expires_at            TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un seul request pending par document + destinataire
CREATE UNIQUE INDEX IF NOT EXISTS signature_requests_pending_idx
  ON signature_requests(document_id, recipient_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS signature_requests_recipient_idx
  ON signature_requests(recipient_id, status);

CREATE INDEX IF NOT EXISTS signature_requests_org_idx
  ON signature_requests(organisation_id, status);

DROP TRIGGER IF EXISTS signature_requests_updated_at ON signature_requests;
CREATE TRIGGER signature_requests_updated_at
  BEFORE UPDATE ON signature_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;

-- Le destinataire voit ses propres demandes
CREATE POLICY "sig_req_select_recipient" ON signature_requests FOR SELECT
  USING (recipient_id = auth.uid());

-- L'expéditeur et les managers de l'org voient tout
CREATE POLICY "sig_req_select_org_managers" ON signature_requests FOR SELECT
  USING (
    sent_by = auth.uid()
    OR is_manager_or_above(organisation_id)
    OR is_superadmin()
  );

-- Managers+ peuvent créer des demandes
CREATE POLICY "sig_req_insert" ON signature_requests FOR INSERT
  WITH CHECK (
    sent_by = auth.uid()
    AND (is_superadmin() OR is_manager_or_above(organisation_id))
  );

-- Le destinataire peut mettre à jour (signer ou rejeter)
CREATE POLICY "sig_req_update_recipient" ON signature_requests FOR UPDATE
  USING (recipient_id = auth.uid() AND status = 'pending');

-- Managers+ ou expéditeur peuvent supprimer (annuler) si pending
CREATE POLICY "sig_req_delete" ON signature_requests FOR DELETE
  USING (
    (sent_by = auth.uid() AND status = 'pending')
    OR is_superadmin()
    OR is_manager_or_above(organisation_id)
  );

-- ── Token lookup public (pour la page de signature) ───────────────────────────
-- Seul le titulaire du token peut y accéder — on le laisse authentifié
-- La page /sign/:token vérifie côté app que recipient_id = auth.uid()
