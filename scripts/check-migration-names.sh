#!/usr/bin/env bash
# =============================================================================
# check-migration-names.sh
# Validates Supabase migration file naming before any db push or commit.
#
# Usage: bash scripts/check-migration-names.sh [migrations_dir]
#        Default dir: supabase/migrations
#
# Rules enforced:
#   1. Filename must start with ≥11 consecutive digits.
#      Supabase CLI uses the leading digit run as the version key — a name like
#      "20260430_017_foo.sql" yields version "20260430" (8 digits) and collides
#      with every other file sharing that date.
#      Accepted formats:
#        YYYYMMDDNNN_description.sql     (11 digits — legacy ok)
#        YYYYMMDDHHMMSS_description.sql  (14 digits — recommended)
#   2. A description must follow: _lower_case_words.sql
#   3. Every version prefix must be globally unique across the directory.
#
# Exit: 0 = all good, 1 = one or more violations found.
# =============================================================================
set -euo pipefail

MIGRATIONS_DIR="${1:-supabase/migrations}"

# Files that predate this check and cannot be renamed without a SQL repair
# in schema_migrations. Do NOT add new entries here — fix the file instead.
# See supabase/MIGRATIONS_RULES.md — "Exception historique" for the procedure.
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
    warn "$fname  [exception historique — voir MIGRATIONS_RULES.md pour corriger]"
    continue
  fi

  # ── Extract numeric prefix (leading digit run — same as Supabase CLI) ────
  prefix=$(echo "$fname" | sed -E 's/^([0-9]+).*/\1/')

  # Rule 1: prefix must be ≥11 digits
  if [[ ${#prefix} -lt 11 ]]; then
    fail "$fname : préfixe '$prefix' trop court (${#prefix} chiffre(s), minimum 11)"
    echo "         Format YYYYMMDDNNN     : 20260430017_newsletter.sql"
    echo "         Format YYYYMMDDHHMMSS  : 20260430001700_newsletter.sql"
    echo "         Cause probable : underscore entre date et numéro"
    echo "                         ex: 20260430_017_foo.sql → version '20260430' (collision)"
    echo "         Correction     : bash scripts/rename-migrations-to-timestamp.sh"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Rule 2: format must be YYYYMMDDNNN_ or YYYYMMDDHHMMSS_ with lowercase desc
  if ! [[ "$fname" =~ ^[0-9]{11,}_[a-z][a-z0-9_]*\.sql$ ]]; then
    fail "$fname : format invalide"
    echo "         Attendu  : YYYYMMDDNNN_description_minuscules.sql"
    echo "         Ou       : YYYYMMDDHHMMSS_description_minuscules.sql"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Rule 3: version must be globally unique
  if [[ -v "SEEN_VERSIONS[$prefix]" ]]; then
    fail "Version dupliquée '$prefix' :"
    echo "         Premier fichier  : ${SEEN_VERSIONS[$prefix]}"
    echo "         Fichier actuel   : $fname"
    echo "         Correction       : bash scripts/rename-migrations-to-timestamp.sh"
    ERRORS=$((ERRORS + 1))
  else
    SEEN_VERSIONS[$prefix]="$fname"
    info "$fname  (version: $prefix, ${#prefix} chiffres)"
  fi
done

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
if [[ $ERRORS -gt 0 ]]; then
  fail "$ERRORS violation(s) détectée(s) — db push annulé."
  echo ""
  echo "  Formats valides :"
  echo "    YYYYMMDDNNN_description.sql       (11 chiffres)"
  echo "    YYYYMMDDHHMMSS_description.sql    (14 chiffres — recommandé)"
  echo ""
  echo "  Script de correction automatique :"
  echo "    bash scripts/rename-migrations-to-timestamp.sh"
  echo ""
  echo "  Documentation : supabase/MIGRATIONS_RULES.md"
  exit 1
fi

echo "✅  Toutes les migrations respectent la convention de nommage."
