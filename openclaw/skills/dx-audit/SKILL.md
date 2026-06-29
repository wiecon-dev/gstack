---
name: dx-audit
version: 1.0.0
description: Static developer-experience audit of a project from local artifacts. Produces a DX scorecard with evidence and improvement roadmap. (gstack→OpenClaw adaptation)
triggers:
  - "dx audit"
  - "developer experience audit"
  - "dx scorecard"
  - "review DX"
  - "audit onboarding"
  - "check dev experience"
allowed-tools:
  - Read
  - Bash
  - message
origin: gstack/devex-review (commit 11de390, v1.58.5.0) → OpenClaw adaptation 2026-06-29
---

# /dx-audit — Static Developer Experience Audit

Audit the developer experience (DX) of a project **without live browser testing**. Use local artifacts: README, CHANGELOG, docs, CLI `--help`, examples, package metadata, CI config.

This is an **artifact-based DX review** derived from gstack `/devex-review`, stripped of browse/live-testing because OpenClaw browser automation is too slow for routine DX checks. The methodology (8 passes, DX First Principles, 7 Characteristics, scoring rubric) is preserved.

## When to Use

- Before releasing a developer-facing tool, SDK, CLI, or library
- After a major refactor or API change
- When Adam asks "dx audit", "developer experience audit", or "dx scorecard"
- Proactively when onboarding friction is suspected
- To compare current DX against a prior baseline (boomerang)

## When NOT to Use

- For live web apps (use `browser` + manual testing for real flows)
- For internal-only scripts with no external users
- When Adam explicitly wants only code review (use `code-review-and-quality`)
- For performance/load testing (out of scope)

## Inputs

- Project root path (default: current workspace)
- Product type: CLI / SDK / Web API / Library / Framework / Tool
- Optional baseline scores from prior audit

## Outputs

1. A DX scorecard with 8 dimensions (0-10 each)
2. Evidence source per dimension (file path, command output, quote)
3. TTHW estimate (inferred from README/docs)
4. Improvement roadmap (prioritized gaps)
5. Boomerang comparison (if prior scores exist)

## Workflow

1. **Discovery**: read README, package files, CLAUDE.md/AGENTS.md, CHANGELOG, docs.
2. **8-Pass Audit**:
   - Pass 1: Getting Started
   - Pass 2: API/CLI/SDK Ergonomics
   - Pass 3: Error Messages
   - Pass 4: Documentation
   - Pass 5: Upgrade Path
   - Pass 6: Developer Environment
   - Pass 7: Community & Ecosystem
   - Pass 8: DX Measurement & Feedback
3. **Score**: apply rubric 0-10 with evidence per dimension.
4. **Report**: markdown scorecard + TTHW estimate + delta vs baseline + roadmap.
5. **Deliver**: send to Adam as concise markdown (or table2img PNG if Telegram).

## Process

```
1. Determine project root and product type from context or ask Adam.
2. Read core files:
   - README.md / README.rst
   - CHANGELOG.md / HISTORY.md
   - package.json / pyproject.toml / setup.py / Cargo.toml / go.mod
   - docs/ directory (if exists)
   - CLAUDE.md / AGENTS.md (OpenClaw-specific)
3. Run CLI --help if a command-line entry point exists:
   - `uv run <cli> --help`
   - `python3 -m <module> --help`
   - `node ./bin/<cli> --help`
4. For each of the 8 passes, collect evidence and score.
5. Build scorecard table.
6. If prior `dx-audit` baseline exists, compute delta.
7. Produce prioritized improvement list.
8. Send to Adam with verdict: DX_GOOD / DX_NEEDS_WORK / DX_BROKEN.
```

## Tools

- **Read** — inspect README, CHANGELOG, docs, examples
- **Bash** — run `--help`, list files, grep for patterns
- **message** — deliver scorecard to Adam

## Commands

```bash
# Inspect CLI help
uv run python -m mytool --help

# Check for common DX anti-patterns
grep -iE "(coming soon|todo|fixme|placeholder)" README.md docs/*.md 2>/dev/null

# Find setup instructions
head -80 README.md

# Check CHANGELOG recency
head -20 CHANGELOG.md

# Count quickstart examples
find docs -name "*.md" -exec grep -l "quickstart\|getting started\|hello world" {} \; 2>/dev/null
```

## DX First Principles (preserved from gstack)

1. **Zero friction at T0.** First five minutes decide everything.
2. **Incremental steps.** Never force devs to understand the whole system before value.
3. **Learn by doing.** Playgrounds, sandboxes, copy-paste code that works.
4. **Decide for me, let me override.** Strong opinions, loosely held.
5. **Fight uncertainty.** Every error = problem + cause + fix.
6. **Show code in context.** Solve 100% of the problem, not hello-world.
7. **Speed is a feature.** Iteration speed is everything.
8. **Create magical moments.** Make the first experience the best.

