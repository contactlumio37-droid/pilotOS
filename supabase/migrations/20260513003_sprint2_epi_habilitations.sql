-- =============================================================
-- PilotOS — Sprint 2 : EPI & Habilitations
-- =============================================================
-- Tables :
--   epi_items          — catalogue des équipements de protection individuelle
--   epi_attributions   — attribution EPI → utilisateur + suivi contrôles
--   habilitations      — catalogue des types d'habilitation
--   habilitation_attributions — affectation habilitation → utilisateur
-- =============================================================

-- ── 1. EPI Items (catalogue) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS epi_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id    UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id            UUID REFERENCES sites(id) ON DELETE SET NULL,
  category           TEXT NOT NULL,  -- casque, gants, chaussures, lunettes, harnais, autre
  designation        TEXT NOT NULL,
  reference          TEXT,
  norm               TEXT,           -- EN397, EN388...
  supplier           TEXT,
  storage_location   TEXT,
  renewal_months     INT,            -- périodicité de renouvellement (en mois)
  notes              TEXT,
  created_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE epi_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_epi_items_org ON epi_items(organisation_id);

-- ── 2. EPI Attributions (dotation + contrôles) ────────────────
CREATE TABLE IF NOT EXISTS epi_attributions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id    UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  epi_item_id        UUID NOT NULL REFERENCES epi_items(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at        DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity           INT NOT NULL DEFAULT 1,
  condition          TEXT NOT NULL DEFAULT 'neuf',  -- neuf, bon, usé, hs
  next_control_date  DATE,
  last_control_date  DATE,
  last_control_result TEXT,  -- ok, nok, remplacé
  notes              TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE epi_attributions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_epi_attr_org      ON epi_attributions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_epi_attr_user     ON epi_attributions(user_id);
CREATE INDEX IF NOT EXISTS idx_epi_attr_ctrl     ON epi_attributions(next_control_date) WHERE is_active = true;

-- ── 3. Habilitations (catalogue des types) ────────────────────
CREATE TABLE IF NOT EXISTS habilitations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id    UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  code               TEXT NOT NULL,   -- CACES R489-3, B0, H0V, SST, Travail en hauteur...
  label              TEXT NOT NULL,
  category           TEXT NOT NULL,   -- caces, electrique, chimique, hauteur, sst, autre
  description        TEXT,
  validity_months    INT,             -- durée de validité en mois (NULL = illimitée)
  renewal_delay_days INT DEFAULT 60,  -- alerte X jours avant expiration
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organisation_id, code)
);

ALTER TABLE habilitations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_habilitations_org ON habilitations(organisation_id);

