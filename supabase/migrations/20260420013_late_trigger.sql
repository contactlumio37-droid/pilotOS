-- Sprint 1 — Trigger automatique status='late' sur les actions
-- Se déclenche avant INSERT/UPDATE pour maintenir le statut cohérent

CREATE OR REPLACE FUNCTION check_action_late()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.due_date IS NOT NULL
     AND NEW.due_date < CURRENT_DATE
     AND NEW.status NOT IN ('done', 'cancelled') THEN
    NEW.status := 'late';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS action_auto_late ON actions;
CREATE TRIGGER action_auto_late
  BEFORE INSERT OR UPDATE OF due_date, status ON actions
  FOR EACH ROW EXECUTE FUNCTION check_action_late();

-- Mise à jour immédiate des actions déjà en retard
UPDATE actions
SET status = 'late'
WHERE due_date IS NOT NULL
  AND due_date < CURRENT_DATE
  AND status NOT IN ('done', 'cancelled', 'late');
