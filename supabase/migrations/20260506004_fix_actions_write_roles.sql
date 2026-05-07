-- =============================================================
-- PilotOS — Migration 20260506004
-- Granular RLS : actions INSERT/UPDATE/DELETE par rôle
-- + restriction commentaires (pas terrain)
-- ADDITIVE — DROP POLICY IF EXISTS + CREATE (idempotent)
-- =============================================================

-- ── Actions ───────────────────────────────────────────────────
-- Ancienne policy "FOR ALL" trop large (terrain pouvait écrire).
-- On la remplace par 3 policies granulaires.

DROP POLICY IF EXISTS "actions_write"  ON actions;
DROP POLICY IF EXISTS "actions_insert" ON actions;
DROP POLICY IF EXISTS "actions_update" ON actions;
DROP POLICY IF EXISTS "actions_delete" ON actions;

-- INSERT : contributor ou plus (pas terrain, pas reader)
CREATE POLICY "actions_insert" ON actions
  FOR INSERT WITH CHECK (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = actions.organisation_id
        AND om.user_id = auth.uid()
        AND om.role NOT IN ('reader', 'terrain')
        AND om.is_active = true
    )
  );

-- UPDATE : ses propres actions (contributor+, pas terrain)
--          OU toutes les actions (manager+)
CREATE POLICY "actions_update" ON actions
  FOR UPDATE USING (
    is_superadmin()
    OR is_manager_or_above(organisation_id)
    OR (
      created_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM organisation_members om
        WHERE om.organisation_id = actions.organisation_id
          AND om.user_id = auth.uid()
          AND om.role NOT IN ('reader', 'terrain')
          AND om.is_active = true
      )
    )
  );

-- DELETE : manager+ uniquement
CREATE POLICY "actions_delete" ON actions
  FOR DELETE USING (
    is_superadmin()
    OR is_manager_or_above(organisation_id)
  );

-- ── Commentaires d'actions ────────────────────────────────────
-- Ancienne policy "FOR ALL USING (user_id = auth.uid())" laissait
-- terrain commenter. On distingue INSERT (contributor+) de la
-- gestion de ses propres commentaires (UPDATE/DELETE, tout rôle).

DROP POLICY IF EXISTS "action_comments_own_write"  ON action_comments;
DROP POLICY IF EXISTS "action_comments_insert"     ON action_comments;
DROP POLICY IF EXISTS "action_comments_modify_own" ON action_comments;
DROP POLICY IF EXISTS "action_comments_delete_own" ON action_comments;

-- INSERT : contributor ou plus (pas terrain, pas reader)
CREATE POLICY "action_comments_insert" ON action_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (
      is_superadmin()
      OR EXISTS (
        SELECT 1 FROM actions a
        JOIN organisation_members om ON om.organisation_id = a.organisation_id
        WHERE a.id = action_comments.action_id
          AND om.user_id = auth.uid()
          AND om.role NOT IN ('reader', 'terrain')
          AND om.is_active = true
      )
    )
  );

-- UPDATE / DELETE : ses propres commentaires (tout rôle ayant posté)
CREATE POLICY "action_comments_modify_own" ON action_comments
  FOR UPDATE USING (user_id = auth.uid() OR is_superadmin());

CREATE POLICY "action_comments_delete_own" ON action_comments
  FOR DELETE USING (user_id = auth.uid() OR is_superadmin());

-- ── Vérification post-migration ───────────────────────────────
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('actions','action_comments')
-- ORDER BY tablename, cmd;
-- → actions doit avoir 3 lignes (INSERT/UPDATE/DELETE) + la SELECT existante
-- → action_comments doit avoir INSERT + UPDATE + DELETE + la SELECT existante
