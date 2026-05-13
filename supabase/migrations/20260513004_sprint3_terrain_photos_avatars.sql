-- =============================================================
-- PilotOS — Sprint 3 : Photos terrain, buckets Storage, commentaire manager
-- =============================================================

-- ── 1. Colonne manager_comment sur terrain_reports ────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'terrain_reports'
      AND column_name  = 'manager_comment'
  ) THEN
    ALTER TABLE terrain_reports ADD COLUMN manager_comment TEXT;
  END IF;
END;
$$;

-- ── 2. Buckets Storage ────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true,
  2097152,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'terrain-photos', 'terrain-photos', true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- ── 3. RLS Storage — avatars ──────────────────────────────────
DROP POLICY IF EXISTS "avatars_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_insert"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_update"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_delete"  ON storage.objects;

CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_user_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_user_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_user_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 4. RLS Storage — terrain-photos ──────────────────────────
DROP POLICY IF EXISTS "terrain_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "terrain_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "terrain_photos_delete" ON storage.objects;

CREATE POLICY "terrain_photos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'terrain-photos');

CREATE POLICY "terrain_photos_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'terrain-photos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "terrain_photos_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'terrain-photos'
    AND auth.uid() IS NOT NULL
  );
