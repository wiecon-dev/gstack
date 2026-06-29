#!/usr/bin/env bash
# freeze-set.sh — Set or clear the freeze boundary
# Usage:
#   freeze-set.sh /path/to/dir    # set boundary
#   freeze-set.sh --clear         # remove boundary
#   freeze-set.sh --show          # show current boundary
set -euo pipefail

STATE_DIR="${OPENCLAW_STATE_ROOT:-$HOME/.openclaw/state}"
FREEZE_FILE="$STATE_DIR/freeze-dir.txt"

mkdir -p "$STATE_DIR"

case "${1:-}" in
  --clear)
    rm -f "$FREEZE_FILE"
    echo '{"decision":"cleared","boundary":""}'
    ;;
  --show)
    if [ -f "$FREEZE_FILE" ]; then
      FREEZE_DIR=$(tr -d '[:space:]' < "$FREEZE_FILE")
      BOUNDARY_ESCAPED=$(printf '%s' "$FREEZE_DIR" | sed 's/"/\\"/g')
      printf '{"decision":"active","boundary":"%s"}\n' "$BOUNDARY_ESCAPED"
    else
      echo '{"decision":"inactive","boundary":""}'
    fi
    ;;
  "")
    echo "Usage: freeze-set.sh <path>|--clear|--show" >&2
    exit 1
    ;;
  *)
    # Resolve to absolute, ensure trailing slash
    TARGET="$(cd "$1" 2>/dev/null && pwd || { echo "Path not found: $1" >&2; exit 1; })"
    TARGET="${TARGET%/}/"
    printf '%s' "$TARGET" > "$FREEZE_FILE"
    BOUNDARY_ESCAPED=$(printf '%s' "$TARGET" | sed 's/"/\\"/g')
    printf '{"decision":"set","boundary":"%s"}\n' "$BOUNDARY_ESCAPED"
    ;;
esac