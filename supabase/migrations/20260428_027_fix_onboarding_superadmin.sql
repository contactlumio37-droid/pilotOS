-- Migration 20260428_027 : Fix onboarding superadmin
-- Garantit que le superadmin Yann L. a toujours une ligne active dans
-- organisation_members. La migration 20260426001 faisait un UPDATE seul :
-- si la ligne n'existait pas (reset partiel), l'UPDATE était un no-op
-- et le superadmin se retrouvait sans rôle → redirigé vers /onboarding.
--
-- Fix : INSERT INTO ... ON CONFLICT DO UPDATE (upsert idempotent).
-- Si aucune organisation n'existe encore, la ligne n'est pas insérée
-- (la contrainte FK est respectée). Dans ce cas le superadmin devra
-- compléter l'onboarding une seule fois pour créer son org.

DO $$
DECLARE
  v_user_id  UUID := 'd15748a4-9ad2-4747-a8bb-f558dc52c79e';
  v_org_id   UUID;
BEGIN
  -- Chercher l'organisation actuelle du superadmin (s'il en a une)
  SELECT organisation_id INTO v_org_id
  FROM organisation_members
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_org_id IS NULL THEN
    -- Pas encore de membership : prendre la première org disponible
    SELECT id INTO v_org_id FROM organisations ORDER BY created_at LIMIT 1;
  END IF;

  IF v_org_id IS NOT NULL THEN
    INSERT INTO organisation_members (organisation_id, user_id, role, is_active, accepted_at)
    VALUES (v_org_id, v_user_id, 'superadmin', true, now())
    ON CONFLICT (organisation_id, user_id)
    DO UPDATE SET
      role      = 'superadmin',
      is_active = true;
  END IF;
END $$;

-- Profil superadmin (idempotent)
INSERT INTO profiles (id, full_name, job_title)
VALUES ('d15748a4-9ad2-4747-a8bb-f558dc52c79e', 'Yann L.', 'Superadmin')
ON CONFLICT (id) DO UPDATE SET
  full_name = COALESCE(NULLIF(profiles.full_name, ''), 'Yann L.'),
  job_title = 'Superadmin';

NOTIFY pgrst, 'reload schema';
