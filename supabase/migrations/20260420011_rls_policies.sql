-- PilotOS — Migration 011 : Row Level Security — Toutes les politiques
-- Principe : un utilisateur ne voit que les données de son organisation
-- Un élément confidentiel n'existe pas — zéro trace côté requête

-- ============================================================
-- Helper : récupérer l'organisation_id et le rôle de l'utilisateur courant
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organisation_id
  FROM organisation_members
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_role(org_id UUID)
RETURNS TEXT AS $$
  SELECT role
  FROM organisation_members
  WHERE user_id = auth.uid()
    AND organisation_id = org_id
    AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE user_id = auth.uid()
      AND role = 'superadmin'
      AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_manager_or_above(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE user_id = auth.uid()
      AND organisation_id = org_id
      AND role IN ('superadmin','admin','manager','director')
      AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Visibilité : filtre selon le niveau de confidentialité
CREATE OR REPLACE FUNCTION can_see_item(
  org_id UUID,
  item_visibility TEXT,
  item_visibility_user_ids UUID[]
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Superadmin voit tout
  IF is_superadmin() THEN RETURN true; END IF;

  user_role := get_user_role(org_id);

  RETURN CASE item_visibility
    WHEN 'public' THEN true
    WHEN 'managers' THEN user_role IN ('admin','manager','director','superadmin')
    WHEN 'restricted' THEN
      user_role IN ('admin','manager','director','superadmin')
      OR auth.uid() = ANY(item_visibility_user_ids)
    WHEN 'confidential' THEN auth.uid() = ANY(item_visibility_user_ids)
    ELSE false
  END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- Ensure visibility columns exist on all content tables
-- (idempotent — no-op if columns already present)
-- ============================================================
ALTER TABLE IF EXISTS strategic_objectives  ADD COLUMN IF NOT EXISTS visibility          TEXT NOT NULL DEFAULT 'public';
ALTER TABLE IF EXISTS strategic_objectives  ADD COLUMN IF NOT EXISTS visibility_user_ids  UUID[] DEFAULT '{}';
ALTER TABLE IF EXISTS codir_decisions       ADD COLUMN IF NOT EXISTS visibility          TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE IF EXISTS codir_decisions       ADD COLUMN IF NOT EXISTS visibility_user_ids  UUID[] DEFAULT '{}';
ALTER TABLE IF EXISTS projects              ADD COLUMN IF NOT EXISTS visibility          TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE IF EXISTS projects              ADD COLUMN IF NOT EXISTS visibility_user_ids  UUID[] DEFAULT '{}';
ALTER TABLE IF EXISTS processes             ADD COLUMN IF NOT EXISTS visibility          TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE IF EXISTS processes             ADD COLUMN IF NOT EXISTS visibility_user_ids  UUID[] DEFAULT '{}';
ALTER TABLE IF EXISTS actions               ADD COLUMN IF NOT EXISTS visibility          TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE IF EXISTS actions               ADD COLUMN IF NOT EXISTS visibility_user_ids  UUID[] DEFAULT '{}';
ALTER TABLE IF EXISTS indicators            ADD COLUMN IF NOT EXISTS visibility          TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE IF EXISTS indicators            ADD COLUMN IF NOT EXISTS visibility_user_ids  UUID[] DEFAULT '{}';
ALTER TABLE IF EXISTS documents             ADD COLUMN IF NOT EXISTS visibility          TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE IF EXISTS documents             ADD COLUMN IF NOT EXISTS visibility_user_ids  UUID[] DEFAULT '{}';

-- ============================================================
-- Organisations
-- ============================================================
DROP POLICY IF EXISTS "organisations_member_read" ON organisations;
CREATE POLICY "organisations_member_read" ON organisations
  FOR SELECT USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

DROP POLICY IF EXISTS "organisations_admin_update" ON organisations;
CREATE POLICY "organisations_admin_update" ON organisations
  FOR UPDATE USING (
    is_superadmin()
    OR get_user_role(id) IN ('admin')
  );

-- ============================================================
-- Sites
-- ============================================================
DROP POLICY IF EXISTS "sites_member_read" ON sites;
CREATE POLICY "sites_member_read" ON sites
  FOR SELECT USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = sites.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

DROP POLICY IF EXISTS "sites_admin_write" ON sites;
CREATE POLICY "sites_admin_write" ON sites
  FOR ALL USING (
    is_superadmin()
    OR get_user_role(organisation_id) IN ('admin')
  );

-- ============================================================
-- Profils
-- ============================================================
DROP POLICY IF EXISTS "profiles_own_read_update" ON profiles;
CREATE POLICY "profiles_own_read_update" ON profiles
  FOR ALL USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_org_member_read" ON profiles;
CREATE POLICY "profiles_org_member_read" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organisation_members om1
      JOIN organisation_members om2 ON om1.organisation_id = om2.organisation_id
      WHERE om1.user_id = auth.uid()
        AND om2.user_id = profiles.id
        AND om1.is_active = true
    )
  );