## The Seven DX Characteristics

| # | Characteristic | Gold Standard |
|---|---|---|
| 1 | **Usable** | Stripe: one key, one curl, money moves. |
| 2 | **Credible** | TypeScript: gradual adoption, never breaks JS. |
| 3 | **Findable** | React: every question answered on SO. |
| 4 | **Useful** | Tailwind: covers 95% of CSS needs. |
| 5 | **Valuable** | Next.js: SSR/routing/bundling/deploy in one. |
| 6 | **Accessible** | VS Code: works for junior to principal. |
| 7 | **Desirable** | Vercel: devs WANT to use it. |

## DX Scoring Rubric

| Score | Meaning |
|-------|---------|
| 9-10 | Best-in-class. Stripe/Vercel tier. |
| 7-8 | Good. No frustration. Minor gaps. |
| 5-6 | Acceptable. Works but with friction. |
| 3-4 | Poor. Developers complain. |
| 1-2 | Broken. Devs abandon after first attempt. |
| 0 | Not addressed. |

## TTHW Benchmarks (Time to Hello World)

| Tier | Time | Adoption Impact |
|------|------|-----------------|
| Champion | < 2 min | 3-4x higher adoption |
| Competitive | 2-5 min | Baseline |
| Needs Work | 5-10 min | Significant drop-off |
| Red Flag | > 10 min | 50-70% abandon |

## The 8 Audit Passes

### Pass 1 — Getting Started

Evidence source: README.md, docs/quickstart.md, install instructions.

Checklist:
- [ ] Install command is one line
- [ ] Hello-world example is copy-pasteable
- [ ] No credit card, no demo call required
- [ ] First success within 5 minutes
- [ ] Clear next step after hello-world

Score meaning:
- 9-10: single-command install + working example + next steps in <2 min
- 7-8: install in 2-5 min, minor friction
- 5-6: install in 5-10 min, missing examples
- 3-4: broken install or no hello-world
- 0-2: no getting-started instructions

### Pass 2 — API/CLI/SDK Ergonomics

Evidence source: CLI `--help` output, code examples, package API surface.

Checklist:
- [ ] `--help` is clear and complete
- [ ] Common flags are discoverable
- [ ] API naming is consistent
- [ ] SDK methods map to user intent
- [ ] Error-first callbacks / exceptions are sane

Score meaning:
- 9-10: discoverable, consistent, intuitive
- 7-8: good with minor inconsistencies
- 5-6: tolerable but confusing naming
- 3-4: bad CLI/API design
- 0-2: no CLI or API docs

### Pass 3 — Error Messages

Evidence source: `--help` usage errors, exception messages in code, validation output.

Checklist:
- [ ] Errors identify the problem
- [ ] Errors explain the cause
- [ ] Errors show the fix or link to docs
- [ ] Common mistakes have dedicated messages

Score meaning:
- 9-10: Elm/Rust/Stripe quality (problem + cause + fix)
- 7-8: explains problem, sometimes cause
- 5-6: generic errors, dev must guess
- 3-4: stack dumps or silent failures
- 0-2: no error handling visible

### Pass 4 — Documentation

Evidence source: docs/ directory, README, wiki links, search availability.

Checklist:
- [ ] Docs are searchable
- [ ] Examples are copy-paste-complete
- [ ] Information architecture is clear
- [ ] Language/platform variants are documented
- [ ] API reference exists

Score meaning:
- 9-10: excellent search, complete examples, clear IA
- 7-8: good docs, minor gaps
- 5-6: docs exist but hard to navigate
- 3-4: sparse or outdated docs
- 0-2: no docs

### Pass 5 — Upgrade Path

Evidence source: CHANGELOG.md, migration guides, deprecation notices.

Checklist:
- [ ] CHANGELOG is user-facing and dated
- [ ] Breaking changes include migration notes
- [ ] Deprecations warn before removal
- [ ] Version policy is documented

Score meaning:
- 9-10: clear changelogs, migration guides, codemods
- 7-8: good CHANGELOG, manual migration steps
- 5-6: CHANGELOG exists but thin
- 3-4: breaking changes undocumented
- 0-2: no CHANGELOG

### Pass 6 — Developer Environment

Evidence source: CI config, test utilities, devcontainer, setup scripts.

Checklist:
- [ ] README setup covers prerequisites
- [ ] Tests run with one command
- [ ] CI is documented
- [ ] Type definitions / lint config included
- [ ] Dev environment works on Linux/macOS

Score meaning:
- 9-10: one-command dev env, cross-platform
- 7-8: documented, minor setup friction
- 5-6: works but setup is manual
- 3-4: broken or undocumented dev env
- 0-2: no setup instructions

### Pass 7 — Community & Ecosystem

Evidence source: README community links, GitHub issues (if accessible), contributing guide.

