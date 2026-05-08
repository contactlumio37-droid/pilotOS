-- Vue recent_activity : union des événements récents (actions, documents, terrain_reports)
-- Utilisée par le fil d'activité dans les tableaux de bord

CREATE OR REPLACE VIEW recent_activity AS
SELECT
  'action' AS entity_type,
  a.id AS entity_id,
  a.organisation_id,
  a.title,
  a.status::text AS status,
  a.created_at,
  a.responsible_id AS user_id,
  p.full_name AS user_name,
  p.avatar_url AS user_avatar
FROM actions a
LEFT JOIN profiles p ON p.id = a.responsible_id

UNION ALL

SELECT
  'document' AS entity_type,
  d.id AS entity_id,
  d.organisation_id,
  d.title,
  d.status::text AS status,
  d.created_at,
  d.uploaded_by AS user_id,
  p.full_name AS user_name,
  p.avatar_url AS user_avatar
FROM documents d
LEFT JOIN profiles p ON p.id = d.uploaded_by

UNION ALL

SELECT
  'terrain_report' AS entity_type,
  tr.id AS entity_id,
  tr.organisation_id,
  tr.title,
  tr.status::text AS status,
  tr.created_at,
  tr.reported_by AS user_id,
  p.full_name AS user_name,
  p.avatar_url AS user_avatar
FROM terrain_reports tr
LEFT JOIN profiles p ON p.id = tr.reported_by

ORDER BY created_at DESC;

-- RLS: la vue hérite des RLS des tables sous-jacentes
-- No separate RLS needed on the view itself
