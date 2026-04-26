-- PilotOS — Migration 002 : KPIs catalogue et Templates sectoriels

-- ============================================================
-- Catalogue KPIs
-- ============================================================
CREATE TABLE IF NOT EXISTS kpi_catalog (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL,
  min_role TEXT DEFAULT 'contributor',
  max_per_role JSONB DEFAULT '{"terrain":3,"contributor":5,"manager":8,"admin":12,"director":6}',
  is_gamification BOOLEAN DEFAULT false
);

ALTER TABLE kpi_catalog ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour le catalogue
CREATE POLICY "kpi_catalog_read_all" ON kpi_catalog
  FOR SELECT USING (true);

-- ============================================================
-- Templates sectoriels
-- ============================================================
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sector TEXT NOT NULL,
  type TEXT CHECK (type IN ('process','action','objective','kpi_set','document_tree')),
  content JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour les templates
CREATE POLICY "templates_read_all" ON templates
  FOR SELECT USING (true);

-- ============================================================
-- Seed : Catalogue KPIs
-- ============================================================
INSERT INTO kpi_catalog (id, label, description, module, min_role, is_gamification) VALUES
-- Pilotage
('actions_total', 'Actions totales', 'Nombre total d''actions dans le plan d''actions', 'pilotage', 'contributor', false),
('actions_done_pct', 'Taux de réalisation (%)', 'Pourcentage d''actions terminées', 'pilotage', 'contributor', false),
('actions_late', 'Actions en retard', 'Actions dont la date d''échéance est dépassée', 'pilotage', 'contributor', false),
('actions_critical', 'Actions critiques', 'Actions avec priorité critique', 'pilotage', 'manager', false),
('objectives_active', 'Objectifs actifs', 'Nombre d''objectifs stratégiques en cours', 'pilotage', 'manager', false),
('projects_active', 'Projets actifs', 'Nombre de projets en cours', 'pilotage', 'manager', false),
-- Processus
('processes_total', 'Processus documentés', 'Nombre de processus dans le référentiel', 'processus', 'contributor', false),
('processes_health_avg', 'Santé processus (%)', 'Score de santé moyen des processus', 'processus', 'manager', false),
('nc_open', 'Non-conformités ouvertes', 'Non-conformités non encore traitées', 'processus', 'manager', false),
('reviews_due', 'Revues à effectuer', 'Revues de processus à réaliser ce mois', 'processus', 'manager', false),
-- GED
('documents_active', 'Documents en vigueur', 'Documents au statut Actif', 'ged', 'contributor', false),
('documents_expiring', 'Documents à réviser', 'Documents dont la date de révision approche', 'ged', 'manager', false),
('documents_pending_approval', 'Documents en attente', 'Documents en circuit de validation', 'ged', 'manager', false),
-- Terrain
('reports_pending', 'Signalements en attente', 'Signalements terrain non traités', 'terrain', 'manager', false),
('reports_converted', 'Taux de conversion (%)', 'Signalements convertis en actions', 'terrain', 'manager', false),
-- Gamification
('streak_current', 'Série en cours', 'Nombre de jours consécutifs d''activité', 'pilotage', 'contributor', true),
('badges_earned', 'Badges obtenus', 'Nombre de badges gagnés', 'pilotage', 'contributor', true),
('actions_completed_week', 'Actions complétées (semaine)', 'Actions terminées cette semaine', 'pilotage', 'terrain', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed : Templates sectoriels
-- ============================================================
INSERT INTO templates (name, sector, type, content, is_active) VALUES
('Processus types SDIS', 'sdis', 'process', '{
  "processes": [
    {"title": "Engagement opérationnel", "code": "P-OPE-001", "type": "operational"},
    {"title": "Formation et entraînement", "code": "P-OPE-002", "type": "operational"},
    {"title": "Maintenance matériel", "code": "P-SUP-001", "type": "support"},
    {"title": "Gestion administrative", "code": "M-ADM-001", "type": "management"},
    {"title": "Prévention et sensibilisation", "code": "P-OPE-003", "type": "operational"}
  ]
}', true),
('Processus types PME industrielle', 'industrie', 'process', '{
  "processes": [
    {"title": "Production", "code": "P-OPE-001", "type": "operational"},
    {"title": "Contrôle qualité", "code": "P-OPE-002", "type": "operational"},
    {"title": "Achats et approvisionnements", "code": "P-SUP-001", "type": "support"},
    {"title": "Maintenance", "code": "P-SUP-002", "type": "support"},
    {"title": "Planification stratégique", "code": "M-STR-001", "type": "management"},
    {"title": "Ressources humaines", "code": "P-SUP-003", "type": "support"}
  ]
}', true),
('Processus types PME distribution', 'distribution', 'process', '{
  "processes": [
    {"title": "Réception marchandises", "code": "P-OPE-001", "type": "operational"},
    {"title": "Préparation commandes", "code": "P-OPE-002", "type": "operational"},
    {"title": "Livraison client", "code": "P-OPE-003", "type": "operational"},
    {"title": "Gestion des retours", "code": "P-OPE-004", "type": "operational"},
    {"title": "Gestion des stocks", "code": "P-SUP-001", "type": "support"}
  ]
}', true),
('KPIs ISO 9001 — PME', 'generic', 'kpi_set', '{
  "kpis": [
    "actions_done_pct", "actions_late", "nc_open", "processes_health_avg",
    "documents_active", "documents_expiring", "objectives_active"
  ]
}', true),
('Arborescence ISO documentaire', 'generic', 'document_tree', '{
  "folders": [
    {"name": "Système de Management", "children": [
      {"name": "Manuel Qualité"},
      {"name": "Politique et Objectifs"},
      {"name": "Revues de Direction"}
    ]},
    {"name": "Processus", "children": [
      {"name": "Processus de Management"},
      {"name": "Processus Opérationnels"},
      {"name": "Processus Support"}
    ]},
    {"name": "Procédures et Instructions"},
    {"name": "Réglementaire & Conformité"},
    {"name": "Audits & Revues"},
    {"name": "Ressources Humaines"},
    {"name": "Enregistrements"}
  ]
}', true);
