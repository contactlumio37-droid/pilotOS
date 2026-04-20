-- PilotOS — Migration 001 : Organisations, Sites, Membres, Profils, Accès modules
-- RÈGLE : RLS activé sur toutes les tables, organisation_id sur toutes les tables métier

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Organisations
-- ============================================================
CREATE TABLE organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  plan TEXT DEFAULT 'free'
    CHECK (plan IN ('free','team','business','pro','enterprise')),
  seats_included INTEGER DEFAULT 1,
  seats_extra INTEGER DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  is_active BOOLEAN DEFAULT true,
  default_kpi_config JSONB DEFAULT '[]',
  terrain_module_enabled BOOLEAN DEFAULT false,
  mfa_policy TEXT DEFAULT 'optional'
    CHECK (mfa_policy IN ('disabled','optional','required','role_based')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Sites
-- ============================================================
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Profils utilisateurs (extension auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  job_title TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Membres d'organisation
-- ============================================================
CREATE TABLE organisation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'contributor'
    CHECK (role IN ('superadmin','admin','manager','contributor','terrain','reader','director')),
  site_id UUID REFERENCES sites(id),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_enrolled_at TIMESTAMPTZ,
  kpi_config JSONB DEFAULT '[]',
  UNIQUE(organisation_id, user_id)
);

ALTER TABLE organisation_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Accès modules par organisation
-- ============================================================
CREATE TABLE module_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  module TEXT NOT NULL
    CHECK (module IN ('pilotage','processus','ged','terrain','securite','qse')),
  is_active BOOLEAN DEFAULT false,
  activated_at TIMESTAMPTZ,
  UNIQUE(organisation_id, module)
);

ALTER TABLE module_access ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Trigger updated_at générique
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organisations_updated_at
  BEFORE UPDATE ON organisations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Trigger : création profil automatique à l'inscription
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