-- ── 4. Habilitation Attributions ─────────────────────────────
CREATE TABLE IF NOT EXISTS habilitation_attributions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id       UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  habilitation_id       UUID NOT NULL REFERENCES habilitations(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  issued_at             DATE NOT NULL,
  expires_at            DATE,          -- NULL si validité illimitée
  issuer                TEXT,          -- organisme émetteur
  certificate_url       TEXT,          -- lien vers le justificatif
  status                TEXT NOT NULL DEFAULT 'active',  -- active, expired, suspended
  notes                 TEXT,
  created_by            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE habilitation_attributions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_hab_attr_org    ON habilitation_attributions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_hab_attr_user   ON habilitation_attributions(user_id);
CREATE INDEX IF NOT EXISTS idx_hab_attr_expiry ON habilitation_attributions(expires_at) WHERE status = 'active';

-- ── 5. Triggers updated_at ────────────────────────────────────
DROP TRIGGER IF EXISTS trg_epi_items_updated_at ON epi_items;
CREATE TRIGGER trg_epi_items_updated_at
  BEFORE UPDATE ON epi_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_epi_attr_updated_at ON epi_attributions;
CREATE TRIGGER trg_epi_attr_updated_at
  BEFORE UPDATE ON epi_attributions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_habilitations_updated_at ON habilitations;
CREATE TRIGGER trg_habilitations_updated_at
  BEFORE UPDATE ON habilitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_hab_attr_updated_at ON habilitation_attributions;
CREATE TRIGGER trg_hab_attr_updated_at
  BEFORE UPDATE ON habilitation_attributions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 6. Mise à jour auto du statut habilitation ────────────────
CREATE OR REPLACE FUNCTION sync_habilitation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < CURRENT_DATE THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hab_attr_status ON habilitation_attributions;
CREATE TRIGGER trg_hab_attr_status
  BEFORE INSERT OR UPDATE ON habilitation_attributions
  FOR EACH ROW EXECUTE FUNCTION sync_habilitation_status();

-- ── 7. RLS Policies ───────────────────────────────────────────

-- epi_items
DROP POLICY IF EXISTS "epi_items_select" ON epi_items;
CREATE POLICY "epi_items_select" ON epi_items
  FOR SELECT USING (is_superadmin() OR user_is_in_org(organisation_id));

DROP POLICY IF EXISTS "epi_items_insert" ON epi_items;
CREATE POLICY "epi_items_insert" ON epi_items
  FOR INSERT WITH CHECK (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members
      WHERE user_id = auth.uid()
        AND organisation_id = epi_items.organisation_id
        AND role NOT IN ('reader', 'terrain')
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "epi_items_update" ON epi_items;
CREATE POLICY "epi_items_update" ON epi_items
  FOR UPDATE USING (is_superadmin() OR is_manager_or_above(organisation_id));

DROP POLICY IF EXISTS "epi_items_delete" ON epi_items;
CREATE POLICY "epi_items_delete" ON epi_items
  FOR DELETE USING (is_superadmin() OR is_manager_or_above(organisation_id));

-- epi_attributions
DROP POLICY IF EXISTS "epi_attr_select" ON epi_attributions;
CREATE POLICY "epi_attr_select" ON epi_attributions
  FOR SELECT USING (is_superadmin() OR user_is_in_org(organisation_id));

DROP POLICY IF EXISTS "epi_attr_insert" ON epi_attributions;
CREATE POLICY "epi_attr_insert" ON epi_attributions
  FOR INSERT WITH CHECK (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members
      WHERE user_id = auth.uid()
        AND organisation_id = epi_attributions.organisation_id
        AND role NOT IN ('reader', 'terrain')
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "epi_attr_update" ON epi_attributions;
CREATE POLICY "epi_attr_update" ON epi_attributions
  FOR UPDATE USING (is_superadmin() OR is_manager_or_above(organisation_id));

DROP POLICY IF EXISTS "epi_attr_delete" ON epi_attributions;
CREATE POLICY "epi_attr_delete" ON epi_attributions
  FOR DELETE USING (is_superadmin() OR is_manager_or_above(organisation_id));

-- habilitations
DROP POLICY IF EXISTS "habilitations_select" ON habilitations;
CREATE POLICY "habilitations_select" ON habilitations
  FOR SELECT USING (is_superadmin() OR user_is_in_org(organisation_id));

DROP POLICY IF EXISTS "habilitations_insert" ON habilitations;
CREATE POLICY "habilitations_insert" ON habilitations
  FOR INSERT WITH CHECK (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members
      WHERE user_id = auth.uid()
        AND organisation_id = habilitations.organisation_id
        AND role NOT IN ('reader', 'terrain')
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "habilitations_update" ON habilitations;
CREATE POLICY "habilitations_update" ON habilitations
  FOR UPDATE USING (is_superadmin() OR is_manager_or_above(organisation_id));

DROP POLICY IF EXISTS "habilitations_delete" ON habilitations;
CREATE POLICY "habilitations_delete" ON habilitations
  FOR DELETE USING (is_superadmin() OR is_manager_or_above(organisation_id));

-- habilitation_attributions
DROP POLICY IF EXISTS "hab_attr_select" ON habilitation_attributions;
CREATE POLICY "hab_attr_select" ON habilitation_attributions
  FOR SELECT USING (is_superadmin() OR user_is_in_org(organisation_id));

DROP POLICY IF EXISTS "hab_attr_insert" ON habilitation_attributions;
CREATE POLICY "hab_attr_insert" ON habilitation_attributions
  FOR INSERT WITH CHECK (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members
      WHERE user_id = auth.uid()
        AND organisation_id = habilitation_attributions.organisation_id
        AND role NOT IN ('reader', 'terrain')
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "hab_attr_update" ON habilitation_attributions;
CREATE POLICY "hab_attr_update" ON habilitation_attributions
  FOR UPDATE USING (is_superadmin() OR is_manager_or_above(organisation_id));

DROP POLICY IF EXISTS "hab_attr_delete" ON habilitation_attributions;
CREATE POLICY "hab_attr_delete" ON habilitation_attributions
  FOR DELETE USING (is_superadmin() OR is_manager_or_above(organisation_id));

-- ── 8. Cron : alertes EPI et habilitations expirées ──────────
-- Extension de la fonction notify-late-actions existante
-- Seuils : J-30 et J-7 pour contrôles EPI, J-60 et J-7 pour habilitations

CREATE OR REPLACE FUNCTION public.notify_epi_habilitation_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  -- ── EPI : alerte J-30 ──
  FOR rec IN
    SELECT ea.id, ea.organisation_id, ea.user_id, ea.next_control_date,
           ei.designation, ei.category
    FROM epi_attributions ea
    JOIN epi_items ei ON ei.id = ea.epi_item_id
    WHERE ea.is_active = true
      AND ea.next_control_date IS NOT NULL
      AND ea.next_control_date = CURRENT_DATE + INTERVAL '30 days'
  LOOP
    INSERT INTO notifications (organisation_id, user_id, type, title, body, entity_type, entity_id)
    VALUES (
      rec.organisation_id, rec.user_id,
      'warning',
      'Contrôle EPI dans 30 jours',
      'L''EPI "' || rec.designation || '" doit être contrôlé le ' || to_char(rec.next_control_date, 'DD/MM/YYYY') || '.',
      'epi_attribution', rec.id
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ── EPI : alerte J-7 ──
  FOR rec IN
    SELECT ea.id, ea.organisation_id, ea.user_id, ea.next_control_date,
           ei.designation
    FROM epi_attributions ea
    JOIN epi_items ei ON ei.id = ea.epi_item_id
    WHERE ea.is_active = true
      AND ea.next_control_date IS NOT NULL
      AND ea.next_control_date = CURRENT_DATE + INTERVAL '7 days'
  LOOP
    INSERT INTO notifications (organisation_id, user_id, type, title, body, entity_type, entity_id)
    VALUES (
      rec.organisation_id, rec.user_id,
      'danger',
      'Contrôle EPI urgent — J-7',
      'L''EPI "' || rec.designation || '" doit être contrôlé dans 7 jours (' || to_char(rec.next_control_date, 'DD/MM/YYYY') || ').',
      'epi_attribution', rec.id
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ── Habilitations : alerte J-60 ──
  FOR rec IN
    SELECT ha.id, ha.organisation_id, ha.user_id, ha.expires_at,
           h.label, h.code
    FROM habilitation_attributions ha
    JOIN habilitations h ON h.id = ha.habilitation_id
    WHERE ha.status = 'active'
      AND ha.expires_at IS NOT NULL
      AND ha.expires_at = CURRENT_DATE + INTERVAL '60 days'
  LOOP
    INSERT INTO notifications (organisation_id, user_id, type, title, body, entity_type, entity_id)
    VALUES (
      rec.organisation_id, rec.user_id,
      'warning',
      'Habilitation à renouveler dans 60 jours',
      'L''habilitation ' || rec.code || ' "' || rec.label || '" expire le ' || to_char(rec.expires_at, 'DD/MM/YYYY') || '.',
      'habilitation_attribution', rec.id
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ── Habilitations : alerte J-7 ──
  FOR rec IN
    SELECT ha.id, ha.organisation_id, ha.user_id, ha.expires_at,
           h.label, h.code
    FROM habilitation_attributions ha
    JOIN habilitations h ON h.id = ha.habilitation_id
    WHERE ha.status = 'active'
      AND ha.expires_at IS NOT NULL
      AND ha.expires_at = CURRENT_DATE + INTERVAL '7 days'
  LOOP
    INSERT INTO notifications (organisation_id, user_id, type, title, body, entity_type, entity_id)
    VALUES (
      rec.organisation_id, rec.user_id,
      'danger',
      'Habilitation expire dans 7 jours',
      'L''habilitation ' || rec.code || ' "' || rec.label || '" expire dans 7 jours (' || to_char(rec.expires_at, 'DD/MM/YYYY') || ').',
      'habilitation_attribution', rec.id
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ── Habilitations expirées aujourd'hui : passer en 'expired' ──
  UPDATE habilitation_attributions
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < CURRENT_DATE;

END;
$$;
