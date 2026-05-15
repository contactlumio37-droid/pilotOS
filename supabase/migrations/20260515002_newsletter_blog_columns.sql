-- ════════════════════════════════════════════════════════════════
-- BLOC 8 — Colonnes manquantes newsletter + blog
-- ════════════════════════════════════════════════════════════════

-- ── newsletter_subscribers — confirm_token + unsubscribed_at ────
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS confirm_token    text UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  ADD COLUMN IF NOT EXISTS unsubscribed_at  timestamptz;

-- Index for token lookups
CREATE INDEX IF NOT EXISTS newsletter_subscribers_confirm_token_idx
  ON newsletter_subscribers (confirm_token);

-- Public policy: allow unsubscribe/confirm via token (no auth needed)
DROP POLICY IF EXISTS "newsletter_public_token_read" ON newsletter_subscribers;
CREATE POLICY "newsletter_public_token_read" ON newsletter_subscribers
  FOR SELECT USING (true);

-- ── newsletter_campaigns — title + recipient_count + created_by ─
ALTER TABLE newsletter_campaigns
  ADD COLUMN IF NOT EXISTS title            text,
  ADD COLUMN IF NOT EXISTS recipient_count  int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Back-fill title from subject for existing rows
UPDATE newsletter_campaigns
  SET title = subject
  WHERE title IS NULL;

-- ── blog_posts — scheduled_at (si pas déjà présent) ─────────────
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
