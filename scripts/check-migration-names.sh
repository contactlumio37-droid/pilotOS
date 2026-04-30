#!/usr/bin/env bash
# check-migration-names.sh
#
# Validates that every migration file in supabase/migrations/ follows the
# mandatory naming convention: YYYYMMDDNNN_description.sql
#
# Rule: the numeric prefix (all leading digits) must be at least 11 characters
# long. Supabase CLI extracts only the leading digit run as the version key;
# a name like '20260430_017_foo.sql' produces version '20260430' — 8 digits —
# which collides with every other file sharing the same date prefix.
#
# Valid  : 20260420002_kpis_templates.sql        (prefix: 20260420002, 11 digits)
# Invalid: 20260430_017_newsletter_campaigns.sql  (prefix: 20260430,    8 digits)
#
# Known exception: 20260430_016_blog_enrichissement.sql was applied to the
# remote DB under version '20260430' before this check existed. It is pinned
# here to avoid a false positive; no new exception should ever be added.

set -euo pipefail

MIGRATIONS_DIR="${1:-supabase/migrations}"
KNOWN_EXCEPTIONS=("20260430_016_blog_enrichissement.sql")

ERRORS=0
SEEN_PREFIXES=()
SEEN_FILES=()

for filepath in "$MIGRATIONS_DIR"/*.sql; do
  fname=$(basename "$filepath")

  # ── Skip known historical exceptions ──────────────────────────
  skip=0
  for ex in "${KNOWN_EXCEPTIONS[@]}"; do
    [[ "$fname" == "$ex" ]] && skip=1 && break
  done
  if [[ $skip -eq 1 ]]; then
    echo "  ⚠️  $fname (exception historique connue — ne pas reproduire)"
    continue
  fi

  # ── Extract numeric prefix ─────────────────────────────────────
  prefix=$(echo "$fname" | grep -oP '^\d+')

  # ── Rule 1: prefix must be ≥ 11 digits (YYYYMMDD + NNN) ───────
  if [[ ${#prefix} -lt 11 ]]; then
    echo "❌ $fname"
    echo "   Préfixe numérique trop court : '${prefix}' (${#prefix} chiffres)"
    echo "   Format attendu : YYYYMMDDNNN_description.sql  (≥ 11 chiffres)"
    echo "   Supabase CLI extrait uniquement '${prefix}' comme version → collision garantie."
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # ── Rule 2: description must be present and lowercase ──────────
  if ! echo "$fname" | grep -qP "^\d{11,}_[a-z]"; then
    echo "❌ $fname"
    echo "   Nom invalide : doit correspondre à YYYYMMDDNNN_description_en_minuscules.sql"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # ── Rule 3: prefix must be globally unique ─────────────────────
  duplicate=0
  for i in "${!SEEN_PREFIXES[@]}"; do
    if [[ "${SEEN_PREFIXES[$i]}" == "$prefix" ]]; then
      echo "❌ $fname"
      echo "   Préfixe dupliqué '${prefix}' — déjà utilisé par ${SEEN_FILES[$i]}"
      ERRORS=$((ERRORS + 1))
      duplicate=1
      break
    fi
  done

  if [[ $duplicate -eq 0 ]]; then
    SEEN_PREFIXES+=("$prefix")
    SEEN_FILES+=("$fname")
    echo "  ✅ $fname  (version: $prefix)"
  fi
done

echo ""
if [[ $ERRORS -gt 0 ]]; then
  echo "::error::$ERRORS fichier(s) de migration avec un nom invalide."
  echo ""
  echo "  Règle : YYYYMMDDNNN_description.sql"
  echo "  Exemple valide : 20260430021_add_my_table.sql"
  echo "  Exemple INVALIDE: 20260430_021_add_my_table.sql  ← underscore entre date et version"
  echo ""
  echo "  Conseil : NNN = numéro séquentiel sur 3 chiffres, collé à la date, sans séparateur."
  exit 1
fi

echo "✅ Toutes les migrations respectent la convention de nommage."
