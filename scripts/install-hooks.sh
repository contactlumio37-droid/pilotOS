#!/usr/bin/env bash
# =============================================================================
# install-hooks.sh
# Installs git hooks for this repository.
# Run once after cloning: bash scripts/install-hooks.sh
# =============================================================================
set -euo pipefail

HOOKS_DIR="$(git rev-parse --git-dir)/hooks"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

install_hook() {
  local name="$1"
  local source="$SCRIPT_DIR/../.githooks/$name"

  if [[ ! -f "$source" ]]; then
    echo "  ⚠️  Hook source not found: $source"
    return
  fi

  cp "$source" "$HOOKS_DIR/$name"
  chmod +x "$HOOKS_DIR/$name"
  echo "  ✅ $name installed"
}

echo "Installing git hooks..."
mkdir -p "$HOOKS_DIR"
install_hook "pre-commit"
echo "Done."
