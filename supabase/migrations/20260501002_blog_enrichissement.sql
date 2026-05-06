-- ============================================================
-- Sprint 1 : Enrichissement blog_posts + table blog_categories
-- Migration ADDITIVE — ne touche pas aux colonnes existantes
-- ============================================================

-- Éditeur par blocs (JSON)
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS content_blocks jsonb DEFAULT '[]';

-- Image de couverture (cover_image_url existe déjà ; on ajoute cover_image pour compatibilité nouveau code)
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS cover_image text;

-- Catégorie principale (texte) et tableau de catégories
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS categories text[] DEFAULT '{}';

-- SEO enrichi (seo_title + seo_description existent déjà via migration 010)
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS keywords text;

-- Mise en avant + temps de lecture
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS read_time_minutes int;

-- ============================================================
-- Table des catégories blog
-- ============================================================

CREATE TABLE IF NOT EXISTS blog_categories (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL UNIQUE,
  slug       text        NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

-- Superadmin : lecture + écriture
DROP POLICY IF EXISTS "blog_categories_superadmin" ON blog_categories;
CREATE POLICY "blog_categories_superadmin" ON blog_categories
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Lecture publique (pour affichage sur le blog public)
DROP POLICY IF EXISTS "blog_categories_public_read" ON blog_categories;
CREATE POLICY "blog_categories_public_read" ON blog_categories
  FOR SELECT USING (true);
