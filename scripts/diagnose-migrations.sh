#!/usr/bin/env bash
# =============================================================================
# diagnose-migrations.sh
# Diagnoses the state of schema_migrations in the remote DB.
#
# Usage:
#   SUPABASE_DB_PASSWORD=... bash scripts/diagnose-migrations.sh
#
# Prerequisites: supabase CLI linked (supabase link --project-ref <ref>)
# =============================================================================
set -euo pipefail

section() { echo ""; echo "════════════════════════════════════════"; echo "  $*"; echo "════════════════════════════════════════"; }
run_sql() { supabase db query --password "$SUPABASE_DB_PASSWORD" "$1"; }

section "1 — Historique complet des migrations"
run_sql "
SELECT version, name, inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY version;
"

section "2 — Doublons de version (root cause des collisions CI)"
run_sql "
SELECT version, COUNT(*) AS occurrences, ARRAY_AGG(name ORDER BY name) AS noms
FROM supabase_migrations.schema_migrations
GROUP BY version
HAVING COUNT(*) > 1
ORDER BY version;
"

section "3 — Versions avec préfixe court (< 11 chars = nommage invalide)"
run_sql "
SELECT version, name, LENGTH(version) AS longueur_prefixe
FROM supabase_migrations.schema_migrations
WHERE LENGTH(version) < 11
ORDER BY version;
"

section "4 — Fichiers locaux vs base (désynchronisation)"
supabase migration list
