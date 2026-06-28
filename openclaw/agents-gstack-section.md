## Coding Tasks (gstack)

### Rules (non-negotiable)

1. **Always spawn, never redirect.** When user asks to use ANY gstack skill,
   ALWAYS spawn a Claude Code session via sessions_spawn. Never tell user to
   open Claude Code himself. Never say "this needs to run in Claude Code."
   Never say "you'll need to open Claude Code for that." Just do it.

2. **Resolve the repo.** If user names a repo or project, set the working
   directory to that repo path. If the repo path isn't known, ask which
   repo — don't punt to telling the user to open Claude Code.

3. **Autoplan runs end-to-end.** For /autoplan specifically: spawn the session,
   let it run the full review pipeline (CEO → design → eng), and when it
   finishes, report the plan back here in chat. Write the plan to memory so
   the user can find it later. User should never have to leave Telegram.

### Dispatch Routing

When asked for coding work, pick the dispatch tier:

**SIMPLE:** "fix this typo," "update that config," single-file changes
→ sessions_spawn(runtime: "acp", prompt: "<just the task>")

**MEDIUM:** multi-file features, refactors, skill edits
→ sessions_spawn(runtime: "acp", prompt: "<gstack-lite content>\n\n<task>")

**HEAVY:** needs a specific gstack methodology
→ sessions_spawn(runtime: "acp", prompt: "Load gstack. Run /qa https://...")
  Skills: /cso, /review, /qa, /ship, /investigate, /design-review, /benchmark, /gstack-upgrade

**FULL:** build a complete feature, multi-day scope, needs planning + review
→ sessions_spawn(runtime: "acp", prompt: "<gstack-full content>\n\n<task>")
  Claude Code runs: /autoplan → implement → /ship → report back

**PLAN:** user wants to plan a Claude Code project, spec out a feature, or design
  something before any code is written
→ sessions_spawn(runtime: "acp", prompt: "<gstack-plan content>\n\n<task>")
  Claude Code runs: /office-hours → /autoplan → saves plan file → reports back
  Persist the plan link to memory/knowledge store.
  When the user is ready to implement, spawn a new FULL session pointing at the plan.

### Decision Heuristic

- Can it be done in <10 lines of code? → **SIMPLE**
- Does it touch multiple files but the approach is obvious? → **MEDIUM**
- Does the user name a specific skill (/cso, /review, /qa)? → **HEAVY**
- "Upgrade gstack", "update gstack" → **HEAVY** with `Run /gstack-upgrade`
- Is it a feature, project, or objective (not a task)? → **FULL**
- Does the user want to PLAN something without implementing yet? → **PLAN**

## OpenClaw Format A Skills → GStack Tier Mapping

When the orchestrator picks a dispatch tier, OpenClaw's **Format A skills** in
`~/.openclaw/workspace/skills/` can be invoked instead of (or in addition to)
gstack skills. The mapping below preserves the gstack dispatch logic while
leveraging our native Format A skill ecosystem (23 skills in strict Format A
as of 2026-06-28, per Etap 7+8+quick+vbc).

| Tier | GStack Skill | OpenClaw Format A Equivalent | Notes |
|---|---|---|---|
| SIMPLE | (direct task) | `verification-before-completion-openclaw` after completion | Always verify before claiming done |
| MEDIUM | (gstack-lite context) | `tdd-vertical-slices` + `verification-before-completion-openclaw` | For multi-file refactors |
| HEAVY | `/review` | **`code-review-and-quality`** (now with Verification Mode taxonomy + Scope Drift Detection) | Prefer OpenClaw version — tighter integration |
| HEAVY | `/investigate` | `systematic-debugging` + `debug-toolkit` | Two-skill combo: systematic + toolkit |
| HEAVY | `/spec` | `spec-driven-development` | OpenClaw version with OpenClaw-specific constraints |
| HEAVY | `/plan-ceo-review` | **`gstack-openclaw-scope-review`** (NEW Etap 2) | 4-trybowa filozofia scope review |
| HEAVY | `/plan-eng-review` | `architecture-review` | Already have it |
| HEAVY | `/plan-devex-review` | `context-engineering` | Already have it |
| HEAVY | `/codex` (OpenAI) | `doubt-driven-development` (isolated sub-agent) | OpenClaw-native adversarial review |
| FULL | `/autoplan` → `/ship` | `writing-plans` + `subagent-driven-development` + `finishing-a-development-branch` | Full pipeline via OpenClaw skills |
| PLAN | `/office-hours` | `brainstorming` | OpenClaw version |
| PLAN | `/plan-tune` | (N/A — not adopted) | "Level 2 optimization", not needed |

### Continuous Checkpoint (NEW Etap 4)

For long-running sessions (backtests, multi-file migrations, exploratory work),
consider invoking **`continuous-checkpoint-mode`** (OptIn) so the agent
auto-commits `WIP:` checkpoints with `[gstack-context]` blocks (Decisions,
Remaining, Tried). OFF by default — requires explicit Adam activation.

**Pairs with:** `finishing-a-development-branch` (squash WIP → clean commits on session end).

### AskUserQuestion Format (NEW Etap 1)

For decision briefs (multiple options, non-trivial trade-offs), use the
canonical **`ASKUSERQUESTION_FORMAT.md`** spec — D-numbering (or Opcja N for
OpenClaw-facing), ELI10 plain English, Completeness X/10 scoring, Pros/Cons
≥40 chars, Net line. Hard-stop escape for destructive options.

**Adopted in:** `verification-before-completion-openclaw` (demo integration),
all future skills adopting Format A pattern.

### Cross-references

- `openclaw/ADOPTION_PLAN.md` — 6-etapowa roadmapa adopcji gstack → OpenClaw
- `openclaw/ASKUSERQUESTION_FORMAT.md` — kanoniczny specyfikacja decision brief format
- `openclaw/skills/gstack-openclaw-scope-review/SKILL.md` — nowy skill (Etap 2)
- `openclaw/skills/continuous-checkpoint-mode/SKILL.md` — nowy skill (Etap 4)
