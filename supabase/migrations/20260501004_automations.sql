-- Sprint 3: Superadmin automations and workflow logs

CREATE TABLE IF NOT EXISTS superadmin_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean DEFAULT false,
  trigger_type text NOT NULL,
  trigger_config jsonb DEFAULT '{}',
  actions jsonb DEFAULT '[]',
  tags_filter uuid[] DEFAULT '{}',
  run_count int DEFAULT 0,
  last_run_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS superadmin_automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid REFERENCES superadmin_automations(id) ON DELETE CASCADE,
  trigger_data jsonb,
  status text CHECK (status IN ('success', 'error', 'partial')),
  actions_run int DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE superadmin_automations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "automations_superadmin" ON superadmin_automations;
CREATE POLICY "automations_superadmin" ON superadmin_automations
  FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

ALTER TABLE superadmin_automation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "automation_logs_superadmin" ON superadmin_automation_logs;
CREATE POLICY "automation_logs_superadmin" ON superadmin_automation_logs
  FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());
