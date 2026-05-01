#!/usr/bin/env bash
# =============================================================================
# repair-migrations.sh
# Diagnoses and repairs Supabase schema_migrations desync.
#
# Usage:
#   bash scripts/repair-migrations.sh [--auto] [--dry-run]
#
#   --auto     Apply repairs without confirmation prompt (for CI)
#   --dry-run  Print what would be done, touch nothing
#
# Prerequisites: supabase CLI linked to the target project
#                (run: supabase link --project-ref <ref>)
# =============================================================================
set -euo pipefail

AUTO=0
DRY_RUN=0
for arg in "$@"; do
  [[ "$arg" == "--auto"    ]] && AUTO=1
  [[ "$arg" == "--dry-run" ]] && DRY_RUN=1
done

MIGRATIONS_DIR="${MIGRATIONS_DIR:-supabase/migrations}"

info()    { echo "  ▶  $*"; }
ok()      { echo "  ✅  $*"; }
warn()    { echo "  ⚠️   $*"; }
err()     { echo "::error::$*"; }
section() { echo ""; echo "════════════════════════════════════════"; echo "  $*"; echo "════════════════════════════════════════"; }

# ── 1. Current state ──────────────────────────────────────────────────────────
section "État des migrations"
supabase migration list || {
  err "Impossible de joindre la base. Vérifiez supabase link et les credentials."
  exit 1
}

# ── 2. Parse migration list output ───────────────────────────────────────────
section "Analyse"

RAW=$(supabase migration list 2>&1)

LOCAL_ONLY=$(echo "$RAW" | awk -F'|' 'NR>3 {
  gsub(/[[:space:]]/,"",$1);
  gsub(/[[:space:]]/,"",$2);
  if ($1 != "" && $2 == "") print $1
}')

REMOTE_ONLY=$(echo "$RAW" | awk -F'|' 'NR>3 {
  gsub(/[[:space:]]/,"",$1);
  gsub(/[[:space:]]/,"",$2);
  if ($1 == "" && $2 != "") print $2
}')

if [[ -z "$LOCAL_ONLY" && -z "$REMOTE_ONLY" ]]; then
  ok "Base parfaitement synchronisée — aucune action requise."
  exit 0
fi

if [[ -n "$LOCAL_ONLY" ]]; then
  warn "Versions locales sans équivalent distant (migrations non appliquées) :"
  echo "$LOCAL_ONLY" | while read -r v; do echo "    $v"; done
fi

if [[ -n "$REMOTE_ONLY" ]]; then
  warn "Versions distantes sans fichier local (versions orphelines en base) :"
  echo "$REMOTE_ONLY" | while read -r v; do echo "    $v  ← sera marquée 'reverted'"; done
fi

# ── 3. Confirmation (skipped in auto/dry-run mode) ───────────────────────────
if [[ $DRY_RUN -eq 1 ]]; then
  warn "Mode dry-run — aucune modification effectuée."
  exit 0
fi

if [[ $AUTO -eq 0 ]]; then
  echo ""
  read -r -p "  Lancer le repair des versions orphelines ? (y/N) " confirm
  [[ "$confirm" != "y" && "$confirm" != "Y" ]] && { info "Annulé."; exit 0; }
fi

# ── 4. Repair orphan remote versions ─────────────────────────────────────────
if [[ -n "$REMOTE_ONLY" ]]; then
  section "Repair — versions distantes orphelines"
  echo "$REMOTE_ONLY" | while read -r version; do
    [[ -z "$version" ]] && continue
    info "Marquer '$version' comme reverted..."
    supabase migration repair --status reverted "$version" \
      && ok "  $version → reverted" \
      || warn "  $version — repair ignoré (déjà aligné ?)"
  done
fi

# ── 5. Post-repair state ──────────────────────────────────────────────────────
section "État après repair"
supabase migration list

echo ""
ok "Repair terminé."
echo ""
echo "  Prochaines étapes :"
echo "    1. Vérifiez le tableau ci-dessus (toutes les lignes Local = Remote)"
echo "    2. Relancez le pipeline CI / db push"
echo "    3. Si des migrations locales restent non appliquées :"
echo "       bash scripts/db-push.sh"
