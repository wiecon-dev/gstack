#!/usr/bin/env bash
# mermaid-generate.sh — Generate a .mmd source file from an English description
# using the default OpenClaw LLM endpoint (Ollama-compatible, configurable).
#
# Usage:
#   mermaid-generate.sh "description of the diagram" /path/to/outdir [slug]
#
# If slug is omitted, derived from first 5 words of description.
#
# Environment:
#   OPENCLAW_LLM_BASE_URL — default: http://localhost:11434/v1
#   MODEL                 — default: "" (server picks its own default model)
#   MAX_TOKENS            — default: 1024
#   TEMPERATURE           — default: 0.2

set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: mermaid-generate.sh \"description\" /path/to/outdir [slug]" >&2
  exit 1
fi

DESC="$1"
OUTDIR="$2"
SLUG="${3:-}"

OPENCLAW_LLM_BASE_URL="${OPENCLAW_LLM_BASE_URL:-http://localhost:11434/v1}"
MODEL="${MODEL:-}"
MAX_TOKENS="${MAX_TOKENS:-1024}"
TEMPERATURE="${TEMPERATURE:-0.2}"

if [ -z "$SLUG" ]; then
  SLUG=$(printf '%s' "$DESC" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '_' | sed 's/^_*//;s/_*$//' | cut -d'_' -f1-5)
  SLUG="${SLUG:-diagram}"
fi

if [ -z "$DESC" ]; then
  echo '{"error":"description must not be empty"}' >&2
  exit 1
fi

mkdir -p "$OUTDIR"
MMD="$OUTDIR/$SLUG.mmd"

MODEL_BLOCK=""
if [ -n "$MODEL" ]; then
  MODEL_BLOCK=$(printf '"model": "%s",' "$MODEL")
fi

python3 - "$DESC" "$MMD" "$OPENCLAW_LLM_BASE_URL" "$MODEL_BLOCK" "$MAX_TOKENS" "$TEMPERATURE" <<'PYEOF'
import sys, json, urllib.request, urllib.error

desc, out_path, base_url, model_block, max_tokens, temperature = sys.argv[1:7]
max_tokens = int(max_tokens)
temperature = float(temperature)

prompt = f"""You are a technical diagram assistant. Convert the following description into a valid Mermaid flowchart (graph TD / graph LR) or sequence diagram. Output ONLY the mermaid source code, no explanation, no markdown fences.

Description: {desc}

Mermaid source:"""

body_obj = {
    "messages": [{"role": "user", "content": prompt}],
    "temperature": temperature,
    "max_tokens": max_tokens,
}

if model_block:
    # model_block is ' "model": "NAME",'
    body_obj["model"] = model_block.split('"')[-2]

body = json.dumps(body_obj).encode('utf-8')

req = urllib.request.Request(
    f"{base_url}/chat/completions",
    data=body,
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        content = data["choices"][0]["message"]["content"]
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1]
        if content.endswith("```"):
            content = content.rsplit("\n", 1)[0]
        content = content.strip()
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(json.dumps({"success": True, "mmd": out_path}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}), file=sys.stderr)
    sys.exit(1)
PYEOF

if [ ! -f "$MMD" ]; then
  echo '{"error":"failed to generate .mmd"}' >&2
  exit 1
fi
