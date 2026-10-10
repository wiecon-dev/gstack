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
  Chromium). The directory run did not print a final summary and did not cover
  the rest of `browse/` or `make-pdf`. A later make-pdf sample stopped after 6
  render failures tied to missing Chromium and pdftotext.
- Paid model evals were not run. Adam explicitly waived them on 2026-10-10.

## Evaluation

For each change record planning time, rework caused by unclear requirements,
spec/code drift, validation failures, and whether a fresh session can resume from
repository artifacts alone. After three changes choose GO, REVISE, or NO-GO.

### Change 1 record — 2026-10-10

Commit `a7a4557` on `wiecon/openspec-pilot`, pushed to origin. The change is not
archived. All 15 task checkboxes remain open because a checkbox is not evidence.

- Planning time: not measured. The accepted artifacts were proposal, spec,
  design, and tasks before any implementation of this change.
- Requirements: specific enough to implement the journal, isolated partials, and
  the watcher. The ambiguous point was a rate-limit retry: the spec requires one
  END after the result is registered, and no false END if the process stops
  before registration.
- Rework: review found two blockers, parallel collectors overwriting finals and
  missing END records in alternate harnesses. After targeted tests were green,
  the SDK retry path still wrote END and opened a second attempt. A new test
  failed with journal events `start`, `end`, `start`, then passed after the fix.
- Validation: strict OpenSpec validation passed. `git diff --check` passed.
  Targeted tests after the fix: 106 pass, 0 fail, 8.4s. Repo-wide free baseline
  was not green. Paid evals were waived.
- Selector: `bun run eval:select` against `origin/main` now reports 119 changed
  files and selects 181/181 E2E plus 28/28 LLM-judge because
  `test/helpers/eval-store.ts` is a global touchfile. Before the commit, the
  same command under-reported this because it ignores uncommitted files.
- Resume: a fresh session can continue from `openspec/changes/eval-harness-lifecycle-observability/`
  and this document without the chat transcript.

### Change 2 status — 2026-10-10

Adam accepted the artifacts for `mv3-service-worker-memory-profile`. The
implementation is commit `96e6149` on `origin/wiecon/openspec-pilot`.
`bun test browse/test/memory-command.test.ts`:
25 pass, 0 fail. Playwright 1.58.2 cannot install its own Chromium build on
Ubuntu 26.04, so the live check used the already installed Chrome for Testing
149 at `~/.cache/ms-playwright/chromium-1228`. One ephemeral MV3 extension
loaded in a persistent context. `collectExtensionServiceWorkers` returned the
`chrome-extension://` worker with `jsHeapUsed` 466500 and `jsHeapTotal` 1048576,
and an empty `notes` array. `Performance.getMetrics` is not implemented on that
target; the bytes came from `Runtime.getHeapUsage`. `performance.memory` via
`worker.evaluate` returned null. The about:blank page stayed out of
`serviceWorkers`.

### Change 3 status — 2026-10-10

Adam accepted the artifacts for `native-gpu-memory-breakdown` on 2026-10-10
and then asked for implementation. The implementation is commit `dcd67a7` on
`origin/wiecon/openspec-pilot`. `bun test browse/test/memory-command.test.ts`:
29 pass, 0 fail. `git diff --check` and strict validation passed. A live Chrome
for Testing 149 snapshot through `projectProcessRss` and `readLinuxVmRssKb`
returned browser `rss` 143036416, GPU `rss` 120193024, and the Linux VmRSS note.
No `process RSS unavailable` note and no VRAM field. `ps` was not run. Paid
evals were not run.

### Pilot decision — GO — 2026-10-10

Adam said GO after the three changes were on `origin/wiecon/openspec-pilot`.
GO means the next gstack change may use this same OpenSpec loop. It does not
archive these changes, merge the branch, or mark the empty task checkboxes done.

Why GO, not REVISE or NO-GO:

- Each change had proposal, spec, design, and tasks before implementation, and
  Adam accepted those artifacts before code.
- The specs caught false assumptions before they became the contract. Change 2
  could not use `Performance.getMetrics` on a service worker. Change 3 could not
  read VRAM from CDP, so the measurement stayed Linux VmRSS.
- Targeted tests passed: change 1, 106; change 2, 25; change 3, 29. Strict
  validation passed for each change. Paid evals stayed waived.
- A fresh session can resume from `openspec/changes/` and this document.

What GO does not claim:

- The repo-wide free baseline was not green. Known gaps remain: gbrain PATH,
  missing `claude/SKILL.md`, and Playwright Chromium on Ubuntu 26.04.
- Planning time was not measured.
- OpenSpec still lists all three changes as in progress because the checkboxes
  are 0/15, 0/9, and 0/9. The commits are the evidence.
- Archive and merge still need a separate yes.

## Rollback

The pilot is isolated on `wiecon/openspec-pilot`. Reverting the pilot commit removes
the dependency, wrapper, configuration, documentation, and `openspec/` artifacts.
No OpenClaw configuration or global skill directories are modified.

## Official references

- Project configuration and advisory guidance (OpenSpec 1.13.2):
  <https://github.com/Fission-AI/OpenSpec/blob/79b6aa9c98f1e36795b2bc4ef2a8f770c6d3a777/docs/customization.md>
- CLI JSON and validation contract (OpenSpec 1.13.2):
  <https://github.com/Fission-AI/OpenSpec/blob/79b6aa9c98f1e36795b2bc4ef2a8f770c6d3a777/docs/agent-contract.md>