-- ============================================================
-- Membres organisation
-- ============================================================
DROP POLICY IF EXISTS "members_own_read" ON organisation_members;
CREATE POLICY "members_own_read" ON organisation_members
  FOR SELECT USING (user_id = auth.uid() OR is_superadmin());

DROP POLICY IF EXISTS "members_org_manager_read" ON organisation_members;
CREATE POLICY "members_org_manager_read" ON organisation_members
  FOR SELECT USING (
    is_manager_or_above(organisation_id)
  );

DROP POLICY IF EXISTS "members_admin_write" ON organisation_members;
CREATE POLICY "members_admin_write" ON organisation_members
  FOR ALL USING (
    is_superadmin()
    OR get_user_role(organisation_id) IN ('admin')
  );

-- ============================================================
-- Module access
-- ============================================================
DROP POLICY IF EXISTS "module_access_member_read" ON module_access;
CREATE POLICY "module_access_member_read" ON module_access
  FOR SELECT USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = module_access.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

DROP POLICY IF EXISTS "module_access_superadmin_write" ON module_access;
CREATE POLICY "module_access_superadmin_write" ON module_access
  FOR ALL USING (is_superadmin());

-- ============================================================
-- Objectifs stratégiques
-- ============================================================
DROP POLICY IF EXISTS "objectives_read" ON strategic_objectives;
CREATE POLICY "objectives_read" ON strategic_objectives
  FOR SELECT USING (
    is_superadmin()
    OR (
      EXISTS (
        SELECT 1 FROM organisation_members om
        WHERE om.organisation_id = strategic_objectives.organisation_id
          AND om.user_id = auth.uid()
          AND om.is_active = true
      )
      AND can_see_item(organisation_id, visibility, visibility_user_ids)
    )
  );

DROP POLICY IF EXISTS "objectives_manager_write" ON strategic_objectives;
CREATE POLICY "objectives_manager_write" ON strategic_objectives
  FOR ALL USING (
    is_superadmin()
    OR is_manager_or_above(organisation_id)
  );

-- ============================================================
-- Décisions CODIR
-- ============================================================
DROP POLICY IF EXISTS "codir_decisions_read" ON codir_decisions;
CREATE POLICY "codir_decisions_read" ON codir_decisions
  FOR SELECT USING (
    is_superadmin()
    OR (
      EXISTS (
        SELECT 1 FROM organisation_members om
        WHERE om.organisation_id = codir_decisions.organisation_id
          AND om.user_id = auth.uid()
          AND om.is_active = true
      )
      AND can_see_item(organisation_id, visibility, visibility_user_ids)
    )
  );

DROP POLICY IF EXISTS "codir_decisions_director_write" ON codir_decisions;
CREATE POLICY "codir_decisions_director_write" ON codir_decisions
  FOR ALL USING (
    is_superadmin()
    OR get_user_role(organisation_id) IN ('admin','director')
  );

