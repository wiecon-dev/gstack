#!/usr/bin/env bash
# check-careful.sh — Pre-exec guard for /careful skill (OpenClaw)
# Reads JSON from stdin (OpenClaw exec tool input), checks command for destructive patterns.
# Returns JSON to stdout: {"decision": "ask"|"allow", "pattern": "...", "warning": "..."}
#
# OpenClaw contract (NOT Claude Code hooks):
#   - Agents run this BEFORE exec when /careful is active.
#   - If decision=ask, agent MUST call message tool with AskUserQuestion to Adam.
#   - Adam's answer (yes/no) decides whether to proceed with exec.
#
# Replaces Claude Code PreToolUse hook. Lighter footprint, same intent.

set -euo pipefail

INPUT=$(cat)

# Extract "command" from OpenClaw exec tool input (tool_input.command)
CMD=$(printf '%s' "$INPUT" | python3 -c '
import sys, json
try:
    data = json.loads(sys.stdin.read())
    # OpenClaw exec shape: {"tool": "exec", "tool_input": {"command": "..."}}
    tool_input = data.get("tool_input", {})
    if isinstance(tool_input, str):
        tool_input = json.loads(tool_input)
    print(tool_input.get("command", ""))
except Exception:
    print("")
' 2>/dev/null || true)

# If we could not extract, allow (fail-open)
if [ -z "$CMD" ]; then
  echo '{"decision":"allow","pattern":"none","warning":""}'
  exit 0
fi

CMD_LOWER=$(printf '%s' "$CMD" | tr '[:upper:]' '[:lower:]')

# --- Safe exceptions (build artifacts) ---
# If rm -rf targets ONLY build artifacts, allow silently.
if printf '%s' "$CMD" | grep -qE 'rm\s+(-[a-zA-Z]*r[a-zA-Z]*\s+|--recursive\s+)'; then
  SAFE_ONLY=true
  RM_ARGS=$(printf '%s' "$CMD" | sed -E 's/.*rm[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*//;s/--recursive[[:space:]]*//')
  for target in $RM_ARGS; do
    case "$target" in
      */node_modules|node_modules|*/\.next|\.next|*/dist|dist|*/__pycache__|__pycache__|*/\.cache|\.cache|*/build|build|*/\.turbo|\.turbo|*/coverage|coverage)
        ;; # safe target
      -*) ;; # flag, skip
      *) SAFE_ONLY=false; break ;;
    esac
  done
  if [ "$SAFE_ONLY" = true ]; then
    echo '{"decision":"allow","pattern":"rm_safe_artifact","warning":""}'
    exit 0
  fi
fi

# --- Destructive pattern checks ---
WARN=""
PATTERN=""

# rm -rf / rm -r / rm --recursive
if printf '%s' "$CMD" | grep -qE 'rm\s+(-[a-zA-Z]*r|--recursive)'; then
  WARN="Recursive delete (rm -r). This permanently removes files. Confirm with Adam before proceeding."
  PATTERN="rm_recursive"
fi

# DROP TABLE / DROP DATABASE
if [ -z "$WARN" ] && printf '%s' "$CMD_LOWER" | grep -qE 'drop\s+(table|database)'; then
  WARN="SQL DROP detected. Permanently deletes database objects. Confirm with Adam."
  PATTERN="drop_table"
fi

# TRUNCATE
if [ -z "$WARN" ] && printf '%s' "$CMD_LOWER" | grep -qE '\btruncate\b'; then
  WARN="SQL TRUNCATE detected. Deletes all rows from a table. Confirm with Adam."
  PATTERN="truncate"
fi

# git push --force / -f
if [ -z "$WARN" ] && printf '%s' "$CMD" | grep -qE 'git\s+push\s+.*(-f\b|--force)'; then
  WARN="git force-push rewrites remote history. Other contributors may lose work. Confirm with Adam."
  PATTERN="git_force_push"
fi

# git reset --hard
if [ -z "$WARN" ] && printf '%s' "$CMD" | grep -qE 'git\s+reset\s+--hard'; then
  WARN="git reset --hard discards all uncommitted changes. Confirm with Adam."
  PATTERN="git_reset_hard"
fi

# git checkout . / git restore .
if [ -z "$WARN" ] && printf '%s' "$CMD" | grep -qE 'git\s+(checkout|restore)\s+\.'; then
  WARN="Discards all uncommitted changes in working tree. Confirm with Adam."
  PATTERN="git_discard"
fi

# kubectl delete
if [ -z "$WARN" ] && printf '%s' "$CMD" | grep -qE 'kubectl\s+delete'; then
  WARN="kubectl delete removes Kubernetes resources. May impact production. Confirm with Adam."
  PATTERN="kubectl_delete"
fi

# docker rm -f / docker system prune
if [ -z "$WARN" ] && printf '%s' "$CMD" | grep -qE 'docker\s+(rm\s+-f|system\s+prune)'; then
  WARN="Docker force-remove or prune. May delete running containers or cached images. Confirm with Adam."
  PATTERN="docker_destructive"
fi

# --- Output ---
if [ -n "$WARN" ]; then
  WARN_ESCAPED=$(printf '%s' "$WARN" | sed 's/"/\\"/g')
  printf '{"decision":"ask","pattern":"%s","warning":"%s"}\n' "$PATTERN" "$WARN_ESCAPED"
else
  echo '{"decision":"allow","pattern":"none","warning":""}'
fi