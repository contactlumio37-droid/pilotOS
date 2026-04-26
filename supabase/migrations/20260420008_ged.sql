-- PilotOS — Migration 008 : GED enrichie (versionning + audit ISO)

-- ============================================================
-- Dossiers documentaires
-- ============================================================
CREATE TABLE IF NOT EXISTS document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES document_folders(id),
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS document_folders_organisation_id_idx ON document_folders(organisation_id);
CREATE INDEX IF NOT EXISTS document_folders_parent_id_idx ON document_folders(parent_id);

-- ============================================================
-- Documents
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES document_folders(id),
  title TEXT NOT NULL,
  doc_type TEXT
    CHECK (doc_type IN ('NS','PROC','CR','FORM','REPORT','INSTRUCTION','OTHER')),
  -- Source
  source TEXT DEFAULT 'upload'
    CHECK (source IN ('upload','created')),
  template_type TEXT
    CHECK (template_type IN ('procedure','instruction','note','form','report')),
  content JSONB,
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  -- Versionning
  version_major INTEGER DEFAULT 1,
  version_minor INTEGER DEFAULT 0,
  version_label TEXT GENERATED ALWAYS AS
    ('v' || version_major || '.' || version_minor) STORED,
  previous_version_id UUID REFERENCES documents(id),
  -- Identification
  doc_code TEXT,
  is_master_document BOOLEAN DEFAULT false,
  -- Statut
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft','in_review','approved','active','archived','obsolete')),
  -- Circuit de validation
  validation_required BOOLEAN DEFAULT false,
  redactor_id UUID REFERENCES auth.users(id),
  reviewer_id UUID REFERENCES auth.users(id),
  approver_id UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  effective_date DATE,
  expiry_date DATE,
  -- Diffusion
  distribution_list UUID[] DEFAULT '{}',
  acknowledgment_required BOOLEAN DEFAULT false,
  -- Rattachements
  linked_process_id UUID REFERENCES processes(id),
  linked_action_id UUID REFERENCES actions(id),
  linked_project_id UUID REFERENCES projects(id),
  linked_objective_id UUID REFERENCES strategic_objectives(id),
  -- Visibilité
  visibility TEXT DEFAULT 'public'
    CHECK (visibility IN ('public','managers','restricted','confidential')),
  visibility_user_ids UUID[] DEFAULT '{}',
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS documents_updated_at ON documents;
CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS documents_organisation_id_idx ON documents(organisation_id);
CREATE INDEX IF NOT EXISTS documents_folder_id_idx ON documents(folder_id);
CREATE INDEX IF NOT EXISTS documents_status_idx ON documents(status);

-- ============================================================
-- Historique des versions
-- ============================================================
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  file_path TEXT,
  content JSONB,
  change_summary TEXT,
  archived_at TIMESTAMPTZ DEFAULT now(),
  archived_by UUID REFERENCES auth.users(id)
);

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Émargements (prises de connaissance)
-- ============================================================
CREATE TABLE IF NOT EXISTS document_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  UNIQUE(document_id, user_id)
);

ALTER TABLE document_acknowledgments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Vue : registre des documents maîtrisés (export audit ISO)
-- ============================================================
CREATE OR REPLACE VIEW master_document_register AS
SELECT
  d.doc_code,
  df.name AS folder,
  d.title,
  d.doc_type,
  d.version_label,
  d.status,
  p.full_name AS pilot,
  d.effective_date,
  d.expiry_date,
  d.source,
  d.organisation_id
FROM documents d
LEFT JOIN document_folders df ON d.folder_id = df.id
LEFT JOIN profiles p ON d.redactor_id = p.id
WHERE d.is_master_document = true
  AND d.status = 'active'
ORDER BY df.name, d.title;
