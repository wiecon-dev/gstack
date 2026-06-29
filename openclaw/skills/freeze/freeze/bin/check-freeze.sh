#!/usr/bin/env bash
# check-freeze.sh — Pre-write/edit guard for /freeze skill (OpenClaw)
# Reads JSON from stdin (OpenClaw write/edit tool input), checks if file_path
# is within the freeze boundary. Returns JSON: {decision: allow|deny, reason: ...}
#
# OpenClaw contract (NOT Claude Code hooks):
#   - Agent runs this BEFORE write/edit when /freeze is active.
#   - If decision=deny, agent MUST abort the operation.
#   - State file: ~/.openclaw/state/freeze-dir.txt (path with trailing slash)

set -euo pipefail

INPUT=$(cat)

# Locate freeze state file
STATE_DIR="${OPENCLAW_STATE_ROOT:-$HOME/.openclaw/state}"
FREEZE_FILE="$STATE_DIR/freeze-dir.txt"

# If no freeze file, allow everything (freeze not active)
if [ ! -f "$FREEZE_FILE" ]; then
  echo '{"decision":"allow","reason":"freeze_not_active"}'
  exit 0
fi

FREEZE_DIR_RAW=$(tr -d '[:space:]' < "$FREEZE_FILE")
if [ -z "$FREEZE_DIR_RAW" ]; then
  echo '{"decision":"allow","reason":"freeze_dir_empty"}'
  exit 0
fi

# Extract file_path from OpenClaw write/edit tool input
# OpenClaw shape: {"tool": "write"|"edit", "tool_input": {"file_path": "...", "content": "..."}}
FILE_PATH=$(printf '%s' "$INPUT" | python3 -c '
import sys, json
try:
    data = json.loads(sys.stdin.read())
    tool_input = data.get("tool_input", {})
    if isinstance(tool_input, str):
        tool_input = json.loads(tool_input)
    print(tool_input.get("file_path", ""))
except Exception:
    print("")
' 2>/dev/null || true)

# If we could not extract, allow (fail-open on parse)
if [ -z "$FILE_PATH" ]; then
  echo '{"decision":"allow","reason":"parse_error_fail_open"}'
  exit 0
fi

# Resolve file_path to absolute if not already
case "$FILE_PATH" in
  /*) ;;
  *) FILE_PATH="$(pwd)/$FILE_PATH" ;;
esac

# Use realpath if available for robust symlink/.. resolution; fall back to cd/pwd-P
if command -v realpath >/dev/null 2>&1; then
  FREEZE_DIR=$(realpath -m "$FREEZE_DIR_RAW")
  FILE_PATH=$(realpath -m "$FILE_PATH")
else
  # Normalize manually
  FILE_PATH=$(printf '%s' "$FILE_PATH" | sed 's|/\+|/|g;s|/$||')
  _resolve_path() {
    local _dir _base
    _dir="$(dirname "$1")"
    _base="$(basename "$1")"
    _dir="$(cd "$_dir" 2>/dev/null && pwd -P || printf '%s' "$_dir")"
    printf '%s/%s' "$_dir" "$_base"
  }
  FILE_PATH=$(_resolve_path "$FILE_PATH")
  FREEZE_DIR=$(_resolve_path "$FREEZE_DIR_RAW")
fi

# Ensure boundary ends with exactly one slash for prefix comparison
FREEZE_DIR="${FREEZE_DIR%/}/"

# Check: does the file path start with the freeze directory?
case "$FILE_PATH" in
  "${FREEZE_DIR}"*|"${FREEZE_DIR%/}")
    echo '{"decision":"allow","reason":"within_freeze_boundary"}'
    ;;
  *)
    REASON_ESCAPED=$(printf '%s' "$FILE_PATH" | sed 's/"/\\"/g')
    BOUNDARY_ESCAPED=$(printf '%s' "$FREEZE_DIR" | sed 's/"/\\"/g')
    printf '{"decision":"deny","reason":"outside_freeze_boundary","file_path":"%s","boundary":"%s"}\n' "$REASON_ESCAPED" "$BOUNDARY_ESCAPED"
    ;;
esac