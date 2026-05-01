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
# Exit codes:
#   0 — migrations applied (or none pending)
#   1 — naming violation, duplicate version, or push failure
# =============================================================================
set -euo pipefail

MIGRATIONS_DIR="${MIGRATIONS_DIR:-supabase/migrations}"
MAX_RETRIES="${MAX_RETRIES:-2}"
RETRY_DELAY="${RETRY_DELAY:-10}"

# ── GitHub Actions annotation helpers ────────────────────────────────────────
step()  { echo ""; echo "::group::$*"; }
endg()  { echo "::endgroup::"; }
info()  { echo "  ▶  $*"; }
ok()    { echo "  ✅  $*"; }
err()   { echo "::error::$*"; }
warn()  { echo "  ⚠️   $*"; }

# ── 1. Pre-flight: naming validation ─────────────────────────────────────────
step "Étape 1 — Vérification nommage migrations"
bash "$(dirname "$0")/check-migration-names.sh" "$MIGRATIONS_DIR"
endg

# ── 2. Pre-flight: duplicate version detection ────────────────────────────────
step "Étape 2 — Détection doublons de version"

info "Extraction des préfixes de version..."
VERSIONS=$(
  for f in "$MIGRATIONS_DIR"/*.sql; do
    fname=$(basename "$f")
    echo "${fname%%[^0-9]*}"   # leading digit run only
  done | sort
)

DUPLICATES=$(echo "$VERSIONS" | uniq -d)

if [[ -n "$DUPLICATES" ]]; then
  err "Doublons de version détectés — impossible de continuer :"
  while IFS= read -r dup; do
    echo "  Version '$dup' utilisée par :"
    for f in "$MIGRATIONS_DIR"/*.sql; do
      fname=$(basename "$f")
      prefix="${fname%%[^0-9]*}"
      [[ "$prefix" == "$dup" ]] && echo "    • $fname"
    done
  done <<< "$DUPLICATES"
  echo ""
  echo "  Renommez les fichiers en conflit : YYYYMMDDNNN_description.sql"
  echo "  Si une version est déjà en base, consultez scripts/repair-migrations.sh"
  exit 1
fi

ok "Aucun doublon de version."
endg

# ── 3. Migration list (informational) ─────────────────────────────────────────
step "Étape 3 — État des migrations (supabase migration list)"
supabase migration list || true   # non-fatal: may fail if no pending, still informative
endg

# ── 4. Pending check ──────────────────────────────────────────────────────────
step "Étape 4 — Détection migrations en attente"

PENDING=$(
  supabase migration list 2>&1 \
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
  # Find the filename for this version
  for f in "$MIGRATIONS_DIR"/*.sql; do
    fname=$(basename "$f")
    prefix="${fname%%[^0-9]*}"
    [[ "$prefix" == "$v" ]] && echo "  • $fname" && break
  done
done
endg

# ── 5. db push — non-interactive, with retry on transient network errors ──────
step "Étape 5 — Application des migrations (db push)"

attempt=0
while [[ $attempt -le $MAX_RETRIES ]]; do
  attempt=$((attempt + 1))
  info "Tentative $attempt / $((MAX_RETRIES + 1))..."

  # --yes suppresses the interactive Y/n prompt entirely
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

  # Duplicate key: version already registered — naming bug, not a transient error
  if echo "$OUTPUT" | grep -q "duplicate key value violates unique constraint"; then
    err "Collision de version dans schema_migrations."
    echo "  Une ou plusieurs migrations partagent le même préfixe numérique."
    echo "  Consultez supabase/MIGRATIONS_RULES.md — section 'Cas de base corrompue'."
    exit 1
  fi

  # Orphan remote versions: known recoverable condition
  if echo "$OUTPUT" | grep -q "Remote migration versions not found"; then
    warn "Versions orphelines détectées en base — repair automatique..."
    echo "$OUTPUT" | grep -oP 'Found \K[0-9]+(?= migration)' | while read -r version; do
      info "  supabase migration repair --status reverted $version"
      supabase migration repair --status reverted "$version" || true
    done
    info "Nouvelle tentative après repair..."
    continue
  fi

  # Transient network errors: retry with backoff
  if echo "$OUTPUT" | grep -qE "522|timeout|connection refused|network"; then
    if [[ $attempt -le $MAX_RETRIES ]]; then
      warn "Erreur réseau transitoire — attente ${RETRY_DELAY}s avant retry..."
      sleep "$RETRY_DELAY"
      continue
    fi
  fi

  # Unrecoverable error
  err "db push échoué (code $EXIT_CODE) après $attempt tentative(s)."
  echo "  Logs complets ci-dessus."
  echo "  Consultez : supabase migration list"
  exit 1
done

err "db push échoué après $((MAX_RETRIES + 1)) tentatives."
exit 1
