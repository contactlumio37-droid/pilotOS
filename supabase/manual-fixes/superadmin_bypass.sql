-- À appliquer manuellement dans Supabase SQL Editor
-- Ajoute une policy SELECT permissive pour superadmin sur organisation_members.
-- Utile si is_superadmin() échoue (membership inactif) et bloque l'accès à d'autres tables.
--
-- Contexte : is_superadmin() vérifie organisation_members WHERE is_active = true.
-- Si la ligne du superadmin est inactive, is_superadmin() retourne false,
-- ce qui bloque les policies RLS qui s'appuient dessus (organisations, etc.).
-- Cette policy garantit que le superadmin peut toujours lire ses propres lignes.

CREATE POLICY "superadmin_bypass"
ON organisation_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'superadmin'
  )
);

-- ATTENTION : cette policy suppose que profiles.role existe.
-- Si la colonne n'existe pas, utiliser à la place :
--
-- CREATE POLICY "superadmin_own_rows_always"
-- ON organisation_members
-- FOR SELECT
-- TO authenticated
-- USING (user_id = auth.uid());
--
-- Note : la policy "members_own_read" existante fait déjà USING (user_id = auth.uid() OR is_superadmin())
-- donc cette policy est redondante SI members_own_read est en place.
-- L'appliquer uniquement si members_own_read manque ou a été supprimée.
--
-- Solution préférée : réactiver le membership du superadmin :
-- UPDATE organisation_members
--   SET is_active = true
--   WHERE user_id = '<user_id_superadmin>'
--   AND role = 'superadmin';
