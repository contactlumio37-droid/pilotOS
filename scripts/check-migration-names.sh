#!/usr/bin/env bash
# =============================================================================
# check-migration-names.sh
# Validates Supabase migration file naming before any db push.
#
# Usage: bash scripts/check-migration-names.sh [migrations_dir]
#        Default dir: supabase/migrations
#
# Rules enforced:
#   1. Filename must start with ≥11 consecutive digits (YYYYMMDDNNN or
#      YYYYMMDDHHMMSS). Supabase CLI uses the leading digit run as the
#      version key — a name like "20260430_017_foo.sql" yields version
#      "20260430" (8 digits) and collides with every file sharing that date.
#   2. A description must follow: _lower_case_words.sql
#   3. Every version prefix must be globally unique across the directory.
#
# Exit: 0 = all good, 1 = one or more violations found.
# =============================================================================
set -euo pipefail

MIGRATIONS_DIR="${1:-supabase/migrations}"

# Files that predate this check and cannot be renamed without a SQL repair
# in schema_migrations. Do NOT add new entries here — fix the file instead.
KNOWN_EXCEPTIONS=(
  "20260430_016_blog_enrichissement.sql"
)

# ── GitHub Actions annotation helpers ────────────────────────────────────────
info()    { echo "  ✅  $*"; }
warn()    { echo "  ⚠️   $*"; }
fail()    { echo "::error::$*"; }
section() { echo ""; echo "──── $* ────"; }

# ── Collect files ─────────────────────────────────────────────────────────────
section "Vérification des noms de migrations dans $MIGRATIONS_DIR"

ERRORS=0
declare -A SEEN_VERSIONS   # version_prefix -> first filename that claimed it

for filepath in "$MIGRATIONS_DIR"/*.sql; do
  [[ -e "$filepath" ]] || { warn "Aucun fichier .sql trouvé dans $MIGRATIONS_DIR"; exit 0; }
  fname=$(basename "$filepath")

  # ── Known exception bypass ──────────────────────────────────────────────
  is_exception=0
  for ex in "${KNOWN_EXCEPTIONS[@]}"; do
    [[ "$fname" == "$ex" ]] && is_exception=1 && break
  done
  if [[ $is_exception -eq 1 ]]; then
    warn "$fname  [exception historique — ne pas reproduire]"
    continue
  fi

  # ── Extract numeric prefix ──────────────────────────────────────────────
  prefix="${fname%%[^0-9]*}"   # longest leading digit sequence

  # Rule 1: prefix must be ≥ 11 digits
  if [[ ${#prefix} -lt 11 ]]; then
    fail "$fname : préfixe '$prefix' trop court (${#prefix} chiffres < 11)"
    echo "         Format attendu : YYYYMMDDNNN_description.sql"
    echo "         Cause probable : underscore entre la date et le numéro"
    echo "                         ex: 20260430_017_foo.sql → version '20260430' (collision)"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Rule 2: description must follow the digits
  if ! [[ "$fname" =~ ^[0-9]{11,}_[a-z][a-z0-9_]*\.sql$ ]]; then
    fail "$fname : format invalide — attendu YYYYMMDDNNN_description_minuscules.sql"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Rule 3: version must be unique
  if [[ -v "SEEN_VERSIONS[$prefix]" ]]; then
    fail "Version dupliquée '$prefix' :"
    echo "         Premier fichier  : ${SEEN_VERSIONS[$prefix]}"
    echo "         Fichier actuel   : $fname"
    ERRORS=$((ERRORS + 1))
  else
    SEEN_VERSIONS[$prefix]="$fname"
    info "$fname  (version: $prefix)"
  fi
done

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
if [[ $ERRORS -gt 0 ]]; then
  fail "$ERRORS violation(s) détectée(s) — db push annulé."
  echo ""
  echo "  Règle : YYYYMMDDNNN_description.sql"
  echo "  Bon   : 20260501001_add_stripe_webhooks.sql"
  echo "  Mauvais: 20260501_001_add_stripe_webhooks.sql  ← underscore = collision"
  echo ""
  echo "  Consultez supabase/MIGRATIONS_RULES.md pour la procédure de correction."
  exit 1
fi

echo "✅  Toutes les migrations respectent la convention de nommage."
