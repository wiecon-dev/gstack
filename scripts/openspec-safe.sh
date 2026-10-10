#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
openspec_bin="$repo_root/node_modules/.bin/openspec"

if [[ ! -x "$openspec_bin" ]]; then
  echo "OpenSpec CLI is missing. Run: bun install --ignore-scripts" >&2
  exit 1
fi

export OPENSPEC_TELEMETRY=0
export DO_NOT_TRACK=1
export OPENSPEC_NO_UPDATE_CHECK=1
export OPENSPEC_NO_AUTO_CONFIG=1
export OPENSPEC_NO_ANIMATION=1

exec "$openspec_bin" "$@"