-- ============================================================
-- Projets
-- ============================================================
DROP POLICY IF EXISTS "projects_read" ON projects;
CREATE POLICY "projects_read" ON projects
  FOR SELECT USING (
    is_superadmin()
    OR (
      EXISTS (
        SELECT 1 FROM organisation_members om
        WHERE om.organisation_id = projects.organisation_id
          AND om.user_id = auth.uid()
          AND om.is_active = true
      )
      AND can_see_item(organisation_id, visibility, visibility_user_ids)
    )
  );

DROP POLICY IF EXISTS "projects_manager_write" ON projects;
CREATE POLICY "projects_manager_write" ON projects
  FOR ALL USING (
    is_superadmin()
    OR is_manager_or_above(organisation_id)
  );

-- ============================================================
-- Processus
-- ============================================================
DROP POLICY IF EXISTS "processes_read" ON processes;
CREATE POLICY "processes_read" ON processes
  FOR SELECT USING (
    is_superadmin()
    OR (
      EXISTS (
        SELECT 1 FROM organisation_members om
        WHERE om.organisation_id = processes.organisation_id
          AND om.user_id = auth.uid()
          AND om.is_active = true
      )
      AND can_see_item(organisation_id, visibility, visibility_user_ids)
    )
  );

DROP POLICY IF EXISTS "processes_manager_write" ON processes;
CREATE POLICY "processes_manager_write" ON processes
  FOR ALL USING (
    is_superadmin()
    OR is_manager_or_above(organisation_id)
  );

-- ============================================================
-- Revues de processus
-- ============================================================
DROP POLICY IF EXISTS "process_reviews_read" ON process_reviews;
CREATE POLICY "process_reviews_read" ON process_reviews
  FOR SELECT USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = process_reviews.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

DROP POLICY IF EXISTS "process_reviews_manager_write" ON process_reviews;
CREATE POLICY "process_reviews_manager_write" ON process_reviews
  FOR ALL USING (
    is_superadmin()
    OR is_manager_or_above(organisation_id)
  );

-- ============================================================
-- Non-conformités
-- ============================================================
DROP POLICY IF EXISTS "nc_member_read" ON non_conformities;
CREATE POLICY "nc_member_read" ON non_conformities
  FOR SELECT USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = non_conformities.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

DROP POLICY IF EXISTS "nc_contributor_write" ON non_conformities;
CREATE POLICY "nc_contributor_write" ON non_conformities
  FOR ALL USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = non_conformities.organisation_id
        AND om.user_id = auth.uid()
        AND om.role NOT IN ('reader','terrain')
        AND om.is_active = true
    )
  );

-- ============================================================
-- Kaizen
-- ============================================================
DROP POLICY IF EXISTS "kaizen_member_read" ON kaizen_plans;
CREATE POLICY "kaizen_member_read" ON kaizen_plans
  FOR SELECT USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = kaizen_plans.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

DROP POLICY IF EXISTS "kaizen_manager_write" ON kaizen_plans;
CREATE POLICY "kaizen_manager_write" ON kaizen_plans
  FOR ALL USING (
    is_superadmin()
    OR is_manager_or_above(organisation_id)
  );

-- ============================================================
-- Actions
-- ============================================================
DROP POLICY IF EXISTS "actions_read" ON actions;
CREATE POLICY "actions_read" ON actions
  FOR SELECT USING (
    is_superadmin()
    OR (
      EXISTS (
        SELECT 1 FROM organisation_members om
        WHERE om.organisation_id = actions.organisation_id
          AND om.user_id = auth.uid()
          AND om.is_active = true
      )
      AND can_see_item(organisation_id, visibility, visibility_user_ids)
    )
  );

