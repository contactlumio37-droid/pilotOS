-- Sprint 2: Newsletter campaigns, tags, subscriber-tag relations

CREATE TABLE IF NOT EXISTS newsletter_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_subscriber_tags (
  subscriber_id uuid REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES newsletter_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (subscriber_id, tag_id)
);

CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  preview_text text,
  content text,
  content_blocks jsonb DEFAULT '[]',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent')),
  segment_tag_ids uuid[] DEFAULT '{}',
  scheduled_at timestamptz,
  sent_at timestamptz,
  sent_count int DEFAULT 0,
  failed_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE newsletter_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "newsletter_tags_superadmin" ON newsletter_tags;
CREATE POLICY "newsletter_tags_superadmin" ON newsletter_tags
  FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

ALTER TABLE newsletter_subscriber_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "newsletter_subscriber_tags_superadmin" ON newsletter_subscriber_tags;
CREATE POLICY "newsletter_subscriber_tags_superadmin" ON newsletter_subscriber_tags
  FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "newsletter_campaigns_superadmin" ON newsletter_campaigns;
CREATE POLICY "newsletter_campaigns_superadmin" ON newsletter_campaigns
  FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());
