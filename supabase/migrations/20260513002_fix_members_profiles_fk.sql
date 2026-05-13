-- =============================================================
-- PilotOS — Migration 20260513002 : FK organisation_members → profiles
-- =============================================================
-- CAUSE : organisation_members.user_id référence auth.users(id) mais
-- PAS profiles(id). PostgREST ne peut pas résoudre le join automatique
-- `.select('*, profile:profiles(*)')` sans FK directe → résultat vide
-- silencieux. AdminMembers, MembersPage et RACI affichent 0 membres.
--
-- FIX : ajouter une FK de user_id → profiles(id).
-- La contrainte est DEFERRABLE pour gérer l'ordre de création
-- (profile créé dans le trigger AFTER INSERT sur auth.users).
--
-- Pré-condition : tous les user_id dans organisation_members doivent
-- avoir un profil. Le trigger handle_new_user() garantit cela depuis
-- la migration 015. Un backfill de sécurité est inclus.
-- =============================================================

-- ── 0. Backfill de sécurité : créer les profils manquants ────
-- Pour les comptes créés avant le trigger robuste (migration 015)
INSERT INTO profiles (id, full_name, avatar_url)
SELECT DISTINCT om.user_id, NULL, NULL
FROM organisation_members om
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = om.user_id
)
ON CONFLICT (id) DO NOTHING;

-- ── 1. Ajout de la FK vers profiles ──────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_org_members_profiles'
      AND conrelid = 'organisation_members'::regclass
  ) THEN
    ALTER TABLE organisation_members
      ADD CONSTRAINT fk_org_members_profiles
      FOREIGN KEY (user_id) REFERENCES profiles(id)
      ON DELETE CASCADE
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END;
$$;