DROP POLICY IF EXISTS "actions_write" ON actions;
CREATE POLICY "actions_write" ON actions
  FOR ALL USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = actions.organisation_id
        AND om.user_id = auth.uid()
        AND om.role NOT IN ('reader')
        AND om.is_active = true
    )
  );

-- ============================================================
-- Commentaires actions
-- ============================================================
DROP POLICY IF EXISTS "action_comments_read" ON action_comments;
CREATE POLICY "action_comments_read" ON action_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM actions a
      JOIN organisation_members om ON om.organisation_id = a.organisation_id
      WHERE a.id = action_comments.action_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

DROP POLICY IF EXISTS "action_comments_own_write" ON action_comments;
CREATE POLICY "action_comments_own_write" ON action_comments
  FOR ALL USING (user_id = auth.uid() OR is_superadmin());

-- ============================================================
-- Signalements terrain
-- ============================================================
DROP POLICY IF EXISTS "terrain_reports_read" ON terrain_reports;
CREATE POLICY "terrain_reports_read" ON terrain_reports
  FOR SELECT USING (
    is_superadmin()
    OR (
      EXISTS (
        SELECT 1 FROM organisation_members om
        WHERE om.organisation_id = terrain_reports.organisation_id
          AND om.user_id = auth.uid()
          AND om.is_active = true
      )
      AND (
        reported_by = auth.uid()
        OR is_manager_or_above(organisation_id)
      )
    )
  );

DROP POLICY IF EXISTS "terrain_reports_write" ON terrain_reports;
CREATE POLICY "terrain_reports_write" ON terrain_reports
  FOR ALL USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = terrain_reports.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

-- ============================================================
-- Indicateurs
-- ============================================================
DROP POLICY IF EXISTS "indicators_read" ON indicators;
CREATE POLICY "indicators_read" ON indicators
  FOR SELECT USING (
    is_superadmin()
    OR (
      EXISTS (
        SELECT 1 FROM organisation_members om
        WHERE om.organisation_id = indicators.organisation_id
          AND om.user_id = auth.uid()
          AND om.is_active = true
      )
      AND can_see_item(organisation_id, visibility, visibility_user_ids)
    )
  );

DROP POLICY IF EXISTS "indicators_manager_write" ON indicators;
CREATE POLICY "indicators_manager_write" ON indicators
  FOR ALL USING (
    is_superadmin()
    OR is_manager_or_above(organisation_id)
  );

-- ============================================================
-- Valeurs indicateurs
-- ============================================================
DROP POLICY IF EXISTS "indicator_values_read" ON indicator_values;
CREATE POLICY "indicator_values_read" ON indicator_values
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM indicators i
      JOIN organisation_members om ON om.organisation_id = i.organisation_id
      WHERE i.id = indicator_values.indicator_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

DROP POLICY IF EXISTS "indicator_values_write" ON indicator_values;
CREATE POLICY "indicator_values_write" ON indicator_values
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM indicators i
      JOIN organisation_members om ON om.organisation_id = i.organisation_id
      WHERE i.id = indicator_values.indicator_id
        AND om.user_id = auth.uid()
        AND om.role NOT IN ('reader','terrain')
        AND om.is_active = true
    )
  );

-- ============================================================
-- GED : dossiers
-- ============================================================
DROP POLICY IF EXISTS "folders_member_read" ON document_folders;
CREATE POLICY "folders_member_read" ON document_folders
  FOR SELECT USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = document_folders.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

DROP POLICY IF EXISTS "folders_manager_write" ON document_folders;
CREATE POLICY "folders_manager_write" ON document_folders
  FOR ALL USING (
    is_superadmin()
    OR is_manager_or_above(organisation_id)
  );

