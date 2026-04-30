-- Sprint 4: CMS pages and site section SEO enrichment

ALTER TABLE site_sections ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE site_sections ADD COLUMN IF NOT EXISTS seo_description text;
ALTER TABLE site_sections ADD COLUMN IF NOT EXISTS og_image text;

CREATE TABLE IF NOT EXISTS cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  seo_title text,
  seo_description text,
  og_image text,
  sections jsonb DEFAULT '[]',
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cms_pages_superadmin" ON cms_pages;
CREATE POLICY "cms_pages_superadmin" ON cms_pages
  FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

DROP POLICY IF EXISTS "cms_pages_public_read" ON cms_pages;
CREATE POLICY "cms_pages_public_read" ON cms_pages
  FOR SELECT USING (published = true);
