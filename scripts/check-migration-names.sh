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
#   4. All versions must be in strictly increasing order (no gaps allowed,
#      but sequence numbers are not required to be consecutive).
#
# Exit: 0 = all good, 1 = one or more violations found.
# =============================================================================
set -euo pipefail

MIGRATIONS_DIR="${1:-supabase/migrations}"

# ── GitHub Actions annotation helpers ────────────────────────────────────────
info()    { echo "  ✅  $*"; }
warn()    { echo "  ⚠️   $*"; }
fail()    { echo "::error::$*"; }
section() { echo ""; echo "──── $* ────"; }

# ── Collect files ─────────────────────────────────────────────────────────────
section "Vérification des noms de migrations dans $MIGRATIONS_DIR"

ERRORS=0
declare -A SEEN_VERSIONS   # version_prefix -> first filename that claimed it
PREV_PREFIX=""
PREV_FNAME=""

for filepath in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
  [[ -e "$filepath" ]] || { warn "Aucun fichier .sql trouvé dans $MIGRATIONS_DIR"; exit 0; }
  fname=$(basename "$filepath")

  # ── Extract numeric prefix (leading digit run — same logic as Supabase CLI) ─
  prefix=$(echo "$fname" | sed -E 's/^([0-9]+).*/\1/')

  # Rule 1: prefix must be ≥11 digits
  if [[ ${#prefix} -lt 11 ]]; then
    fail "$fname : préfixe '$prefix' trop court (${#prefix} chiffre(s), minimum 11)"
    echo "         Format YYYYMMDDNNN     : 20260430017_newsletter.sql"
    echo "         Format YYYYMMDDHHMMSS  : 20260430001700_newsletter.sql"
    echo "         Cause probable : underscore entre date et numéro"
    echo "                         ex: 20260430_017_foo.sql → version '20260430' (collision)"
    echo "         Correction     : bash scripts/rename-migrations-to-timestamp.sh"
    echo "                          bash scripts/fix-out-of-order.sh"
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
  fi

  # Rule 4: versions must be in strictly increasing order
  if [[ -n "$PREV_PREFIX" ]] && (( 10#$prefix <= 10#$PREV_PREFIX )); then
    fail "Ordre cassé : '$fname' (version $prefix) n'est pas après '$PREV_FNAME' (version $PREV_PREFIX)"
    echo "         Les versions doivent être strictement croissantes."
    echo "         Correction : bash scripts/fix-out-of-order.sh"
    ERRORS=$((ERRORS + 1))
  else
    info "$fname  (version: $prefix, ${#prefix} chiffres)"
    PREV_PREFIX="$prefix"
    PREV_FNAME="$fname"
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
  echo "  Scripts de correction :"
  echo "    Mauvais nommage  : bash scripts/rename-migrations-to-timestamp.sh"
  echo "    Hors ordre       : bash scripts/fix-out-of-order.sh --apply"
  echo ""
  echo "  Documentation : supabase/MIGRATIONS_RULES.md"
  exit 1
fi

echo "✅  Toutes les migrations respectent la convention de nommage et l'ordre."
