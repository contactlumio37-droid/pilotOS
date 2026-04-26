-- Migration 20260426001 : Configuration superadmin Yann L.

-- Définir le rôle superadmin
UPDATE organisation_members
  SET role = 'superadmin'
  WHERE user_id = 'd15748a4-9ad2-4747-a8bb-f558dc52c79e';

-- Créer ou mettre à jour le profil
INSERT INTO profiles (id, full_name, job_title)
  VALUES ('d15748a4-9ad2-4747-a8bb-f558dc52c79e', 'Yann L.', 'Superadmin')
  ON CONFLICT (id) DO UPDATE SET job_title = 'Superadmin';

-- Recharger le cache schéma PostgREST
NOTIFY pgrst, 'reload schema';
