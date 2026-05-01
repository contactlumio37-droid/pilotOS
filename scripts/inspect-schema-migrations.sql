-- =============================================================================
-- inspect-schema-migrations.sql
-- Run in Supabase SQL Editor to diagnose schema_migrations state.
-- =============================================================================

-- ── 1. Full migration history ─────────────────────────────────────────────────
SELECT
  version,
  name,
  LEFT(statements::text, 80) AS sql_preview,
  inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY version;

-- ── 2. Detect duplicate versions (root cause of the CI collision) ─────────────
SELECT
  version,
  COUNT(*) AS occurrences,
  ARRAY_AGG(name ORDER BY name) AS filenames
FROM supabase_migrations.schema_migrations
GROUP BY version
HAVING COUNT(*) > 1
ORDER BY version;

-- ── 3. Detect versions with short prefix (< 11 chars = bad naming) ────────────
SELECT
  version,
  name,
  LENGTH(version) AS prefix_length
FROM supabase_migrations.schema_migrations
WHERE LENGTH(version) < 11
ORDER BY version;


-- =============================================================================
-- RECOVERY PROCEDURES
-- Run only after validating the correct target version with queries above.
-- =============================================================================

-- ── Recovery A: rename a version that was applied with the wrong prefix ───────
-- Use when a file was applied as '20260430' but should be '20260430016'.
-- Run BEFORE renaming the local file.
--
-- UPDATE supabase_migrations.schema_migrations
-- SET
--   version = '20260430016',
--   name    = '20260430016_blog_enrichissement'
-- WHERE version = '20260430'
--   AND name = '20260430_016_blog_enrichissement';   -- safety: match exact name


-- ── Recovery B: remove a duplicate entry (keep the correct one) ───────────────
-- Use when two rows share the same version due to a past collision.
-- Step 1 — identify which row to remove:
--
--   SELECT ctid, version, name, inserted_at
--   FROM supabase_migrations.schema_migrations
--   WHERE version = '20260430';
--
-- Step 2 — delete the stale one by ctid (physical row id, always unique):
--
--   DELETE FROM supabase_migrations.schema_migrations
--   WHERE ctid = '<ctid_of_stale_row>';


-- ── Recovery C: mark a local-only version as already applied ─────────────────
-- Use when the migration SQL was run manually but the CLI doesn't know.
-- Prefer `supabase migration repair --status applied <version>` via CLI.
--
-- INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
-- VALUES ('20260430017', '20260430017_newsletter_campaigns', ARRAY[]::text[]);


-- ── Recovery D: unregister a remote-only version (orphan) ────────────────────
-- Use when remote has a version with no matching local file.
-- Prefer `supabase migration repair --status reverted <version>` via CLI.
-- Only use direct DELETE if CLI repair fails.
--
-- DELETE FROM supabase_migrations.schema_migrations
-- WHERE version = '<orphan_version>';


-- =============================================================================
-- DEV vs PROD STRATEGY
-- =============================================================================
-- DEV environment:
--   Safe to run Recovery A/B/C/D directly.
--   After recovery: supabase db reset (drops + re-applies everything cleanly).
--
-- STAGING environment:
--   Run Recovery A/B/C/D in a transaction, verify with SELECT, then COMMIT.
--   No db reset — staging mirrors prod data.
--
-- PRODUCTION environment:
--   1. Take a snapshot (Supabase Dashboard → Database → Backups).
--   2. Run the recovery SQL in a transaction.
--   3. Validate with the SELECT queries above before COMMIT.
--   4. Never run db reset in production.
--   5. Alert the team; monitor for 30 min after recovery.
