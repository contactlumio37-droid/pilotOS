-- Sprint 2 / BLOC 2.1 — cms_pages : ajout updated_by manquant
ALTER TABLE cms_pages
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
