#!/usr/bin/env bash
# =============================================================================
# rename-migrations-to-timestamp.sh
# Converts migration filenames from any leading-digit prefix to the canonical
# 14-digit YYYYMMDDHHMMSS format, eliminating version collisions permanently.
#
# How the new timestamp is derived:
#   YYYYMMDD  — date already encoded in the filename
#   HHMMSS    — sequential number (NNN) → NNN × 100, zero-padded to 6 digits
#               e.g. seq 3 → 000300 (00:03:00), seq 17 → 001700 (00:17:00)
#
# Usage:
#   bash scripts/rename-migrations-to-timestamp.sh [options] [migrations_dir]
#
# Options:
#   --apply      Execute the git mv commands (default: dry-run, prints only)
#   --sql-only   Print only the SQL UPDATE statements for schema_migrations
#   --help       Show this help
#
# Dry-run (default): prints git mv commands + SQL repair statements, no changes.
# --apply:           Runs git mv; SQL must still be applied manually in the DB.
#
# Workflow for already-applied migrations:
#   1. Run with --sql-only, pipe to your DB or paste into Supabase SQL editor
#   2. Run with --apply to rename the local files
#   3. Run check-migration-names.sh to verify the result
#
# Exit: 0 = success (or no files to rename in --apply mode), 1 = error
# =============================================================================
set -euo pipefail

APPLY=0
SQL_ONLY=0
MIGRATIONS_DIR="supabase/migrations"

for arg in "$@"; do
  case "$arg" in
    --apply)    APPLY=1 ;;
    --sql-only) SQL_ONLY=1 ;;
    --help)
      sed -n '2,/^# ====/p' "$0" | head -n -1 | sed 's/^# \?//'
      exit 0
      ;;
    -*)
      echo "Argument inconnu : $arg  (--apply | --sql-only | --help)" >&2
      exit 1
      ;;
    *)
      MIGRATIONS_DIR="$arg"
      ;;
  esac
done

# ── Helpers ──────────────────────────────────────────────────────────────────
info()  { [[ $SQL_ONLY -eq 0 ]] && echo "  ▶  $*" || true; }
ok()    { [[ $SQL_ONLY -eq 0 ]] && echo "  ✅  $*" || true; }
warn()  { [[ $SQL_ONLY -eq 0 ]] && echo "  ⚠️   $*" || true; }
err()   { echo "ERROR: $*" >&2; }
header(){ [[ $SQL_ONLY -eq 0 ]] && { echo ""; echo "──── $* ────"; } || true; }

