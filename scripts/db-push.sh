#!/usr/bin/env bash
# =============================================================================
# db-push.sh
# Production-ready, fully non-interactive Supabase migration runner.
#
# Usage (CI):
#   SUPABASE_DB_PASSWORD=... bash scripts/db-push.sh
#
# Usage (local):
#   supabase link --project-ref <ref>
#   SUPABASE_DB_PASSWORD=... bash scripts/db-push.sh
#
# Recovery modes (set via env or flag):
#   DEV_RESET=1   bash scripts/db-push.sh   → supabase db reset --linked (dev only)
#   DRY_RUN=1     bash scripts/db-push.sh   → skips actual db push, prints plan
#
# Exit codes:
#   0 — migrations applied (or none pending)
#   1 — naming violation, duplicate version, or unrecoverable push failure
# =============================================================================
set -euo pipefail

MIGRATIONS_DIR="${MIGRATIONS_DIR:-supabase/migrations}"
MAX_RETRIES="${MAX_RETRIES:-2}"
RETRY_DELAY="${RETRY_DELAY:-10}"
DEV_RESET="${DEV_RESET:-0}"
DRY_RUN="${DRY_RUN:-0}"

for arg in "$@"; do
  case "$arg" in
    --dev-reset) DEV_RESET=1 ;;
    --dry-run)   DRY_RUN=1 ;;
  esac
done

# ── GitHub Actions annotation helpers ────────────────────────────────────────
step()  { echo ""; echo "::group::$*"; }
endg()  { echo "::endgroup::"; }
info()  { echo "  ▶  $*"; }
ok()    { echo "  ✅  $*"; }
err()   { echo "::error::$*"; }
warn()  { echo "  ⚠️   $*"; }

# ── DEV_RESET mode ────────────────────────────────────────────────────────────
# WARNING: destroys all data in the linked project — DEV ONLY.
if [[ $DEV_RESET -eq 1 ]]; then
  warn "DEV_RESET=1 — supabase db reset --linked (DEV uniquement)"
  if [[ "${CI:-}" == "true" ]]; then
    err "DEV_RESET interdit en CI — risque de destruction de données staging/prod."
    exit 1
  fi
  supabase db reset --linked
  ok "Reset terminé."
  exit 0
fi

# ── 1. Pre-flight: naming validation ─────────────────────────────────────────
step "Étape 1 — Vérification nommage migrations"
bash "$(dirname "$0")/check-migration-names.sh" "$MIGRATIONS_DIR"
endg

# ── 2. Pre-flight: duplicate version detection ────────────────────────────────
step "Étape 2 — Détection doublons de version"

info "Extraction des préfixes de version..."

# Extract the leading digit run for each file (same logic Supabase CLI uses).
# ls -1 is stable; sed strips everything after the first non-digit character.
DUPLICATES=$(
  ls "$MIGRATIONS_DIR" \
  | sed -E 's/^([0-9]+).*/\1/' \
  | sort | uniq -d
)

if [[ -n "$DUPLICATES" ]]; then
  err "Doublons de version détectés — impossible de continuer :"
  while IFS= read -r dup; do
    echo "  Version '$dup' partagée par :"
    for f in "$MIGRATIONS_DIR"/*.sql; do
      fname=$(basename "$f")
      prefix=$(echo "$fname" | sed -E 's/^([0-9]+).*/\1/')
      [[ "$prefix" == "$dup" ]] && echo "    • $fname"
    done
  done <<< "$DUPLICATES"
  echo ""
  echo "  Correction : bash scripts/rename-migrations-to-timestamp.sh"
  echo "  Référence  : supabase/MIGRATIONS_RULES.md"
  exit 1
fi

ok "Aucun doublon de version."
endg

# ── 4. Orphan repair (proactive) + pending check ──────────────────────────────
step "Étape 4 — Synchronisation locale/distante"

MIGRATION_LIST=$(supabase migration list 2>&1 || true)
echo "$MIGRATION_LIST"

# Remote-only rows = versions in DB with no matching local file → must repair
ORPHANS=$(
  echo "$MIGRATION_LIST" \
  | awk -F'|' 'NR>3 {
      gsub(/[[:space:]]/,"",$1);
      gsub(/[[:space:]]/,"",$2);
      if ($1 == "" && $2 != "") print $2
    }' || true
)

if [[ -n "$ORPHANS" ]]; then
  warn "Versions orphelines en base (Remote sans Local) — repair proactif..."
  while IFS= read -r version; do
    [[ -z "$version" ]] && continue
    info "  supabase migration repair --status reverted $version"
    supabase migration repair --status reverted "$version"
  done <<< "$ORPHANS"
  ok "Orphelins réparés — relecture de l'état..."
  MIGRATION_LIST=$(supabase migration list 2>&1 || true)
  echo "$MIGRATION_LIST"
else
  ok "Aucun orphelin détecté."
fi

