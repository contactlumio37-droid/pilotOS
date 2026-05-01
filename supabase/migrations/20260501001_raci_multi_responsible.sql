ALTER TABLE actions
  ADD COLUMN IF NOT EXISTS responsible_ids UUID[] DEFAULT '{}';

ALTER TABLE actions
  ADD COLUMN IF NOT EXISTS accountable_ids UUID[] DEFAULT '{}';

UPDATE actions
SET responsible_ids = ARRAY[responsible_id]
WHERE responsible_id IS NOT NULL
  AND (responsible_ids IS NULL OR responsible_ids = '{}');

UPDATE actions
SET accountable_ids = ARRAY[accountable_id]
WHERE accountable_id IS NOT NULL
  AND (accountable_ids IS NULL OR accountable_ids = '{}');

CREATE INDEX IF NOT EXISTS actions_responsible_ids_idx ON actions USING GIN (responsible_ids);
CREATE INDEX IF NOT EXISTS actions_accountable_ids_idx ON actions USING GIN (accountable_ids);
