---
name: mermaid-render
version: 1.0.0
description: Turn an English description or mermaid source into a diagram triplet (.mmd + .svg + .png + .excalidraw). Offline rendering. (gstack→OpenClaw adaptation)
triggers:
  - "make a diagram"
  - "draw a diagram"
  - "create a flowchart"
  - "diagram this"
  - "visualize this flow"
  - "architecture diagram"
allowed-tools:
  - Read
  - Write
  - Bash
  - message
origin: gstack/diagram (commit 11de390, v1.58.5.0) → OpenClaw adaptation 2026-06-29
---

# /mermaid-render — Diagram Triplet from Description or Source

Turn an English description (or raw mermaid source) into a complete diagram triplet:

- `.mmd` — editable mermaid source
- `.svg` — rendered vector diagram
- `.png` — raster image (1950 px width)
- `.excalidraw` — editable hand-drawn-style scene (flowcharts only)

Rendering is **fully offline** using the vendored gstack `diagram-render.html` bundle (Mermaid 11.12.2 + Excalidraw 0.18.0 + React 18.3.1, no CDN).

## When to Use

- When Adam asks to "make a diagram", "draw the architecture", "create a flowchart", "visualize this flow"
- For documentation, README, Obsidian vault, Telegram/Discord messages
- For architecture reviews and planning documents
- When the user provides mermaid source and wants higher-quality SVG/PNG/excalidraw

## When NOT to Use

- For complex diagrams that require manual layout (Excalidraw may be better used directly)
- For diagrams with sensitive data that should not be rendered in a local browser (rare)
- When the user only wants a quick text explanation (use normal response)
- For multi-page PDFs (use `make-pdf` if available)

## Inputs

- English description of the diagram (e.g., "flowchart showing user login: browser → API → auth service → database")
- OR existing `.mmd` source file path
- Output directory (default: `/home/openclaw/.openclaw/media/diagrams/`)
- Optional slug/base name for files

## Outputs

JSON result:

```json
{
  "success": true,
  "slug": "user_login_flow",
  "outdir": "/home/openclaw/.openclaw/media/diagrams/",
  "files": {
    "mmd": ".../user_login_flow.mmd",
    "svg": ".../user_login_flow.svg",
    "png": ".../user_login_flow.png",
    "excalidraw": ".../user_login_flow.excalidraw"
  },
  "is_flowchart": true,
  "excalidraw_rendered": true
}
```

## Workflow

### Path A — Description in, triplet out

1. Adam provides description.
2. Agent writes a `.mmd` source file using the description.
3. Agent runs `bin/render-diagram.py --mmd <file> --outdir <dir> --slug <name>`.
4. Agent reads the generated `.png` and sends it to Adam.
5. Agent lists all artifact paths and editability note.

### Path B — Existing .mmd source

1. Adam provides `.mmd` file path or pastes source.
2. Agent saves source to file (if pasted).
3. Agent runs `bin/render-diagram.py`.
4. Agent reads PNG, sends to Adam, lists artifacts.

## Process

```
1. Capture input: description OR .mmd source.
2. If description:
   a. Generate .mmd from description (agent writes directly; mermaid-generate.sh is optional)
   b. Save to /home/openclaw/.openclaw/media/diagrams/<slug>.mmd
3. If source only:
   a. Save to /home/openclaw/.openclaw/media/diagrams/<slug>.mmd
4. Render:
   cd ~/.openclaw/workspace/skills/mermaid-render && \
   uv run python bin/render-diagram.py \
     --mmd <slug>.mmd --outdir <dir> --slug <slug>
5. Verify output JSON has success=true.
6. Read PNG with Read tool (for inline display in chat).
7. Send message with PNG + list of all artifacts + editability note.
```

## Tools

- **Write** — create `.mmd` source files
- **Read** — read generated PNG/SVG for display
- **Bash** — invoke `render-diagram.py` and `mermaid-generate.sh`
- **message** — deliver diagram and artifact list to Adam

## Commands

```bash
# Render existing .mmd
cd ~/.openclaw/workspace/skills/mermaid-render && \
uv run python bin/render-diagram.py \
  --mmd /tmp/myflow.mmd --outdir /home/openclaw/.openclaw/media/diagrams/ --slug myflow

# Generate from description (optional helper, requires local LLM on 11435)
bash ~/.openclaw/workspace/skills/mermaid-render/bin/mermaid-generate.sh \
  "user login flow: browser -> API -> auth -> DB" \
  /home/openclaw/.openclaw/media/diagrams/ \
  login_flow
```

