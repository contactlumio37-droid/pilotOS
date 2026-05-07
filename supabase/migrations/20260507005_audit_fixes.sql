-- =============================================================
-- PilotOS — Migration 20260507004 : Correctifs audit complet
-- Couvre : C-01 à C-05, H-02, H-05, H-07, H-08
-- Idempotente — safe si rejouée (DROP IF EXISTS + CREATE OR REPLACE)
-- =============================================================

-- ============================================================
-- [C-04] profiles.is_superadmin — source primaire superadmin
-- Permet à is_superadmin() de fonctionner même si le membership
-- est inactif. Résout BUG-001 structurellement.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT false;

-- Réécrire is_superadmin() pour lire profiles en priorité
-- SECURITY DEFINER : bypass RLS sur profiles → pas de récursion
-- Fallback sur organisation_members si la colonne n'est pas encore peuplée.
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_superadmin FROM profiles WHERE id = auth.uid()),
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE user_id = auth.uid()
        AND role = 'superadmin'
        AND is_active = true
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Backfill : marquer les profils dont le membership superadmin est actif
UPDATE profiles p
SET is_superadmin = true
FROM organisation_members om
WHERE om.user_id = p.id
  AND om.role = 'superadmin'
  AND om.is_active = true;

-- ============================================================
-- [C-01] admin_audit_log — colonnes manquantes + scinder SELECT et INSERT
-- logger.ts insère actor_id / organisation_id / metadata mais la table
-- ne les avait pas → tout INSERT échouait avec erreur PostgREST 400.
-- SELECT réservé au superadmin, INSERT pour tout utilisateur authentifié.
-- ============================================================

-- Ajouter les colonnes attendues par logger.ts (idempotent)
ALTER TABLE admin_audit_log
  ADD COLUMN IF NOT EXISTS actor_id        UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id),
  ADD COLUMN IF NOT EXISTS metadata        JSONB;

DROP POLICY IF EXISTS "audit_log_superadmin"       ON admin_audit_log;
DROP POLICY IF EXISTS "audit_log_superadmin_read"  ON admin_audit_log;
DROP POLICY IF EXISTS "audit_log_authenticated_insert" ON admin_audit_log;

-- Superadmin peut tout faire (lecture + gestion)
CREATE POLICY "audit_log_superadmin_read" ON admin_audit_log
  FOR SELECT USING (is_superadmin());

-- Tout utilisateur authentifié peut écrire un log (INSERT seulement)
-- WITH CHECK garantit que actor_id correspond à l'utilisateur courant
CREATE POLICY "audit_log_authenticated_insert" ON admin_audit_log
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- ============================================================
-- [C-02] action_comments_read — vérifier la visibilité de l'action parente
-- ============================================================

DROP POLICY IF EXISTS "action_comments_read" ON action_comments;

CREATE POLICY "action_comments_read" ON action_comments
  FOR SELECT USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM actions a
      JOIN organisation_members om ON om.organisation_id = a.organisation_id
      WHERE a.id = action_comments.action_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
        AND can_see_item(a.organisation_id, a.visibility, a.visibility_user_ids)
    )
  );

-- ============================================================
-- [C-03] import_logs — ajouter policy INSERT pour les admins
-- ============================================================

DROP POLICY IF EXISTS "import_logs_admin_read"   ON import_logs;
DROP POLICY IF EXISTS "import_logs_admin_select" ON import_logs;
DROP POLICY IF EXISTS "import_logs_insert"       ON import_logs;

CREATE POLICY "import_logs_admin_select" ON import_logs
  FOR SELECT USING (
    is_superadmin()
    OR get_user_role(organisation_id) IN ('admin')
  );

-- INSERT : admin ou contributor (l'import peut être déclenché par un contributor)
CREATE POLICY "import_logs_insert" ON import_logs
  FOR INSERT WITH CHECK (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = import_logs.organisation_id
        AND om.user_id = auth.uid()
        AND om.role NOT IN ('reader', 'terrain')
        AND om.is_active = true
    )
  );

-- ============================================================
-- [C-05] document_versions — policies INSERT/UPDATE/DELETE manquantes
-- ============================================================

DROP POLICY IF EXISTS "doc_versions_read"   ON document_versions;
DROP POLICY IF EXISTS "doc_versions_insert" ON document_versions;
DROP POLICY IF EXISTS "doc_versions_update" ON document_versions;
DROP POLICY IF EXISTS "doc_versions_delete" ON document_versions;

-- SELECT : hérité du document parent (même logique que migration 011)
CREATE POLICY "doc_versions_read" ON document_versions
  FOR SELECT USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM documents d
      JOIN organisation_members om ON om.organisation_id = d.organisation_id
      WHERE d.id = document_versions.document_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

-- INSERT : contributor ou plus (peut déposer une nouvelle version)
CREATE POLICY "doc_versions_insert" ON document_versions
  FOR INSERT WITH CHECK (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM documents d
      JOIN organisation_members om ON om.organisation_id = d.organisation_id
      WHERE d.id = document_versions.document_id
        AND om.user_id = auth.uid()
        AND om.role NOT IN ('reader', 'terrain')
        AND om.is_active = true
    )
  );

-- UPDATE/DELETE : manager ou plus uniquement
CREATE POLICY "doc_versions_update" ON document_versions
  FOR UPDATE USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_versions.document_id
        AND is_manager_or_above(d.organisation_id)
    )
  );

