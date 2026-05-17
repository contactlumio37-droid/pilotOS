-- Security fix: restrict admin_audit_log INSERT to superadmin role only.
-- Previously any authenticated user could insert arbitrary audit log entries,
-- allowing non-admin users to forge audit records or pollute the log.
-- logEvent() is only called from superadmin UI pages, so this restriction is safe.

DROP POLICY IF EXISTS "audit_log_authenticated_insert" ON admin_audit_log;

CREATE POLICY "audit_log_superadmin_insert" ON admin_audit_log
  FOR INSERT WITH CHECK (is_superadmin());
