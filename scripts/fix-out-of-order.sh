#!/usr/bin/env bash
# =============================================================================
# fix-out-of-order.sh
# Detects local migration files whose version predates the last applied remote
# migration and renames them to a version strictly greater than last remote.
#
# This script fixes the Supabase CLI error:
#   "Found local migration files to be inserted before the last migration"
#
# How it works:
#   1. Calls `supabase migration list` to determine the last applied version
#      (highest version present in BOTH Local and Remote columns).
#   2. Identifies local-only files whose numeric version < last_remote.
#   3. Generates new versions = last_remote + N (N = 1, 2, …) checking for
#      collisions with existing local files.
#   4. Renames files via `git mv` (or plain `mv` for untracked files).
#
# Important: these files have NOT been applied to the DB yet (local-only),
# so no SQL update to schema_migrations is needed — only the filename changes.
#
# Prerequisites:
#   supabase link --project-ref <ref>   (run once before using this script)
#
# Usage:
#   bash scripts/fix-out-of-order.sh              # dry-run: shows plan only
#   bash scripts/fix-out-of-order.sh --apply      # execute renames
#
# Exit codes:
#   0 — nothing to fix, or fixes applied successfully
#   1 — error (missing dependency, naming collision, etc.)
# =============================================================================
set -euo pipefail

APPLY=0
MIGRATIONS_DIR="${MIGRATIONS_DIR:-supabase/migrations}"

for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    --help)
      sed -n '2,/^# ====/p' "$0" | head -n -1 | sed 's/^# \?//'
      exit 0
      ;;
  esac
done

# ── Helpers ───────────────────────────────────────────────────────────────────
step()  { echo ""; echo "──── $* ────"; }
info()  { echo "  ▶  $*"; }
ok()    { echo "  ✅  $*"; }
warn()  { echo "  ⚠️  $*"; }
err()   { echo "::error::$*" >&2; }

# ── 1. Fetch migration state ──────────────────────────────────────────────────
step "État des migrations (supabase migration list)"
RAW=$(supabase migration list 2>&1) || {
  err "Impossible de joindre la base. Vérifiez : supabase link --project-ref <ref>"
  exit 1
}
echo "$RAW"

# ── 2. Find the last applied version (both Local AND Remote) ──────────────────
step "Analyse"

LAST_REMOTE=$(
  echo "$RAW" \
  | awk -F'|' 'NR>3 {
      gsub(/[[:space:]]/,"",$1);
      gsub(/[[:space:]]/,"",$2);
      if ($1 != "" && $2 != "") print $1
    }' \
  | sort -n | tail -1
)

if [[ -z "$LAST_REMOTE" ]]; then
  ok "Aucune migration appliquée en base — pas de contrainte d'ordre."
  exit 0
fi
info "Dernière version appliquée : $LAST_REMOTE"

# ── 3. Find local-only versions that predate last_remote ─────────────────────
LOCAL_ONLY_VERSIONS=$(
  echo "$RAW" \
  | awk -F'|' 'NR>3 {
      gsub(/[[:space:]]/,"",$1);
      gsub(/[[:space:]]/,"",$2);
      if ($1 != "" && $2 == "") print $1
    }'
)