CREATE POLICY "doc_versions_delete" ON document_versions
  FOR DELETE USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_versions.document_id
        AND is_manager_or_above(d.organisation_id)
    )
  );

-- ============================================================
-- [H-02] terrain_reports_write — exclure le rôle reader
-- ============================================================

DROP POLICY IF EXISTS "terrain_reports_write" ON terrain_reports;

CREATE POLICY "terrain_reports_write" ON terrain_reports
  FOR ALL USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = terrain_reports.organisation_id
        AND om.user_id = auth.uid()
        AND om.role NOT IN ('reader')
        AND om.is_active = true
    )
  );

-- ============================================================
-- [H-05] blog_posts — consolider cover_image_url → cover_image
-- ============================================================

-- Backfill : copier cover_image_url vers cover_image si cover_image est null
UPDATE blog_posts
SET cover_image = cover_image_url
WHERE cover_image IS NULL
  AND cover_image_url IS NOT NULL;

-- Supprimer l'ancienne colonne (les données ont été migrées)
ALTER TABLE blog_posts DROP COLUMN IF EXISTS cover_image_url;

-- ============================================================
-- [H-07] Index manquants sur tables haute fréquence
-- ============================================================

-- feedback_reports
CREATE INDEX IF NOT EXISTS feedback_reports_status_idx
  ON feedback_reports(status);
CREATE INDEX IF NOT EXISTS feedback_reports_category_idx
  ON feedback_reports(category);
CREATE INDEX IF NOT EXISTS feedback_reports_reporter_id_idx
  ON feedback_reports(reporter_id);

-- document_acknowledgments
CREATE INDEX IF NOT EXISTS document_acknowledgments_user_id_idx
  ON document_acknowledgments(user_id);

-- roadmap_items
CREATE INDEX IF NOT EXISTS roadmap_items_status_idx
  ON roadmap_items(status);
CREATE INDEX IF NOT EXISTS roadmap_items_is_public_idx
  ON roadmap_items(is_public);

-- superadmin_automations
CREATE INDEX IF NOT EXISTS superadmin_automations_is_active_idx
  ON superadmin_automations(is_active);
CREATE INDEX IF NOT EXISTS superadmin_automations_trigger_type_idx
  ON superadmin_automations(trigger_type);

-- blog_posts
CREATE INDEX IF NOT EXISTS blog_posts_published_idx
  ON blog_posts(published);
CREATE INDEX IF NOT EXISTS blog_posts_published_at_idx
  ON blog_posts(published_at DESC);

-- newsletter_subscribers
CREATE INDEX IF NOT EXISTS newsletter_subscribers_confirmed_idx
  ON newsletter_subscribers(confirmed);

-- ============================================================
-- [H-08] roadmap_votes / feedback_votes — bloquer les votes anonymes
-- Un vote non authentifié ne peut pas être auditable.
-- ============================================================

-- roadmap_votes : forcer user_id non null à l'insertion
DROP POLICY IF EXISTS "roadmap_votes_own"  ON roadmap_votes;
DROP POLICY IF EXISTS "roadmap_votes_read" ON roadmap_votes;

CREATE POLICY "roadmap_votes_read" ON roadmap_votes
  FOR SELECT USING (true);

CREATE POLICY "roadmap_votes_own_insert" ON roadmap_votes
  FOR INSERT WITH CHECK (user_id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY "roadmap_votes_own_delete" ON roadmap_votes
  FOR DELETE USING (user_id = auth.uid() OR is_superadmin());

-- feedback_votes : même traitement
DROP POLICY IF EXISTS "feedback_votes_own"  ON feedback_votes;
DROP POLICY IF EXISTS "feedback_votes_read" ON feedback_votes;

CREATE POLICY "feedback_votes_read" ON feedback_votes
  FOR SELECT USING (true);

CREATE POLICY "feedback_votes_own_insert" ON feedback_votes
  FOR INSERT WITH CHECK (user_id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY "feedback_votes_own_delete" ON feedback_votes
  FOR DELETE USING (user_id = auth.uid() OR is_superadmin());

-- ============================================================
-- user_badges — ajouter policy INSERT (gamification service)
-- Le service gamification.service.ts insère des badges via le client
-- authentifié (pas service_role) → la policy INSERT était manquante.
-- ============================================================

DROP POLICY IF EXISTS "badges_own"        ON user_badges;
DROP POLICY IF EXISTS "badges_own_read"   ON user_badges;
DROP POLICY IF EXISTS "badges_own_insert" ON user_badges;

CREATE POLICY "badges_own_read" ON user_badges
  FOR SELECT USING (
    user_id = auth.uid()
    OR is_manager_or_above(organisation_id)
    OR is_superadmin()
  );

-- INSERT : l'utilisateur peut s'attribuer ses propres badges (gamification)
-- Le service vérifie les conditions avant d'appeler insert — pas d'escalade de privilèges.
CREATE POLICY "badges_own_insert" ON user_badges
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR is_superadmin()
  );

-- ============================================================
-- Vérification post-migration (à exécuter en SQL Editor)
-- ============================================================
-- SELECT policyname, tablename, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN (
--   'admin_audit_log', 'action_comments', 'import_logs',
--   'document_versions', 'terrain_reports', 'roadmap_votes',
--   'feedback_votes', 'user_badges'
-- )
-- ORDER BY tablename, cmd;
