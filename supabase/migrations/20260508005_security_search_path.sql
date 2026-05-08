-- =============================================================
-- PilotOS — Migration 20260508005 : Security hardening
-- =============================================================
-- PROBLÈME : toutes les fonctions SECURITY DEFINER manquent de
-- SET search_path = public. Sans ce paramètre, PostgreSQL peut
-- résoudre les objets dans un search_path imprévu → comportement
-- indéterminé et potentielle faille de privilege escalation.
-- Le linter Supabase signale cela comme WARN/ERROR.
--
-- VUES : recent_activity, master_document_register, process_health
-- ne déclarent pas security_invoker = true → elles tournent avec
-- les droits du propriétaire de la vue (SECURITY DEFINER implicite),
-- court-circuitant le RLS de l'appelant.
--
-- FIX : ajouter SET search_path = public sur toutes les fonctions
-- SECURITY DEFINER, recréer les vues avec security_invoker = true.
-- =============================================================

-- ── 1. update_updated_at ─────────────────────────────────────
-- Trigger générique mis à jour de la colonne updated_at.
-- Défini à l'origine dans le schéma initial (non versionné).
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── 2. handle_new_user ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NULLIF(TRIM(COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      ''
    )), ''),
    NULLIF(TRIM(COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      ''
    )), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- ── 3. get_user_org_id ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organisation_id
  FROM organisation_members
  WHERE user_id   = auth.uid()
    AND is_active = true
  LIMIT 1;
$$;

-- ── 4. get_user_role ─────────────────────────────────────────
-- Version avec ORDER BY déterministe (retourne le rôle le plus élevé).
CREATE OR REPLACE FUNCTION public.get_user_role(org_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM organisation_members
  WHERE user_id         = auth.uid()
    AND organisation_id = org_id
    AND is_active       = true
  ORDER BY
    CASE role
      WHEN 'superadmin'  THEN 1
      WHEN 'admin'       THEN 2
      WHEN 'director'    THEN 3
      WHEN 'manager'     THEN 4
      WHEN 'contributor' THEN 5
      WHEN 'terrain'     THEN 6
      ELSE 99
    END
  LIMIT 1;
$$;

-- ── 5. is_superadmin ─────────────────────────────────────────
-- Source primaire : profiles.is_superadmin (résout BUG-001).
-- Fallback : membership role='superadmin' actif.
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_superadmin FROM profiles WHERE id = auth.uid()),
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE user_id    = auth.uid()
        AND role       = 'superadmin'
        AND is_active  = true
    )
  );
$$;

-- ── 6. is_manager_or_above ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_manager_or_above(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE user_id         = auth.uid()
      AND organisation_id = org_id
      AND role IN ('superadmin','admin','manager','director')
      AND is_active       = true
  );
$$;

-- ── 7. is_org_member ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE user_id         = auth.uid()
      AND organisation_id = org_id
      AND is_active       = true
  );
$$;