# Local-only rows = pending migrations not yet applied to remote
PENDING=$(
  echo "$MIGRATION_LIST" \
  | awk -F'|' 'NR>3 {
      gsub(/[[:space:]]/,"",$1);
      gsub(/[[:space:]]/,"",$2);
      if ($1 != "" && $2 == "") print $1
    }' || true
)

if [[ -z "$PENDING" ]]; then
  ok "Aucune migration en attente — base à jour."
  endg
  exit 0
fi

PENDING_COUNT=$(echo "$PENDING" | wc -l | tr -d ' ')
info "$PENDING_COUNT migration(s) en attente :"
echo "$PENDING" | while read -r v; do
  for f in "$MIGRATIONS_DIR"/*.sql; do
    fname=$(basename "$f")
    prefix=$(echo "$fname" | sed -E 's/^([0-9]+).*/\1/')
    [[ "$prefix" == "$v" ]] && echo "    • $fname" && break
  done
done
endg

# ── DRY_RUN: stop here ────────────────────────────────────────────────────────
if [[ $DRY_RUN -eq 1 ]]; then
  warn "DRY_RUN=1 — db push non exécuté. Plan affiché ci-dessus."
  exit 0
fi

# ── 5. db push — non-interactive, with retry on transient network errors ──────
step "Étape 5 — Application des migrations (db push)"

attempt=0
while [[ $attempt -le $MAX_RETRIES ]]; do
  attempt=$((attempt + 1))
  info "Tentative $attempt / $((MAX_RETRIES + 1))..."

  OUTPUT=$(supabase db push \
    --password "$SUPABASE_DB_PASSWORD" \
    --yes \
    2>&1) && EXIT_CODE=0 || EXIT_CODE=$?

  echo "$OUTPUT"

  if [[ $EXIT_CODE -eq 0 ]]; then
    ok "Migrations appliquées avec succès."
    endg
    exit 0
  fi

  # ── Duplicate key: naming bug, not transient — hard fail ──────────────────
  if echo "$OUTPUT" | grep -q "duplicate key value violates unique constraint"; then
    err "Collision de version dans schema_migrations."
    echo "  Cause : deux fichiers partagent le même préfixe numérique."
    echo ""
    echo "  Diagnostic :"
    echo "    SUPABASE_DB_PASSWORD=... bash scripts/diagnose-migrations.sh"
    echo ""
    echo "  Correction (DEV) :"
    echo "    bash scripts/rename-migrations-to-timestamp.sh --apply"
    echo ""
    echo "  Correction (PROD) — nettoyage ciblé dans une transaction :"
    echo "    BEGIN;"
    echo "    -- Supprimer uniquement la version fantôme (préfixe court/dupliqué) :"
    echo "    DELETE FROM supabase_migrations.schema_migrations"
    echo "      WHERE version = '<version_fantome>'"
    echo "        AND inserted_at = (SELECT MIN(inserted_at)"
    echo "                           FROM supabase_migrations.schema_migrations"
    echo "                          WHERE version = '<version_fantome>');"
    echo "    COMMIT;"
    exit 1
  fi

  # ── Orphan remote versions: fallback repair then retry ───────────────────────
  if echo "$OUTPUT" | grep -q "Remote migration versions not found"; then
    warn "Versions orphelines en base — repair fallback..."
    # Supabase CLI prints the exact repair command needed: extract the version
    ORPHANS=$(echo "$OUTPUT" | grep -oP '(?<=--status reverted )[0-9]+' || true)
    if [[ -z "$ORPHANS" ]]; then
      err "Impossible d'extraire la version orpheline depuis l'output CLI."
      err "Repair manuel requis : supabase migration repair --status reverted <version>"
      exit 1
    fi
    while IFS= read -r version; do
      [[ -z "$version" ]] && continue
      info "  repair --status reverted $version"
      supabase migration repair --status reverted "$version"
    done <<< "$ORPHANS"
    info "Nouvelle tentative après repair..."
    continue
  fi

  # ── Transient network errors: retry with backoff ───────────────────────────
  if echo "$OUTPUT" | grep -qE "522|timeout|connection refused|network error"; then
    if [[ $attempt -le $MAX_RETRIES ]]; then
      warn "Erreur réseau — attente ${RETRY_DELAY}s avant retry (tentative $attempt/$MAX_RETRIES)..."
      sleep "$RETRY_DELAY"
      RETRY_DELAY=$((RETRY_DELAY * 2))   # exponential backoff
      continue
    fi
  fi

  # ── Unrecoverable error ────────────────────────────────────────────────────
  err "db push échoué (code $EXIT_CODE) après $attempt tentative(s)."
  echo "  Logs complets ci-dessus."
  echo "  Consultez : supabase migration list"
  echo "  Diagnostic complet : SUPABASE_DB_PASSWORD=... bash scripts/diagnose-migrations.sh"
  endg
  exit 1
done

err "db push échoué après $((MAX_RETRIES + 1)) tentatives."
exit 1
