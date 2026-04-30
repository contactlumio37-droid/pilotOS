-- Sprint 6: Feedback enrichment — additive migration only

ALTER TABLE feedback_reports
  ADD COLUMN IF NOT EXISTS admin_priority TEXT DEFAULT 'normal'
    CHECK (admin_priority IN ('critical', 'high', 'normal', 'low'));

ALTER TABLE feedback_reports
  ADD COLUMN IF NOT EXISTS admin_reply_at TIMESTAMPTZ;

-- Ensure notifications.organisation_id is nullable (may already be)
ALTER TABLE notifications ALTER COLUMN organisation_id DROP NOT NULL;

-- Resserrement de la RLS feedback_reports
DROP POLICY IF EXISTS "feedback_reports_read" ON feedback_reports;
CREATE POLICY "feedback_reports_read" ON feedback_reports
  FOR SELECT USING (
    is_superadmin()
    OR reporter_id = auth.uid()
    OR (
      organisation_id IS NOT NULL
      AND is_anonymous = false
      AND EXISTS (
        SELECT 1 FROM organisation_members om
        WHERE om.organisation_id = feedback_reports.organisation_id
          AND om.user_id = auth.uid()
          AND om.is_active = true
      )
    )
  );
