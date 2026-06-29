---
name: careful
version: 1.0.0
description: Pre-exec safety guardrail. Warns before destructive commands and requires Adam's confirmation. (gstack→OpenClaw adaptation)
triggers:
  - "be careful"
  - "safety mode"
  - "careful mode"
  - "warn before destructive"
  - "prod mode"
allowed-tools:
  - Bash
  - Read
  - message
origin: gstack/careful (commit 11de390, v1.58.5.0) → OpenClaw adaptation 2026-06-29
---

# /careful — Pre-Exec Safety Guardrail

When this skill is **active**, every Bash command the agent runs through `exec` is first checked against a list of destructive patterns. If a match is found, the agent pauses and asks Adam for explicit confirmation before executing.

This is a **soft guardrail**: the agent invokes `bin/check-careful.sh` before `exec`, parses the JSON output, and only proceeds when decision=allow or Adam confirms.

## When to Use

- Before any `exec` call where the command might be destructive
- When working in production environments, live systems, or shared workspaces
- When Adam says "be careful", "safety mode", "prod mode", or "warn before destructive"
- Proactively for first-time operations against unfamiliar paths

## When NOT to Use

- Read-only operations (`cat`, `ls`, `grep`, `find` without `-delete`)
- For commands that already require Adam's approval through other flows (e.g., OpenClaw config changes via `gateway` tool)
- For sandbox/test environments where Adam has explicitly said "go ahead with anything"

## Inputs

