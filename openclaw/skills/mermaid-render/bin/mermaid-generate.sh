#!/usr/bin/env bash
# mermaid-generate.sh — Generate a .mmd source file from an English description
# using the configured LLM, then call render-diagram.py.
#
# Usage:
#   mermaid-generate.sh "description of the diagram" /path/to/outdir [slug]
#
# If slug is omitted, derived from first 5 words of description.

set -euo pipefail

DESC="$1"
OUTDIR="$2"
SLUG="${3:-}"

if [ -z "$SLUG" ]; then
  SLUG=$(printf '%s' "$DESC" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '_' | sed 's/^_*//;s/_*$//' | cut -d'_' -f1-5)
fi

mkdir -p "$OUTDIR"
MMD="$OUTDIR/$SLUG.mmd"

# Generate mermaid source via a small Python script that calls the local LLM endpoint
python3 - "$DESC" "$MMD" <<'PYEOF'
import sys, json, urllib.request, urllib.error

desc = sys.argv[1]
out_path = sys.argv[2]

prompt = f"""You are a technical diagram assistant. Convert the following description into a valid Mermaid flowchart (graph TD / graph LR) or sequence diagram. Output ONLY the mermaid source code, no explanation, no markdown fences.

Description: {desc}

Mermaid source:"""

body = json.dumps({
    "model": "gemma4-12b.gguf",
    "messages": [{"role": "user", "content": prompt}],
    "temperature": 0.2,
    "max_tokens": 1024,
    "chat_template_kwargs": {"enable_thinking": False}
}).encode('utf-8')

req = urllib.request.Request(
    "http://localhost:11435/v1/chat/completions",
    data=body,
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        content = data["choices"][0]["message"]["content"]
        # strip markdown fences if present
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
    print(json.dumps({"success": False, "error": str(e)}))
    sys.exit(1)
PYEOF

if [ ! -f "$MMD" ]; then
  echo "Failed to generate .mmd" >&2
  exit 1
fi

# Render
python3 "$(dirname "$0")/render-diagram.py" --mmd "$MMD" --outdir "$OUTDIR" --slug "$SLUG"