-- ── 8. can_see_item ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_see_item(
  org_id                  UUID,
  item_visibility         TEXT,
  item_visibility_user_ids UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  IF is_superadmin() THEN RETURN true; END IF;
  user_role := get_user_role(org_id);
  RETURN CASE item_visibility
    WHEN 'public'      THEN true
    WHEN 'managers'    THEN user_role IN ('admin','manager','director','superadmin')
    WHEN 'restricted'  THEN
      user_role IN ('admin','manager','director','superadmin')
      OR auth.uid() = ANY(item_visibility_user_ids)
    WHEN 'confidential' THEN auth.uid() = ANY(item_visibility_user_ids)
    ELSE false
  END;
END;
$$;

-- ── 9. update_late_actions ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_late_actions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE actions
  SET status = 'late'
  WHERE status IN ('todo','in_progress')
    AND due_date < CURRENT_DATE;
END;
$$;

-- ── 10. cleanup_expired_mfa_challenges ───────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_expired_mfa_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM mfa_challenges
  WHERE expires_at < now() - INTERVAL '1 hour';
END;
$$;

-- ── 11. user_is_in_org ────────────────────────────────────────
-- Utilisé par la policy members_org_member_read (migration 20260508004).
CREATE OR REPLACE FUNCTION public.user_is_in_org(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE user_id         = auth.uid()
      AND organisation_id = target_org_id
      AND is_active       = true
  );
$$;

-- ── 12. users_share_org ───────────────────────────────────────
-- Utilisé par la policy profiles_org_member_read (migration 20260508004).
CREATE OR REPLACE FUNCTION public.users_share_org(other_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organisation_members om1
    JOIN organisation_members om2 ON om1.organisation_id = om2.organisation_id
    WHERE om1.user_id   = auth.uid()
      AND om2.user_id   = other_user_id
      AND om1.is_active = true
  );
$$;

-- ── 13. check_action_late ────────────────────────────────────
-- Trigger function — pas SECURITY DEFINER mais search_path à fixer
-- pour cohérence et conformité linter.
CREATE OR REPLACE FUNCTION public.check_action_late()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.due_date IS NOT NULL
     AND NEW.due_date < CURRENT_DATE
     AND NEW.status NOT IN ('done', 'cancelled') THEN
    NEW.status := 'late';
  END IF;
  RETURN NEW;
END;
$$;

-- ── 14. Vues avec security_invoker = true ────────────────────
-- Sans security_invoker = true, une vue tourne avec les droits du
-- créateur (security definer implicite) et bypasse le RLS de l'appelant.

CREATE OR REPLACE VIEW public.recent_activity
WITH (security_invoker = true)
AS
SELECT
  'action'        AS entity_type,
  a.id            AS entity_id,
  a.organisation_id,
  a.title,
  a.status::text  AS status,
  a.created_at,
  a.responsible_id AS user_id,
  p.full_name     AS user_name,
  p.avatar_url    AS user_avatar
FROM actions a
LEFT JOIN profiles p ON p.id = a.responsible_id

UNION ALL

SELECT
  'document'       AS entity_type,
  d.id             AS entity_id,
  d.organisation_id,
  d.title,
  d.status::text   AS status,
  d.created_at,
  d.uploaded_by    AS user_id,
  p.full_name      AS user_name,
  p.avatar_url     AS user_avatar
FROM documents d
LEFT JOIN profiles p ON p.id = d.uploaded_by

UNION ALL

SELECT
  'terrain_report' AS entity_type,
  tr.id            AS entity_id,
  tr.organisation_id,
  tr.title,
  tr.status::text  AS status,
  tr.created_at,
  tr.reported_by   AS user_id,
  p.full_name      AS user_name,
  p.avatar_url     AS user_avatar
FROM terrain_reports tr
LEFT JOIN profiles p ON p.id = tr.reported_by

ORDER BY created_at DESC;

CREATE OR REPLACE VIEW public.master_document_register
WITH (security_invoker = true)
AS
SELECT
  d.doc_code,
  df.name          AS folder,
  d.title,
  d.doc_type,
  d.version_label,
  d.status,
  p.full_name      AS pilot,
  d.effective_date,
  d.expiry_date,
  d.source,
  d.organisation_id
FROM documents d
LEFT JOIN document_folders df ON d.folder_id   = df.id
LEFT JOIN profiles         p  ON d.redactor_id = p.id
WHERE d.is_master_document = true
  AND d.status = 'active'
ORDER BY df.name, d.title;

CREATE OR REPLACE VIEW public.process_health
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.organisation_id,
  p.title,
  GREATEST(0,
    100
    - (SELECT COUNT(*) FROM non_conformities nc
       WHERE nc.process_id = p.id AND nc.status != 'closed') * 10
    - (SELECT COUNT(*) FROM actions a
       WHERE a.process_id = p.id AND a.status = 'late') * 5
  ) AS health_score
FROM processes p;
