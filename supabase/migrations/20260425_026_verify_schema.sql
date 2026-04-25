-- Migration 026 : Vérification de présence des tables critiques
-- Ce bloc échoue explicitement si une table attendue est absente,
-- signalant une migration manquante sur l'environnement cible.

DO $$
DECLARE
  missing TEXT[] := '{}';
  tbl TEXT;
  expected TEXT[] := ARRAY[
    'actions',
    'processes',
    'process_reviews',
    'non_conformities',
    'notifications',
    'admin_audit_log',
    'kpi_catalog',
    'user_streaks',
    'user_badges'
  ];
BEGIN
  FOREACH tbl IN ARRAY expected LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      missing := array_append(missing, tbl);
    END IF;
  END LOOP;

  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION 'Tables manquantes : % — vérifier migrations 002–025', array_to_string(missing, ', ');
  END IF;
END $$;