Checklist:
- [ ] Community channel linked
- [ ] Contributing guide exists
- [ ] Issue templates exist
- [ ] Ecosystem integrations documented

Score meaning:
- 9-10: active community, great issue hygiene
- 7-8: links exist, community present
- 5-6: minimal community pointers
- 3-4: no community info
- 0-2: appears abandoned

### Pass 8 — DX Measurement & Feedback

Evidence source: issue templates, feedback links, analytics mentions.

Checklist:
- [ ] Bug report template exists
- [ ] Feedback mechanism exists
- [ ] Docs/CLI ask for feedback
- [ ] Telemetry is documented

Score meaning:
- 9-10: explicit feedback loops, documented telemetry
- 7-8: issue templates and feedback links
- 5-6: minimal feedback mechanism
- 3-4: hard to report issues
- 0-2: no feedback loop

## Scorecard Template

The scorecard covers exactly the 8 dimensions described in the 8 Audit Passes above:

1. Getting Started
2. API/CLI/SDK Ergonomics
3. Error Messages
4. Documentation
5. Upgrade Path
6. Developer Environment
7. Community & Ecosystem
8. DX Measurement & Feedback

```markdown
# DX Audit — [Project Name]

## Summary
- Product type: [CLI/SDK/Library/Framework/API]
- TTHW estimate: [X min] ([Champion/Competitive/Needs Work/Red Flag])
- Overall DX: [N/10]
- Verdict: [DX_GOOD / DX_NEEDS_WORK / DX_BROKEN]

## Scorecard

| Dimension            | Score | Evidence | Method   |
|----------------------|-------|----------|----------|
| Getting Started      | __/10 | [quote]  | INFERRED |
| API/CLI/SDK          | __/10 | [quote]  | INFERRED |
| Error Messages       | __/10 | [quote]  | INFERRED |
| Documentation        | __/10 | [quote]  | INFERRED |
| Upgrade Path         | __/10 | [quote]  | INFERRED |
| Dev Environment      | __/10 | [quote]  | INFERRED |
| Community            | __/10 | [quote]  | INFERRED |
| DX Measurement       | __/10 | [quote]  | INFERRED |

## Top 3 Gaps
1. [Gap] → [Fix]
2. [Gap] → [Fix]
3. [Gap] → [Fix]

## Boomerang (optional)
| Dimension | Baseline | Current | Delta |
|-----------|----------|---------|-------|
| ...       | ...      | ...     | ...   |
```

## Constraints

- **Static-only**: no browser automation. TTHW is inferred from README/docs, not measured live.
- **Evidence required**: every score must cite a file path or command output. No guessing.
- **No live credentials**: do not attempt signups or API calls.
- **Project scope**: audit one project at a time. For monorepos, specify package/module.

## Failure Modes

| Failure | Detection | Recovery |
|---|---|---|
| No README | `ls README*` fails | Ask Adam for project docs or abort |
| No CLI entry point | `--help` command fails | Mark CLI pass as 0-2, note "no CLI" |
| Missing evidence | score cannot be justified | Mark dimension as N/A or 0 |
| Ambiguous product type | multiple install commands | Ask Adam to clarify |

## Compatibility

- **OpenClaw**: works with Read + Bash tools. No browser dependency.
- **Models**: methodology is LLM-agnostic.
- **Outputs**: markdown for Discord/Telegram, or table2img PNG if tabular.

## Security Audit

- **Read-only**: skill only reads files and runs `--help`. No writes.
- **No network calls**: no telemetry, no external APIs.
- **No secret access**: does not read `.env` or credential files.
- **Safe command execution**: only `--help` and file listing. No destructive commands.
- **Reviewed**: 2026-06-29 during Etap 7 isolated sub-agent audit.

## OpenClaw Adaptation Notes

Differences from gstack `/devex-review`:

| Aspect | gstack | OpenClaw dx-audit |
|---|---|---|
| Method | Live browse + bash + screenshots | Static artifact analysis |
| TTHW | Measured live | Inferred from docs |
| Evidence | Screenshots (gold standard) | File quotes + command output |
| Speed | 10-30 min | 2-5 min |
| Accuracy | High for web surfaces | High for docs/code, low for live UX |
| Tool dependency | `browse` binary | Read + Bash only |

The 8 passes, First Principles, 7 Characteristics, and scoring rubric are preserved from gstack.

## Assignment

Assigned to agents that evaluate developer-facing work:

- `main` — primary orchestrator
- `techleader-developer-reviewer` — code/tool releases
- `failover1-developer-reviewer` — failover review
- `work-data-engineer` — data tooling releases
- `quant-researcher` — strategy/tool releases

## Explicitly Out of Scope

- Live web testing (use `browser` tool directly)
- Performance/load testing
- User interviews or surveys
- A/B testing
- Real signup/auth flows
- Multi-provider DX benchmarking (unless Adam provides targets)