-- ============================================================
-- GED : documents
-- ============================================================
DROP POLICY IF EXISTS "documents_read" ON documents;
CREATE POLICY "documents_read" ON documents
  FOR SELECT USING (
    is_superadmin()
    OR (
      EXISTS (
        SELECT 1 FROM organisation_members om
        WHERE om.organisation_id = documents.organisation_id
          AND om.user_id = auth.uid()
          AND om.is_active = true
      )
      AND can_see_item(organisation_id, visibility, visibility_user_ids)
    )
  );

DROP POLICY IF EXISTS "documents_write" ON documents;
CREATE POLICY "documents_write" ON documents
  FOR ALL USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = documents.organisation_id
        AND om.user_id = auth.uid()
        AND om.role NOT IN ('reader','terrain')
        AND om.is_active = true
    )
  );

-- ============================================================
-- GED : versions et émargements
-- ============================================================
DROP POLICY IF EXISTS "doc_versions_read" ON document_versions;
CREATE POLICY "doc_versions_read" ON document_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN organisation_members om ON om.organisation_id = d.organisation_id
      WHERE d.id = document_versions.document_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

DROP POLICY IF EXISTS "doc_acknowledgments_own" ON document_acknowledgments;
CREATE POLICY "doc_acknowledgments_own" ON document_acknowledgments
  FOR ALL USING (user_id = auth.uid() OR is_superadmin());

DROP POLICY IF EXISTS "doc_acknowledgments_manager_read" ON document_acknowledgments;
CREATE POLICY "doc_acknowledgments_manager_read" ON document_acknowledgments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN organisation_members om ON om.organisation_id = d.organisation_id
      WHERE d.id = document_acknowledgments.document_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin','manager','director','superadmin')
        AND om.is_active = true
    )
  );

-- ============================================================
-- Subscriptions
-- ============================================================
DROP POLICY IF EXISTS "subscriptions_own_org_read" ON subscriptions;
CREATE POLICY "subscriptions_own_org_read" ON subscriptions
  FOR SELECT USING (
    is_superadmin()
    OR get_user_role(organisation_id) IN ('admin')
  );

DROP POLICY IF EXISTS "subscriptions_superadmin_write" ON subscriptions;
CREATE POLICY "subscriptions_superadmin_write" ON subscriptions
  FOR ALL USING (is_superadmin());

-- ============================================================
-- Stripe events — superadmin uniquement
-- ============================================================
DROP POLICY IF EXISTS "stripe_events_superadmin" ON stripe_events;
CREATE POLICY "stripe_events_superadmin" ON stripe_events
  FOR ALL USING (is_superadmin());

-- ============================================================
-- Import logs
-- ============================================================
DROP POLICY IF EXISTS "import_logs_admin_read" ON import_logs;
CREATE POLICY "import_logs_admin_read" ON import_logs
  FOR SELECT USING (
    is_superadmin()
    OR get_user_role(organisation_id) IN ('admin')
  );

-- ============================================================
-- Gamification
-- ============================================================
DROP POLICY IF EXISTS "streaks_own" ON user_streaks;
CREATE POLICY "streaks_own" ON user_streaks
  FOR ALL USING (user_id = auth.uid() OR is_superadmin());

DROP POLICY IF EXISTS "badges_own" ON user_badges;
CREATE POLICY "badges_own" ON user_badges
  FOR SELECT USING (
    user_id = auth.uid()
    OR is_manager_or_above(organisation_id)
    OR is_superadmin()
  );

-- ============================================================
-- Notifications
-- ============================================================
DROP POLICY IF EXISTS "notifications_own" ON notifications;
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- Admin audit log — superadmin uniquement
-- ============================================================
DROP POLICY IF EXISTS "audit_log_superadmin" ON admin_audit_log;
CREATE POLICY "audit_log_superadmin" ON admin_audit_log
  FOR ALL USING (is_superadmin());

-- ============================================================
-- AI usage
-- ============================================================
DROP POLICY IF EXISTS "ai_usage_admin_read" ON ai_usage;
CREATE POLICY "ai_usage_admin_read" ON ai_usage
  FOR SELECT USING (
    is_superadmin()
    OR (user_id = auth.uid())
    OR get_user_role(organisation_id) IN ('admin')
  );

