-- Migration 025 : Idempotent — notifications, admin_audit_log, kpi_catalog, streaks, badges
-- Toutes les tables existent depuis migrations 002 et 009. RLS et politiques granulaires
-- sont en place depuis migration 011. Seules les nouvelles politiques FOR ALL + data fixes
-- sont effectivement appliqués.

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  type TEXT NOT NULL, title TEXT NOT NULL, body TEXT,
  read BOOLEAN DEFAULT false, action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own notifications" ON notifications
    FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, target_type TEXT, target_id UUID,
  before_state JSONB, after_state JSONB, ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "superadmin only audit" ON admin_audit_log
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM organisation_members
        WHERE user_id = auth.uid() AND role = 'superadmin' AND is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS kpi_catalog (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL, description TEXT, module TEXT NOT NULL,
  min_role TEXT DEFAULT 'contributor',
  max_per_role JSONB DEFAULT '{"terrain":3,"contributor":5,"manager":8,"admin":12,"director":6}',
  is_gamification BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0, longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE, updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, organisation_id)
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  badge TEXT NOT NULL, earned_at TIMESTAMPTZ DEFAULT now()
);

-- Corriger rôle superadmin
UPDATE organisation_members
  SET role = 'superadmin'
  WHERE user_id = 'd15748a4-9ad2-4747-a8bb-f558dc52c79e';

INSERT INTO profiles (id, full_name)
  VALUES ('d15748a4-9ad2-4747-a8bb-f558dc52c79e', 'Yann L.')
  ON CONFLICT (id) DO NOTHING;

-- Recharger le cache schéma PostgREST
NOTIFY pgrst, 'reload schema';