OUT_OF_ORDER_FILES=()
while IFS= read -r v; do
  [[ -z "$v" ]] && continue
  # Numeric comparison (versions fit in bash 64-bit int: max ~20 trillion)
  if (( 10#$v < 10#$LAST_REMOTE )); then
    for f in "$MIGRATIONS_DIR"/*.sql; do
      fname=$(basename "$f")
      prefix="${fname%%[^0-9]*}"
      if [[ "$prefix" == "$v" ]]; then
        OUT_OF_ORDER_FILES+=("$f")
        break
      fi
    done
  fi
done <<< "$LOCAL_ONLY_VERSIONS"

if [[ ${#OUT_OF_ORDER_FILES[@]} -eq 0 ]]; then
  ok "Toutes les migrations locales sont en ordre — aucune correction nécessaire."
  exit 0
fi

warn "${#OUT_OF_ORDER_FILES[@]} migration(s) hors ordre :"
for f in "${OUT_OF_ORDER_FILES[@]}"; do
  prefix="${$(basename "$f")%%[^0-9]*}"
  echo "    • $(basename "$f")  (version $prefix < $LAST_REMOTE)"
done 2>/dev/null || for f in "${OUT_OF_ORDER_FILES[@]}"; do
  fname=$(basename "$f")
  prefix="${fname%%[^0-9]*}"
  echo "    • $fname  (version $prefix < $LAST_REMOTE)"
done

# ── 4. Build rename plan ──────────────────────────────────────────────────────
step "Plan de renommage"

# Index all currently-used local versions to detect collisions
declare -A USED_VERSIONS
for f in "$MIGRATIONS_DIR"/*.sql; do
  [[ -e "$f" ]] || continue
  fname=$(basename "$f")
  prefix="${fname%%[^0-9]*}"
  [[ -n "$prefix" ]] && USED_VERSIONS[$prefix]="$fname"
done

NEXT_VERSION=$(( 10#$LAST_REMOTE + 1 ))
RENAMES=()  # entries: "old_path|new_path"

for filepath in "${OUT_OF_ORDER_FILES[@]}"; do
  fname=$(basename "$filepath")
  old_prefix="${fname%%[^0-9]*}"

  # Extract description: strip leading digits + optional separating underscore
  description=$(echo "$fname" | sed -E 's/^[0-9]+_?(.*)\.sql$/\1/')

  # Find the next available version (skip any already taken)
  while [[ -v "USED_VERSIONS[$NEXT_VERSION]" ]]; do
    NEXT_VERSION=$(( NEXT_VERSION + 1 ))
  done

  new_fname="${NEXT_VERSION}_${description}.sql"
  new_path="${MIGRATIONS_DIR}/${new_fname}"

  echo "  $fname"
  echo "  → $new_fname"
  echo "    version : $old_prefix  →  $NEXT_VERSION"
  echo ""

  RENAMES+=("$filepath|$new_path")
  USED_VERSIONS[$NEXT_VERSION]="$new_fname"
  NEXT_VERSION=$(( NEXT_VERSION + 1 ))
done

# ── 5. Dry-run: stop here ─────────────────────────────────────────────────────
if [[ $APPLY -eq 0 ]]; then
  echo "  Mode dry-run — aucun fichier modifié."
  echo ""
  echo "  Note : ces fichiers N'ont PAS été appliqués en base (local-only)."
  echo "  Il suffit de renommer les fichiers — aucun SQL requis."
  echo ""
  echo "  Pour appliquer le plan ci-dessus :"
  echo "    bash scripts/fix-out-of-order.sh --apply"
  echo ""
  echo "  Puis commiter :"
  echo "    git add supabase/migrations/"
  echo "    git commit -m 'fix(migrations): reorder out-of-order migration(s)'"
  echo "    git push"
  exit 0
fi

# ── 6. Apply renames ──────────────────────────────────────────────────────────
step "Application des renommages"

for entry in "${RENAMES[@]}"; do
  IFS='|' read -r old_path new_path <<< "$entry"
  old_fname=$(basename "$old_path")
  new_fname=$(basename "$new_path")

  if git rev-parse --git-dir > /dev/null 2>&1 && git ls-files --error-unmatch "$old_path" > /dev/null 2>&1; then
    git mv "$old_path" "$new_path"
  else
    mv "$old_path" "$new_path"
  fi
  ok "$old_fname  →  $new_fname"
done

# ── 7. Post-rename validation ─────────────────────────────────────────────────
step "Validation post-renommage"
bash "$(dirname "$0")/check-migration-names.sh" "$MIGRATIONS_DIR"

echo ""
ok "Renommages appliqués."
echo ""
echo "  Prochaines étapes :"
echo "    git add supabase/migrations/"
echo "    git commit -m 'fix(migrations): reorder out-of-order migration(s)'"
echo "    git push"
echo "    → relancer le pipeline CI / bash scripts/db-push.sh"
