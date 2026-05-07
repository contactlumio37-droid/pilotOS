-- =============================================================
-- PilotOS v0.5.3 — CMS system pages
-- Adds is_system + page_url columns, seeds system pages,
-- blocks DELETE on system rows.
-- Migration idempotente — safe si rejouée
-- =============================================================

-- ── Colonnes ──────────────────────────────────────────────────
ALTER TABLE cms_pages
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS page_url  text;

-- ── Système : empêcher la suppression ─────────────────────────
DROP POLICY IF EXISTS "cms_pages_no_delete_system" ON cms_pages;

CREATE POLICY "cms_pages_no_delete_system" ON cms_pages
  FOR DELETE USING (
    is_superadmin() AND is_system = false
  );

-- ── Seed des pages système ────────────────────────────────────
-- On utilise ON CONFLICT DO UPDATE pour l'idempotence.
-- Les sections vides signifient « rendu natif React » pour les pages
-- avec composant dédié (landing, pricing).  Les pages légales seront
-- éditées depuis le CMS.
INSERT INTO cms_pages (slug, title, is_system, page_url, sections, published, seo_title, seo_description)
VALUES
  ('home',            'Accueil',          true, '/',                '[]'::jsonb, true,  'PilotOS — Pilotez votre organisation', 'Plateforme de pilotage stratégique et opérationnel.'),
  ('pricing',         'Tarifs',           true, '/pricing',         '[]'::jsonb, true,  'Tarifs PilotOS',                       'Découvrez nos offres Free, Team, Business et Pro.'),
  ('roadmap',         'Roadmap',          true, '/roadmap',         '[]'::jsonb, true,  'Roadmap PilotOS',                      'Suivez les évolutions et nouveautés à venir.'),
  ('login',           'Connexion',        true, '/login',           '[]'::jsonb, true,  'Connexion PilotOS',                    NULL),
  ('register',        'Inscription',      true, '/register',        '[]'::jsonb, true,  'Inscription PilotOS',                  NULL),
  ('cgu',             'CGU',              true, '/cgu',             '[]'::jsonb, true,  'Conditions Générales d''Utilisation',  'Conditions générales d''utilisation de PilotOS.'),
  ('confidentialite', 'Confidentialité',  true, '/confidentialite', '[]'::jsonb, true,  'Politique de confidentialité',         'Politique de confidentialité de PilotOS.')
ON CONFLICT (slug) DO UPDATE SET
  is_system    = EXCLUDED.is_system,
  page_url     = EXCLUDED.page_url,
  title        = EXCLUDED.title,
  seo_title    = COALESCE(cms_pages.seo_title,    EXCLUDED.seo_title),
  seo_description = COALESCE(cms_pages.seo_description, EXCLUDED.seo_description),
  published    = EXCLUDED.published;