# ── Parse a migration filename into (date, seq, description) ─────────────────
# Sets: DATE_PART, SEQ_PART, DESC_PART, OLD_PREFIX, NEW_PREFIX, NEW_NAME
parse_migration() {
  local fname="$1"
  DATE_PART="" SEQ_PART="" DESC_PART="" OLD_PREFIX="" NEW_PREFIX="" NEW_NAME=""

  # Case 1: YYYYMMDDHHMMSS_desc.sql — already 14 digits, nothing to do
  if [[ "$fname" =~ ^([0-9]{14})_([a-z][a-z0-9_]*)\.sql$ ]]; then
    OLD_PREFIX="${BASH_REMATCH[1]}"
    NEW_PREFIX="$OLD_PREFIX"
    NEW_NAME="$fname"
    DATE_PART="${OLD_PREFIX:0:8}"
    SEQ_PART="${OLD_PREFIX:8}"
    DESC_PART="${BASH_REMATCH[2]}"
    return 0
  fi

  # Case 2: YYYYMMDDNNN_desc.sql — 11-digit (current standard)
  if [[ "$fname" =~ ^([0-9]{8})([0-9]{3})_([a-z][a-z0-9_]*)\.sql$ ]]; then
    DATE_PART="${BASH_REMATCH[1]}"
    SEQ_PART="${BASH_REMATCH[2]}"
    DESC_PART="${BASH_REMATCH[3]}"
    OLD_PREFIX="${DATE_PART}${SEQ_PART}"
    local seq_int=$((10#$SEQ_PART))   # strip leading zeros for arithmetic
    NEW_PREFIX="${DATE_PART}$(printf '%06d' $((seq_int * 100)))"
    NEW_NAME="${NEW_PREFIX}_${DESC_PART}.sql"
    return 0
  fi

  # Case 3: YYYYMMDD_NNN_desc.sql — malformed (underscore between date and seq)
  if [[ "$fname" =~ ^([0-9]{8})_([0-9]{3})_([a-z][a-z0-9_]*)\.sql$ ]]; then
    DATE_PART="${BASH_REMATCH[1]}"
    SEQ_PART="${BASH_REMATCH[2]}"
    DESC_PART="${BASH_REMATCH[3]}"
    OLD_PREFIX="${DATE_PART}"   # what Supabase CLI actually stored in schema_migrations
    local seq_int=$((10#$SEQ_PART))
    NEW_PREFIX="${DATE_PART}$(printf '%06d' $((seq_int * 100)))"
    NEW_NAME="${NEW_PREFIX}_${DESC_PART}.sql"
    return 0
  fi

  # Case 4: Unknown format — skip with warning
  err "Format non reconnu, fichier ignoré : $fname"
  return 1
}

# ── Collect and process files ─────────────────────────────────────────────────
header "Analyse des migrations dans $MIGRATIONS_DIR"

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  err "Répertoire introuvable : $MIGRATIONS_DIR"
  exit 1
fi

shopt -s nullglob
files=("$MIGRATIONS_DIR"/*.sql)
shopt -u nullglob

if [[ ${#files[@]} -eq 0 ]]; then
  warn "Aucun fichier .sql trouvé dans $MIGRATIONS_DIR"
  exit 0
fi

RENAMES=()      # "old_path|new_path|old_prefix|new_prefix|is_malformed"
ALREADY_OK=()   # files already at 14 digits
ERRORS=0

for filepath in "${files[@]}"; do
  fname=$(basename "$filepath")
  if ! parse_migration "$fname"; then
    ERRORS=$((ERRORS + 1))
    continue
  fi

  if [[ "$fname" == "$NEW_NAME" ]]; then
    ALREADY_OK+=("$fname")
    continue
  fi

  # Detect if this is the malformed YYYYMMDD_NNN_ case (DB version is truncated)
  is_malformed=0
  if [[ "$fname" =~ ^[0-9]{8}_[0-9]{3}_ ]]; then
    is_malformed=1
  fi

  RENAMES+=("${filepath}|${MIGRATIONS_DIR}/${NEW_NAME}|${OLD_PREFIX}|${NEW_PREFIX}|${is_malformed}")
done

# ── Print already-ok files ────────────────────────────────────────────────────
if [[ ${#ALREADY_OK[@]} -gt 0 && $SQL_ONLY -eq 0 ]]; then
  info "${#ALREADY_OK[@]} fichier(s) déjà au format YYYYMMDDHHMMSS — aucun changement."
fi

# ── Nothing to do ─────────────────────────────────────────────────────────────
if [[ ${#RENAMES[@]} -eq 0 && $ERRORS -eq 0 ]]; then
  ok "Toutes les migrations sont déjà au bon format."
  exit 0
fi

# ── Output SQL repair statements ──────────────────────────────────────────────
header "Requêtes SQL — à exécuter AVANT de renommer les fichiers"

if [[ $SQL_ONLY -eq 0 ]]; then
  echo ""
  echo "  IMPORTANT : exécutez ce SQL dans supabase_migrations.schema_migrations"
  echo "  AVANT d'appliquer les renommages (--apply)."
  echo "  Sans ce correctif, Supabase CLI détectera un décalage local/remote."
  echo ""
  echo "BEGIN;"
fi

for entry in "${RENAMES[@]}"; do
  IFS='|' read -r old_path new_path old_prefix new_prefix is_malformed <<< "$entry"
  old_fname=$(basename "$old_path")
  new_fname=$(basename "$new_path")

  old_name_no_ext="${old_fname%.sql}"
  new_name_no_ext="${new_fname%.sql}"

  # SQL: update the version + name in schema_migrations
  cat <<SQL
UPDATE supabase_migrations.schema_migrations
   SET version = '${new_prefix}',
       name    = '${new_name_no_ext}'
 WHERE version = '${old_prefix}'
   AND name    = '${old_name_no_ext}';
SQL
done

if [[ $SQL_ONLY -eq 0 ]]; then
  echo "COMMIT;"
  echo ""
fi

[[ $SQL_ONLY -eq 1 ]] && exit 0

# ── Print git mv commands (dry-run) or execute them (--apply) ─────────────────
header "Renommages de fichiers"
echo ""

if [[ $APPLY -eq 0 ]]; then
  echo "  Mode dry-run — aucun fichier modifié."
  echo "  Relancez avec --apply pour appliquer les git mv."
  echo ""
fi

for entry in "${RENAMES[@]}"; do
  IFS='|' read -r old_path new_path old_prefix new_prefix is_malformed <<< "$entry"
  old_fname=$(basename "$old_path")
  new_fname=$(basename "$new_path")

  if [[ $is_malformed -eq 1 ]]; then
    echo "  ⚠️  [MALFORMÉ — version DB '${old_prefix}' (tronquée)]"
  fi
  echo "  git mv ${old_path} ${new_path}"
  echo "       ${old_fname}"
  echo "    →  ${new_fname}"
  echo ""

  if [[ $APPLY -eq 1 ]]; then
    if git mv "$old_path" "$new_path" 2>/dev/null; then
      ok "Renommé : $new_fname"
    else
      # fallback: mv without git (untracked file)
      mv "$old_path" "$new_path"
      ok "Renommé (mv) : $new_fname"
    fi
  fi
done

# ── Summary ───────────────────────────────────────────────────────────────────
header "Résumé"
echo ""
echo "  Fichiers à renommer  : ${#RENAMES[@]}"
echo "  Déjà au bon format   : ${#ALREADY_OK[@]}"
[[ $ERRORS -gt 0 ]] && echo "  Formats inconnus     : $ERRORS (ignorés)"
echo ""

if [[ $APPLY -eq 0 ]]; then
  echo "  Étapes suivantes :"
  echo "    1. Appliquez le SQL ci-dessus dans votre base Supabase"
  echo "    2. bash scripts/rename-migrations-to-timestamp.sh --apply"
  echo "    3. bash scripts/check-migration-names.sh"
  echo "    4. git add supabase/migrations && git commit"
else
  echo "  Renommages appliqués. Vérification..."
  echo ""
  bash "$(dirname "$0")/check-migration-names.sh" "$MIGRATIONS_DIR" && ok "Validation OK."
fi

[[ $ERRORS -gt 0 ]] && exit 1
exit 0
