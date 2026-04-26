-- PilotOS — Migration 010 : CMS Site Marketing, Blog, Feedback, Roadmap, Bounties

-- ============================================================
-- CMS : sections du site marketing (desktop-first)
-- ============================================================
CREATE TABLE site_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page TEXT NOT NULL,
  section TEXT NOT NULL,
  desktop_content JSONB NOT NULL,
  tablet_content JSONB,
  mobile_content JSONB,
  tablet_overrides TEXT[] DEFAULT '{}',
  mobile_overrides TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(page, section)
);

ALTER TABLE site_sections ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour le site marketing
CREATE POLICY "site_sections_public_read" ON site_sections
  FOR SELECT USING (is_visible = true);

-- ============================================================
-- Blog
-- ============================================================
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT,
  cover_image_url TEXT,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  seo_title TEXT,
  seo_description TEXT,
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Articles publiés lisibles par tous
CREATE POLICY "blog_posts_public_read" ON blog_posts
  FOR SELECT USING (published = true);

-- ============================================================
-- Newsletter
-- ============================================================
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  confirmed BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Logs email
-- ============================================================
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  subject TEXT,
  type TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Roadmap publique
-- ============================================================
CREATE TABLE roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('feature','improvement','fix','infrastructure')),
  status TEXT DEFAULT 'planned'
    CHECK (status IN ('shipped','in_progress','planned','considering','declined')),
  version_target TEXT,
  votes INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER roadmap_items_updated_at
  BEFORE UPDATE ON roadmap_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Lecture publique pour les items publics
CREATE POLICY "roadmap_items_public_read" ON roadmap_items
  FOR SELECT USING (is_public = true);

-- ============================================================
-- Votes roadmap
-- ============================================================
CREATE TABLE roadmap_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  organisation_id UUID REFERENCES organisations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, user_id)
);

ALTER TABLE roadmap_votes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Signalements bugs et suggestions
-- ============================================================
CREATE TABLE feedback_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'bug'
    CHECK (category IN ('bug','suggestion','question','bounty')),
  status TEXT DEFAULT 'new'
    CHECK (status IN ('new','confirmed','in_progress','resolved','wont_fix','duplicate')),
  priority TEXT DEFAULT 'normal'
    CHECK (priority IN ('critical','high','normal','low')),
  -- Contexte technique auto-capturé
  page_url TEXT,
  browser TEXT,
  os TEXT,
  user_role TEXT,
  screenshot_url TEXT,
  -- Déduplication
  parent_id UUID REFERENCES feedback_reports(id),
  vote_count INTEGER DEFAULT 1,
  -- Résolution
  resolved_in_version TEXT,
  resolution_note TEXT,
  -- Auteur
  reporter_id UUID REFERENCES auth.users(id),
  organisation_id UUID REFERENCES organisations(id),
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE feedback_reports ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER feedback_reports_updated_at
  BEFORE UPDATE ON feedback_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Votes feedback
-- ============================================================
CREATE TABLE feedback_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES feedback_reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(report_id, user_id)
);

ALTER TABLE feedback_votes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Abonnés aux résolutions
-- ============================================================
CREATE TABLE feedback_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES feedback_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(report_id, user_id)
);

ALTER TABLE feedback_subscribers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Bounties (features financées)
-- ============================================================
CREATE TABLE feature_bounties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID REFERENCES feedback_reports(id),
  title TEXT NOT NULL,
  description TEXT,
  amount_target INTEGER NOT NULL,
  amount_pledged INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open'
    CHECK (status IN ('open','funded','in_development','delivered','cancelled')),
  roadmap_item_id UUID REFERENCES roadmap_items(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE feature_bounties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_bounties_public_read" ON feature_bounties
  FOR SELECT USING (true);

-- ============================================================
-- Pledges bounties
-- ============================================================
CREATE TABLE bounty_pledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id UUID NOT NULL REFERENCES feature_bounties(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES organisations(id),
  amount INTEGER NOT NULL,
  stripe_payment_intent TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','paid','refunded')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bounty_pledges ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Vue : health score processus
-- ============================================================
CREATE VIEW process_health AS
SELECT
  p.id,
  p.organisation_id,
  p.title,
  GREATEST(0,
    100
    - (SELECT COUNT(*) FROM non_conformities nc
       WHERE nc.process_id = p.id AND nc.status != 'closed') * 10
    - (SELECT COUNT(*) FROM actions a
       WHERE a.process_id = p.id AND a.status = 'late') * 5
  ) AS health_score
FROM processes p;
