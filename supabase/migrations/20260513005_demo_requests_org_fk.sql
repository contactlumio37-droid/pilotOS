-- Migration : 20260513005_demo_requests_org_fk.sql
-- Ajoute une FK vers organisations sur demo_requests
-- Permet de lier un prospect à une organisation existante (parrainage, migration)

ALTER TABLE demo_requests
  ADD COLUMN IF NOT EXISTS referral_organisation_id UUID
    REFERENCES organisations(id) ON DELETE SET NULL;
