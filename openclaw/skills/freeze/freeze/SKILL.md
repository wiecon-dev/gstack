---
name: freeze
version: 1.0.0
description: Restrict write/edit operations to a specific directory for the session. (gstack→OpenClaw adaptation)
triggers:
  - "freeze"
  - "freeze edits to directory"
  - "lock editing scope"
  - "restrict file changes"
  - "only edit this folder"
  - "lock down edits"
allowed-tools:
  - Bash
  - Read
  - message
  - write
  - edit
origin: gstack/freeze (commit 11de390, v1.58.5.0) → OpenClaw adaptation 2026-06-29
---

# /freeze — Restrict Edits to a Directory

Lock write/edit operations to a specific directory. Any `write` or `edit` operation targeting a file outside the allowed path will be **blocked**.

This is a **soft guardrail**: the agent invokes `bin/check-freeze.sh` before `write`/`edit`, parses the JSON output, and aborts if decision=deny.

## When to Use

- When debugging to prevent accidentally "fixing" unrelated code
- When you want to scope changes to one module or directory
- When you need a hard reminder: "do not touch anything outside this folder"
- When Adam says "freeze", "restrict edits", "only edit this folder", or "lock down edits"

## When NOT to Use

- When you need to edit multiple directories in one session (use the skill to lock to one, unfreeze, edit, refreeze)
- For temporary one-off edits (just be careful without the skill)
- As a security boundary — bash commands can still modify files outside the boundary (`sed -i`, `cat > file`, etc.). The skill only guards `write` and `edit` tools.

## Inputs

- A directory path (set via `bin/freeze-set.sh <path>`)
- OpenClaw `write`/`edit` tool input JSON: `{"tool": "write", "tool_input": {"file_path": "...", "content": "..."}}`

## Outputs

JSON to stdout:

```json
{"decision":"allow","reason":"within_freeze_boundary"}
{"decision":"deny","reason":"outside_freeze_boundary","file_path":"/etc/passwd","boundary":"/tmp/frozen/"}
```

Fields:
- `decision`: `allow` (proceed) | `deny` (block)
- `reason`: `within_freeze_boundary` | `outside_freeze_boundary` | `freeze_not_active` | `freeze_dir_empty` | `parse_error_fail_open`
- `file_path`: (when denied) the blocked path
- `boundary`: (when denied) the active freeze boundary

## Workflow