- A Bash command string (the agent's intended `exec` payload)
- OpenClaw `exec` tool input JSON shape: `{"tool": "exec", "tool_input": {"command": "..."}}`

## Outputs

JSON to stdout (single line):

```json
{"decision":"ask","pattern":"rm_recursive","warning":"Recursive delete..."}
```

or:

```json
{"decision":"allow","pattern":"rm_safe_artifact","warning":""}
```

Fields:
- `decision`: `ask` (need confirmation) | `allow` (proceed silently)
- `pattern`: which pattern matched (`rm_recursive`, `drop_table`, `truncate`, `git_force_push`, `git_reset_hard`, `git_discard`, `kubectl_delete`, `docker_destructive`, `rm_safe_artifact`, `none`)
- `warning`: human-readable warning when decision=ask

## Workflow

1. Agent is about to call `exec` with a Bash command.
2. Agent invokes `bin/check-careful.sh` with the OpenClaw exec tool input JSON on stdin.
3. Script returns JSON with `decision`, `pattern`, `warning`.
4. If `decision=allow` → agent proceeds with `exec` as normal.
5. If `decision=ask` → agent MUST pause and call `message` tool with `AskUserQuestion` (or fallback prose if AUQ unavailable) to ask Adam.
6. Adam answers yes/no:
   - **Yes** → agent proceeds with `exec`.
   - **No** → agent aborts the operation and explains what was avoided.

## Process

For each `exec` call the agent intends to make:

```
1. Build the OpenClaw exec input JSON:
   INPUT='{"tool":"exec","tool_input":{"command":"<command>"}}'

2. Pipe to check-careful.sh:
   echo "$INPUT" | bash ~/.openclaw/workspace/skills/careful/bin/check-careful.sh

3. Parse output JSON.

4. decision=allow → proceed.
   decision=ask → send AskUserQuestion to Adam with warning text.
                 Wait for Adam's answer.
                 yes → proceed, no → abort and log.
```

## Tools

- **Bash** — invoke `bin/check-careful.sh`
- **message** — AskUserQuestion to Adam (when decision=ask)
- **exec** — the actual tool being guarded (only after decision=allow or Adam confirms)

## Commands

```bash
# Standard invocation
echo '{"tool":"exec","tool_input":{"command":"rm -rf /tmp/test"}}' \
  | bash ~/.openclaw/workspace/skills/careful/bin/check-careful.sh

# Output
{"decision":"ask","pattern":"rm_recursive","warning":"Recursive delete (rm -r). This permanently removes files. Confirm with Adam before proceeding."}

# Safe build-artifact rm (no warning)
echo '{"tool":"exec","tool_input":{"command":"rm -rf node_modules"}}' \
  | bash ~/.openclaw/workspace/skills/careful/bin/check-careful.sh

# Output
{"decision":"allow","pattern":"rm_safe_artifact","warning":""}
```

## Constraints

- **Fail-open**: if the script cannot parse the input, it returns `decision=allow`. Rationale: better to occasionally miss a warning than to break the entire agent workflow.
- **Pattern list is fixed**: 8 destructive patterns (see Outputs). Adding new patterns requires editing the script and re-running isolated audit.
- **Safe exceptions** (no warning): `rm -rf` against build artifacts only — `node_modules`, `.next`, `dist`, `__pycache__`, `.cache`, `build`, `.turbo`, `coverage`. Mixed targets (e.g., `rm -rf node_modules some-folder`) trigger warning.
- **Bash escape hatch**: the script guards `exec` calls only. `sed -i`, Python `os.remove`, or direct file writes via `write`/`edit` tools are NOT guarded. Rationale: scope is "destructive shell commands", not "all destructive operations".
- **No telemetry**: script does not log to external services. Optional local log can be added later.

## Examples

### Example 1 — Safe build cleanup (allowed)

Command: `rm -rf node_modules`
Output: `{"decision":"allow","pattern":"rm_safe_artifact","warning":""}`
Action: proceed without asking.

### Example 2 — Destructive rm (ask)

Command: `rm -rf /var/data/old-logs`
Output: `{"decision":"ask","pattern":"rm_recursive","warning":"Recursive delete..."}`
Action: AskUserQuestion → Adam: "yes" → proceed.

### Example 3 — Force push (ask)

Command: `git push --force origin main`
Output: `{"decision":"ask","pattern":"git_force_push","warning":"git force-push rewrites remote history..."}`
Action: AskUserQuestion → Adam: "no" → abort, log avoided force-push.

### Example 4 — DROP TABLE (ask)

Command: `PGPASSWORD=xxx psql -c "DROP TABLE users;"`
Output: `{"decision":"ask","pattern":"drop_table","warning":"SQL DROP detected..."}`
Action: AskUserQuestion → Adam: "yes, it's a dev table" → proceed.

### Example 5 — Read-only (allow, no pattern match)

Command: `ls -la /tmp`
Output: `{"decision":"allow","pattern":"none","warning":""}`
Action: proceed silently.

## Failure Modes

| Failure | Detection | Recovery |
|---|---|---|
| Script not found | `command not found` from bash | Agent logs warning, proceeds with `exec` (fail-open) |
| Python3 missing (in fallback path) | json.loads fails silently | Returns empty CMD → `decision=allow` (fail-open) |
| Mixed-language quote escapes | grep regex doesn't extract `command` field | Python fallback runs |
| Pattern miss (new attack vector) | Command matches but pattern list is incomplete | Log to skill-usage.jsonl as `pattern_miss` for review |
| AskUserQuestion unavailable | message tool returns error | Render prose fallback (D1 brief format) per gstack AskUserQuestion Format |

## Compatibility

- **OpenClaw**: works with any agent that has Bash, Read, message, exec tools.
- **Models**: independent of LLM (pattern matching is pure bash + python).
- **Hooks**: NO Claude Code PreToolUse hooks. OpenClaw lacks hook system — enforcement is via agent invocation contract.
- **Override**: any agent that ignores the skill activation bypasses the guard. Mitigate by assigning skill to all 4-5 developer agents and adding to agent system prompts.

## Security Audit

- **Input parsing**: uses Python `json.loads` (safe). No `eval` or shell expansion on user input.
- **Fail-open on parse error**: documented in Constraints. Safer default for agent availability.
- **No network calls**: script is fully offline, no telemetry.
- **No secret logging**: warning text includes pattern name only, never the command itself.
- **State file**: none (stateless).
- **Permissions**: script should be `chmod 755`, no write access needed at runtime.
- **Reviewed**: 2026-06-29 during Etap 7 isolated sub-agent audit.

## OpenClaw Adaptation Notes

Differences from gstack `/careful`:

| Aspect | gstack | OpenClaw |
|---|---|---|
| Trigger mechanism | Claude Code PreToolUse hook | Agent invokes script before `exec` |
| Output format | `permissionDecision: ask` | `decision: ask` + `pattern` + `warning` |
| Hook system required | Yes (Claude Code) | No (script is standalone) |
| Failure mode | `permissionDecision: deny` | fail-open (allow) — different philosophy |
| Override | Session-scoped hook | Agent system prompt + skill assignment |

The OpenClaw adaptation is intentionally lighter-weight: we cannot rely on hard hooks, so the skill depends on agent discipline + assignment to relevant agents.

## Assignment

Assigned to agents that perform destructive operations:

- `main` — primary orchestrator
- `techleader-developer-reviewer` — code changes
- `failover1-developer-reviewer` — code changes (failover)
- `work-data-engineer` — data operations
- `ops-sre` — system operations

## Explicitly Out of Scope

- Hard enforcement (would require OpenClaw hook system or plugin)
- Guarding `write`/`edit` tools (use `freeze` skill instead for that)
- Guarding Python/Ruby/Node scripts that perform destructive operations indirectly
- Production deployment workflows (handled by separate OpenClaw config-change rules)
- Rollback / undo (the skill warns, it does not undo)