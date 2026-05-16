-- Sprint 0 / Bloc 0.1 — Buckets Supabase Storage + politiques RLS

-- ── Buckets ──────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('documents', 'documents', false, 52428800,
   ARRAY[
     'application/pdf','image/jpeg','image/png','image/webp',
     'application/msword',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'application/vnd.ms-excel',
     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
   ]),
  ('signatures', 'signatures', false, 5242880,
   ARRAY['image/png','image/jpeg','application/pdf']),
  ('avatars', 'avatars', true, 2097152,
   ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ── RLS Storage : documents (privé, isolation par org) ───────────────────────
-- Chemin attendu : {organisation_id}/{timestamp}.{ext}

CREATE POLICY "org_members_read_documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.user_id = auth.uid()
        AND om.organisation_id::text = (storage.foldername(name))[1]
        AND om.is_active = true
    )
  );

CREATE POLICY "org_members_upload_documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.user_id = auth.uid()
        AND om.organisation_id::text = (storage.foldername(name))[1]
        AND om.is_active = true
    )
  );

CREATE POLICY "org_members_delete_documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.user_id = auth.uid()
        AND om.organisation_id::text = (storage.foldername(name))[1]
        AND om.is_active = true
    )
  );

-- ── RLS Storage : signatures (privé, isolation par org) ─────────────────────
-- Chemin attendu : {organisation_id}/{user_id}/{filename}

CREATE POLICY "org_members_read_signatures"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'signatures'
    AND EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.user_id = auth.uid()
        AND om.organisation_id::text = (storage.foldername(name))[1]
        AND om.is_active = true
    )
  );

CREATE POLICY "org_members_upload_signatures"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'signatures'
    AND EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.user_id = auth.uid()
        AND om.organisation_id::text = (storage.foldername(name))[1]
        AND om.is_active = true
    )
  );

-- ── RLS Storage : avatars (public, isolation par user) ───────────────────────
-- Chemin attendu : {user_id}/{filename}

CREATE POLICY "authenticated_upload_own_avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "authenticated_update_own_avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