1. Adam (or agent on Adam's behalf) sets the freeze boundary: `bin/freeze-set.sh /path/to/dir`.
2. State persisted to `~/.openclaw/state/freeze-dir.txt` (with trailing slash).
3. Agent invokes `bin/check-freeze.sh` before each `write`/`edit` call.
4. Script reads state, compares file_path against boundary:
   - Within boundary → `decision=allow` → proceed.
   - Outside boundary → `decision=deny` → agent aborts, explains what was blocked.
5. To change boundary: re-run `freeze-set.sh <new-path>` or `freeze-set.sh --clear` to remove.

## Process

```
1. Set boundary:
   bash ~/.openclaw/workspace/skills/freeze/bin/freeze-set.sh /home/user/project/src

   Output: {"decision":"set","boundary":"/home/user/project/src/"}

2. Before each write/edit:
   echo '{"tool":"write","tool_input":{"file_path":"/home/user/project/src/foo.py","content":"..."}}' \
     | bash ~/.openclaw/workspace/skills/freeze/bin/check-freeze.sh

3. Parse JSON.
   - allow → proceed with write/edit
   - deny  → abort, log blocked path

4. To unfreeze:
   bash ~/.openclaw/workspace/skills/freeze/bin/freeze-set.sh --clear
```

## Tools

- **Bash** — invoke `bin/check-freeze.sh` and `bin/freeze-set.sh`
- **Read** — check current boundary via `freeze-set.sh --show`
- **message** — inform Adam when edits are blocked (optional)
- **write** / **edit** — the actual tools being guarded

## Commands

```bash
# Set freeze boundary
bash ~/.openclaw/workspace/skills/freeze/bin/freeze-set.sh /home/openclaw/projects/myapp/src

# Show current boundary
bash ~/.openclaw/workspace/skills/freeze/bin/freeze-set.sh --show

# Clear (unfreeze)
bash ~/.openclaw/workspace/skills/freeze/bin/freeze-set.sh --clear

# Pre-write check
echo '{"tool":"write","tool_input":{"file_path":"/home/openclaw/projects/myapp/src/foo.py","content":"..."}}' \
  | bash ~/.openclaw/workspace/skills/freeze/bin/check-freeze.sh
```

## Constraints

- **State location**: `~/.openclaw/state/freeze-dir.txt` (env override: `OPENCLAW_STATE_ROOT`)
- **Trailing slash matters**: stored as `/path/to/dir/`. Prevents `/src` from matching `/src-old`.
- **Fail-open on parse error**: if the script cannot extract `file_path` from input, it allows. Rationale: better to occasionally miss a block than break the agent.
- **Edit/Write only**: does NOT guard Read, Bash, Glob, Grep, or skill-internal scripts. Bash `sed -i`, `cat > file`, or shell redirects can still write outside the boundary.
- **Persistent across sessions**: state file persists until explicitly cleared. Each new agent session should check `freeze-set.sh --show` before editing files.
- **No telemetry**: no external logging. State is local-only.

## Examples

### Example 1 — Within boundary (allowed)

Boundary: `/home/openclaw/projects/myapp/src/`
Command: `write` to `/home/openclaw/projects/myapp/src/foo.py`
Output: `{"decision":"allow","reason":"within_freeze_boundary"}`
Action: proceed.

### Example 2 — Outside boundary (denied)

Boundary: `/home/openclaw/projects/myapp/src/`
Command: `edit` to `/home/openclaw/projects/myapp/README.md`
Output: `{"decision":"deny","reason":"outside_freeze_boundary","file_path":"/home/openclaw/projects/myapp/README.md","boundary":"/home/openclaw/projects/myapp/src/"}`
Action: abort, explain to Adam what was blocked.

### Example 3 — Freeze not active (allowed)

No state file exists.
Command: any `write`
Output: `{"decision":"allow","reason":"freeze_not_active"}`
Action: proceed.

### Example 4 — Subpath of boundary (allowed)

Boundary: `/home/openclaw/projects/myapp/`
Command: `write` to `/home/openclaw/projects/myapp/src/foo.py`
Output: `{"decision":"allow","reason":"within_freeze_boundary"}` (subpath matches)

### Example 5 — Sibling directory (denied)

Boundary: `/home/openclaw/projects/myapp/`
Command: `write` to `/home/openclaw/projects/myapp-old/foo.py`
Output: `{"decision":"deny","reason":"outside_freeze_boundary",...}` (trailing slash prevents prefix collision)

## Failure Modes

| Failure | Detection | Recovery |
|---|---|---|
| State file missing | script reads empty | `decision=allow` with reason `freeze_not_active` |
| Path doesn't exist | `freeze-set.sh` fails to `cd` | returns error, state unchanged |
| Symlink target outside boundary | `_resolve_path` follows symlinks | compares resolved path (correct behavior) |
| Trailing slash missing | stored as `/foo` instead of `/foo/` | prefix match still works for `/foo/bar` but blocks `/foobar` |
| Concurrent freeze updates | last write wins | agents must coordinate or use explicit ordering |

## Compatibility

- **OpenClaw**: works with any agent that has Bash, Read, write, edit tools.
- **Models**: independent of LLM (pure bash + python).
- **Hooks**: NO Claude Code PreToolUse hooks. OpenClaw lacks hook system — enforcement is via agent invocation contract.
- **Override**: any agent that ignores the skill bypasses the guard. Mitigate via skill assignment to developer agents.

## Security Audit

- **State file location**: `~/.openclaw/state/freeze-dir.txt`. User-writable. Should be `chmod 600` to prevent other users from setting boundaries.
- **Path resolution**: uses `cd` + `pwd` (safe). No shell expansion of user input.
- **Symlink handling**: resolves symlinks before comparison. Prevents symlink-based escape.
- **No network calls**: fully offline.
- **No telemetry**: no external logging.
- **Reviewed**: 2026-06-29 during Etap 7 isolated sub-agent audit.

## OpenClaw Adaptation Notes

Differences from gstack `/freeze`:

| Aspect | gstack | OpenClaw |
|---|---|---|
| Trigger mechanism | Claude Code PreToolUse hook on Edit/Write | Agent invokes check-freeze.sh before write/edit |
| Output format | `permissionDecision: deny` | `decision: deny` + `reason` + `file_path` + `boundary` |
| State location | `${CLAUDE_PLUGIN_DATA}/freeze-dir.txt` | `${OPENCLAW_STATE_ROOT}/freeze-dir.txt` (default `~/.openclaw/state/`) |
| Boundary setup | AskUserQuestion (interactive) | `bin/freeze-set.sh <path>` (script) |
| Hook system required | Yes (Claude Code) | No (script is standalone) |

## Assignment

Assigned to agents that perform file edits and benefit from scope discipline:

- `main` — primary orchestrator
- `techleader-developer-reviewer` — code changes
- `failover1-developer-reviewer` — code changes (failover)
- `work-data-engineer` — data operations
- `ops-sre` — system operations

## Explicitly Out of Scope

- Hard enforcement (would require OpenClaw hook system or plugin)
- Guarding Bash commands that write files (`sed -i`, `cat > file`, `> redirect`)
- Guarding Python/Ruby/Node scripts that modify files
- Multi-directory edits (unfreeze, edit, refreeze workflow required)
- Cross-session persistence (state survives process exit but is local to one user account)