DROP POLICY IF EXISTS "ai_usage_write" ON ai_usage;
CREATE POLICY "ai_usage_write" ON ai_usage
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = ai_usage.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

-- ============================================================
-- Newsletter (insertion publique, lecture superadmin)
-- ============================================================
DROP POLICY IF EXISTS "newsletter_insert_public" ON newsletter_subscribers;
CREATE POLICY "newsletter_insert_public" ON newsletter_subscribers
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "newsletter_superadmin_read" ON newsletter_subscribers;
CREATE POLICY "newsletter_superadmin_read" ON newsletter_subscribers
  FOR SELECT USING (is_superadmin());

-- ============================================================
-- Email logs — superadmin
-- ============================================================
DROP POLICY IF EXISTS "email_logs_superadmin" ON email_logs;
CREATE POLICY "email_logs_superadmin" ON email_logs
  FOR ALL USING (is_superadmin());

-- ============================================================
-- Roadmap votes
-- ============================================================
DROP POLICY IF EXISTS "roadmap_votes_own" ON roadmap_votes;
CREATE POLICY "roadmap_votes_own" ON roadmap_votes
  FOR ALL USING (user_id = auth.uid() OR is_superadmin());

DROP POLICY IF EXISTS "roadmap_votes_read" ON roadmap_votes;
CREATE POLICY "roadmap_votes_read" ON roadmap_votes
  FOR SELECT USING (true);

-- ============================================================
-- Feedback reports (rapports publics + propres)
-- ============================================================
DROP POLICY IF EXISTS "feedback_reports_read" ON feedback_reports;
CREATE POLICY "feedback_reports_read" ON feedback_reports
  FOR SELECT USING (
    is_superadmin()
    OR reporter_id = auth.uid()
    OR (is_anonymous = false AND status NOT IN ('wont_fix'))
  );

DROP POLICY IF EXISTS "feedback_reports_insert" ON feedback_reports;
CREATE POLICY "feedback_reports_insert" ON feedback_reports
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "feedback_reports_superadmin_write" ON feedback_reports;
CREATE POLICY "feedback_reports_superadmin_write" ON feedback_reports
  FOR UPDATE USING (is_superadmin());

-- ============================================================
-- Feedback votes et abonnés
-- ============================================================
DROP POLICY IF EXISTS "feedback_votes_own" ON feedback_votes;
CREATE POLICY "feedback_votes_own" ON feedback_votes
  FOR ALL USING (user_id = auth.uid() OR is_superadmin());

DROP POLICY IF EXISTS "feedback_votes_read" ON feedback_votes;
CREATE POLICY "feedback_votes_read" ON feedback_votes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "feedback_subscribers_own" ON feedback_subscribers;
CREATE POLICY "feedback_subscribers_own" ON feedback_subscribers
  FOR ALL USING (user_id = auth.uid() OR is_superadmin());

-- ============================================================
-- Bounty pledges
-- ============================================================
DROP POLICY IF EXISTS "bounty_pledges_own_read" ON bounty_pledges;
CREATE POLICY "bounty_pledges_own_read" ON bounty_pledges
  FOR SELECT USING (
    is_superadmin()
    OR get_user_role(organisation_id) IN ('admin')
  );

-- ============================================================
-- Site sections — écriture superadmin uniquement
-- ============================================================
DROP POLICY IF EXISTS "site_sections_superadmin_write" ON site_sections;
CREATE POLICY "site_sections_superadmin_write" ON site_sections
  FOR ALL USING (is_superadmin());

-- Blog — écriture superadmin uniquement
DROP POLICY IF EXISTS "blog_posts_superadmin_write" ON blog_posts;
CREATE POLICY "blog_posts_superadmin_write" ON blog_posts
  FOR ALL USING (is_superadmin());