## Constraints

- **Bundle dependency**: requires `lib/diagram-render.html` (9.2 MB, vendored). If missing, skill returns error with rebuild instructions.
- **Excalidraw limitation**: only flowchart types (`graph LR/RL/TD/BT`, `flowchart`) produce `.excalidraw`. Sequence/state/gantt diagrams produce only `.mmd` + `.svg` + `.png`.
- **Rendering engine**: Playwright + Chromium (managed by uv, no system install required).
- **No CDN**: bundle is self-contained; works offline.
- **PNG size**: fixed 1950 px width (matches gstack default).
- **Source of truth**: `.mmd` is the single editable source. Re-render from `.mmd` to update artifacts.
- **UTF-8 support**: non-ASCII labels handled via `decodeURIComponent(escape(atob(...)))`.

## Examples

### Example 1 — Flowchart from description

Input: "Show our OpenClaw agent routing: user message → main agent → skill router → exec"

Output:
- `agent_routing.mmd` with `graph TD` source
- `agent_routing.svg` vector
- `agent_routing.png` raster
- `agent_routing.excalidraw` editable scene

### Example 2 — Sequence diagram

Input: `sequenceDiagram; Alice->>Bob: Hello`

Output:
- `hello_seq.mmd`
- `hello_seq.svg`
- `hello_seq.png`
- (no `.excalidraw` because sequence diagrams are not flowcharts)

## Failure Modes

| Failure | Detection | Recovery |
|---|---|---|
| Playwright not installed | ImportError in render-diagram.py | Run `uv sync` in skill dir |
| Chromium not found | Playwright launch fails | `uv run playwright install chromium` |
| Bundle missing | lib/diagram-render.html not found | Error with rebuild command |
| Mermaid parse error | `#done` missing or JS error | Show parse error, ask user to fix .mmd |
| Excalidraw conversion fails | non-flowchart type | Skip .excalidraw, deliver mmd/svg/png |

## Compatibility

- **OpenClaw**: works with Bash + Read + Write tools; rendering is local Python via uv.
- **Models**: diagram generation can use any LLM; default helper uses local Gemma 4 on port 11435.
- **Platforms**: Linux/macOS/Windows via Playwright.

## Security Audit

- **Offline bundle**: no external network calls during rendering.
- **Local browser only**: Chromium launched headless locally by Playwright.
- **No persistent server**: tiny HTTP server for bundle only, shut down after render.
- **Input sanitization**: mermaid source is base64-encoded before JS injection to avoid quote escaping.
- **No secrets**: script does not read credentials.
- **Reviewed**: 2026-06-29 during Etap 7 isolated sub-agent audit.

## OpenClaw Adaptation Notes

Differences from gstack `/diagram`:

| Aspect | gstack | OpenClaw mermaid-render |
|---|---|---|
| Browser daemon | gstack `browse` binary | Playwright + local Chromium |
| Tab control | `$B newtab`, `$B js` | Playwright page object |
| Bundle staging | /tmp/gstack-diagram-render-$SHA.html | HTTP server on 127.0.0.1 |
| Input contract | CLI in skill SKILL.md | `render-diagram.py --mmd ... --outdir ...` |
| Excalidraw round-trip | `$B js` calls | Same JS functions via Playwright evaluate |
| Automation | skill PreToolUse hooks | Agent calls script directly |

Key implementation decisions:
- Replaced gstack browse daemon with Playwright to avoid building/maintaining a custom binary.
- Self-contained bundle copied from gstack `lib/diagram-render/dist/`.
- Python dependencies managed by `uv` inside the skill directory.
- `mermaid-generate.sh` is optional; the agent can write `.mmd` directly.

## Assignment

Assigned to agents that produce documentation, visuals, or architecture artifacts:

- `main` — primary orchestrator
- `techleader-developer-reviewer` — architecture docs
- `failover1-developer-reviewer` — failover
- `work-data-engineer` — data flow diagrams
- `agent-orchestrator` — automation visuals

## Explicitly Out of Scope

- Editing existing `.excalidraw` files by the agent (user must do it at excalidraw.com)
- Diagram layout optimization beyond Mermaid defaults
- Animated diagrams
- Real-time collaborative editing
- PDF generation (use separate `make-pdf` skill if available)
- Network-accessible render server