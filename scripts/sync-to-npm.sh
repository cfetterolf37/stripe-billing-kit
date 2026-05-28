#!/bin/bash
# scripts/sync-to-npm.sh
#
# Syncs the kit files from this dev project into the npm package template.
# Run this before every npm publish.
#
# Usage:
#   ./scripts/sync-to-npm.sh
#   ./scripts/sync-to-npm.sh --dry-run

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE="$(cd "$SCRIPT_DIR/.." && pwd)"
NPM_DIR="$(cd "$SOURCE/../create-stripe-billing-kit" && pwd)"
TEMPLATE="$NPM_DIR/template"

DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN=true
fi

# ─── Helpers ──────────────────────────────────────────────────────────────────

log() { echo "  $*"; }
header() { echo ""; echo "$*"; }

maybe_rm() {
  if [[ "$DRY_RUN" == "true" ]]; then
    log "[dry-run] rm -rf $1"
  else
    rm -rf "$1"
  fi
}

maybe_cp() {
  if [[ "$DRY_RUN" == "true" ]]; then
    log "[dry-run] cp -r $1 → $2"
  else
    cp -r "$1" "$2"
    log "✓ $(basename "$1")"
  fi
}

maybe_cp_file() {
  if [[ "$DRY_RUN" == "true" ]]; then
    log "[dry-run] cp $1 → $2"
  else
    cp "$1" "$2"
    log "✓ $(basename "$1")"
  fi
}

# ─── Verify npm package dir exists ───────────────────────────────────────────

if [[ ! -d "$NPM_DIR" ]]; then
  echo "Error: npm package directory not found at $NPM_DIR"
  echo "Expected: $(dirname "$SOURCE")/create-stripe-billing-kit"
  exit 1
fi

header "Stripe Billing Kit — sync to npm package"
echo ""
echo "  Source : $SOURCE"
echo "  Target : $NPM_DIR"
[[ "$DRY_RUN" == "true" ]] && echo "  Mode   : dry-run (no files changed)"
echo ""

# ─── Sync template/ ───────────────────────────────────────────────────────────

header "Clearing template/..."
maybe_rm "$TEMPLATE"
[[ "$DRY_RUN" == "false" ]] && mkdir -p "$TEMPLATE"

header "Copying directories into template/..."
for dir in app components docs hooks lib supabase types; do
  maybe_cp "$SOURCE/$dir" "$TEMPLATE/$dir"
done

header "Copying files into template/..."
for file in middleware.ts vercel.json .env.example CLAUDE.md tailwind.config.ts tsconfig.json; do
  maybe_cp_file "$SOURCE/$file" "$TEMPLATE/$file"
done

# ─── Sync npm package root files ─────────────────────────────────────────────

header "Updating npm package root..."
maybe_cp_file "$SOURCE/package.npm.json" "$NPM_DIR/package.json"
maybe_cp_file "$SOURCE/cli/create.js" "$NPM_DIR/cli/create.js"
maybe_cp_file "$SOURCE/README.md" "$NPM_DIR/README.md"

# ─── Done ─────────────────────────────────────────────────────────────────────

TEMPLATE_COUNT=$(find "$TEMPLATE" -type f 2>/dev/null | wc -l | tr -d ' ')
echo ""
echo "  Done. $TEMPLATE_COUNT files in template/."
echo ""
echo "  To publish:"
echo "    cd $NPM_DIR"
echo "    npm publish"
echo ""
