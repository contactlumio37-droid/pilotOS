-- =============================================================
-- PilotOS v0.5.0 — Migration 20260506003
-- Fix get_user_role : ORDER BY déterministe
-- ADDITIVE — remplace uniquement la fonction (CREATE OR REPLACE)
-- =============================================================

-- En cas de doublon de membership dans la même org (ex : invitation +
-- création manuelle), LIMIT 1 sans ORDER BY peut retourner le rôle
-- le plus bas. On trie par hiérarchie décroissante (admin > director > …)
-- pour garantir que le rôle le plus élevé est toujours retourné.

CREATE OR REPLACE FUNCTION get_user_role(org_id UUID)
RETURNS TEXT AS $$
  SELECT role
  FROM organisation_members
  WHERE user_id = auth.uid()
    AND organisation_id = org_id
    AND is_active = true
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
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Vérification (SQL Editor) :
-- SELECT proname, prosrc FROM pg_proc WHERE proname = 'get_user_role';
-- → prosrc doit contenir "ORDER BY CASE role"
