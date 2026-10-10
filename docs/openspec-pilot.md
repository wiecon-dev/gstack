# OpenSpec pilot in gstack

## Purpose

OpenSpec is a repository-local agreement layer for three pilot changes. It stores
the current specification and the proposed delta while gstack's existing rules,
TDD workflow, review gates, and Adam's explicit approvals remain authoritative.

## Precedence

1. `AGENTS.md` and explicit instructions from Adam.
2. Accepted OpenSpec proposal, specs, design, and tasks for the active change.
3. Advisory guidance from `openspec/config.yaml`.
4. OpenSpec's built-in workflow defaults.

If these sources conflict, stop and ask Adam. Do not silently choose a weaker gate.

## Safe command surface

Use only the repository wrapper:

```bash
scripts/openspec-safe.sh <command>
# Equivalent package script:
bun run openspec -- <command>
```

The wrapper disables telemetry, update checks, automatic config, and animation.
The CLI is pinned in `devDependencies`; global installs are outside the pilot.

Forbidden during the pilot: `--force`, Stores/worksets, bulk archive, cloud-agent
setup, generated OpenSpec tool skills, shell completions, and global config changes.

## Change loop

1. Explore and create proposal/specs/design/tasks only.
2. Adam reviews and explicitly approves all planning artifacts.
3. Implement one vertical RED-GREEN-REFACTOR slice.
4. Record fresh targeted verification before checking off the slice.
5. Run strict OpenSpec validation and the relevant gstack baseline.
6. Present evidence to Adam; archive only after explicit approval.

## Pilot changes

1. Eval harness: live progress and incremental result persistence.
2. MV3 extension service worker memory profile in `$B memory`.
3. Native and GPU memory breakdown in `$B memory`.

### Change 1 observability artifacts

The eval-harness pilot extends the existing heartbeat, `progress.log`, raw
NDJSON, and final eval result with two durable local surfaces:

- `~/.gstack/projects/<slug>/e2e-runs/<run-id>/lifecycle.jsonl` — append-only
  START, progress, and END records keyed by a unique test-attempt ID. It stores
  operational metadata only, never prompts, model output, secrets, or env.
- `~/.gstack/projects/<slug>/evals/_partial/<run-id>-<collector-id>.json` — an
  atomic snapshot for each collector, marked `_partial: true` and excluded from
  complete-baseline comparison.

`bun run eval:watch` reads all active lifecycle attempts and partial snapshots.
An attempt is shown as stale after ten minutes without a progress or END record;
stale means “no fresh lifecycle signal”, not proof that the process exited. The
legacy global heartbeat remains a fallback for older runs.
One SDK trial keeps a single open attempt across rate-limit retries. END is
written only when the collector registers the result; an unregistered failure
leaves START without a false END.

### 2026-10-10 verification

- Targeted free tests after the retry fix: 106 pass, 0 fail (`eval-lifecycle`,
  `eval-store`, `observability`, `agent-sdk-runner`).
- `git diff --check` and strict OpenSpec validation passed.
- Full free baseline is not a clean repo-green claim. Known environment
  failures remain (gbrain PATH, missing `claude/SKILL.md`, missing Playwright
  Chromium). Paid evals were not run.
- Uncommitted edits to `test/helpers/session-runner.ts` and
  `test/helpers/eval-store.ts` are global touchfiles, so diff selection would
  include all 181 E2E tests and all 28 LLM-judge tests. `eval:select` does not
  see uncommitted files and therefore under-reports this.

## Evaluation

For each change record planning time, rework caused by unclear requirements,
spec/code drift, validation failures, and whether a fresh session can resume from
repository artifacts alone. After three changes choose GO, REVISE, or NO-GO.

## Rollback

The pilot is isolated on `wiecon/openspec-pilot`. Reverting the pilot commit removes
the dependency, wrapper, configuration, documentation, and `openspec/` artifacts.
No OpenClaw configuration or global skill directories are modified.

## Official references

- Project configuration and advisory guidance (OpenSpec 1.13.2):
  <https://github.com/Fission-AI/OpenSpec/blob/79b6aa9c98f1e36795b2bc4ef2a8f770c6d3a777/docs/customization.md>
- CLI JSON and validation contract (OpenSpec 1.13.2):
  <https://github.com/Fission-AI/OpenSpec/blob/79b6aa9c98f1e36795b2bc4ef2a8f770c6d3a777/docs/agent-contract.md>
