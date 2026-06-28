---
name: "continuous-checkpoint-mode"
description: "Użyj gdy Adam chce auto-commit postępu w trakcie długich sesji (WIP z blokiem [gstack-context]). Adaptacja gstack Continuous Checkpoint Mode. Domyślnie OFF — explicit opt-in."
---

# Continuous Checkpoint Mode (gstack → OpenClaw)

## Origin

- **Source pinned:** gstack v1.58.5.0 commit `11de390` (MIT), Continuous Checkpoint Mode z main `SKILL.md`.
- **OpenClaw adaptation:** ręczna adaptacja 2026-06-28 w ramach Etapu 4 adopcji gstack.
- **Typ:** opt-in configuration skill (domyślnie OFF, requires explicit activation).

Nie używaj globalnych skryptów gstack — auto-commit wykonujemy przez lokalne `git commit` z formatowanym blokiem kontekstowym.

## Description

Continuous Checkpoint Mode to tryb pracy w którym agent auto-commit'uje **każdy completed logical unit** z `WIP:` prefixem i blokiem `[gstack-context]` zawierającym Decisions, Remaining, Tried. Cel: w długich sesjach (backtesty, migracje, duże refaktory) nie stracić kontekstu po kompaktacji ani restart.

**OFF BY DEFAULT.** Agent NIE włącza tego trybu samodzielnie. Wymaga explicit activation przez:
- Config file: `~/.openclaw/workspace/.checkpoint-config.json` → `{"mode": "continuous", "push": false}`
- LUB flagę w wiadomości Adama: "włącz continuous checkpoint dla tej sesji"
- LUB instrukcję w SKILL.md innego skilla.

## When to Use

- Długie sesje (backtesty, migracje, multi-file refaktory) gdzie restart/kompaktacja mogą zresetować kontekst.
- Eksperymenty z wieloma iteracjami (zmiana parametrów, próba/odrzucenie podejść).
- Praca z wieloma sub-agentami (każdy commit to checkpoint do weryfikacji).
- Adam chce zachować granularną historię decyzji (per-commit rationale).

## When NOT to Use

- Krótkie sesje (<30 min, <5 commitów).
- Proste zmiany (typo fix, jeden plik).
- Gdy Adam chce "czystą" historię (squash tylko na koniec via `finishing-a-development-branch`).
- Gdy push byłby niepożądany (PR review, publiczny branch).

## Inputs

- **Config flag** (`mode: continuous`) lub explicit activation.
- **Working tree state** (uncommitted changes = checkpoint candidate).
- **Git context** (current branch, last commit, dirty files).

## Outputs

- **WIP commits** z sformatowanym blokiem `[gstack-context]`.
- **Log** w `~/.openclaw/logs/continuous-checkpoint.log` per commit.
- **Final cleanup:** `finishing-a-development-branch` squash'uje WIP → clean commits na końcu sesji.

## Workflow / Process

### Konfiguracja

**Config file:** `~/.openclaw/workspace/.checkpoint-config.json`

```json
{
  "mode": "continuous",
  "push": false,
  "branch_allowlist": ["wiecon/*"],
  "skip_paths": ["node_modules/", "*.log", ".openclaw/"],
  "context_block": {
    "include_decisions": true,
    "include_remaining": true,
    "include_tried": true
  }
}
```

- `mode: continuous` — włączony. `explicit` (default) = wyłączony.
- `push: false` — NIE pushuj WIP commits. Adam pushuje ręcznie po review.
- `branch_allowlist` — bezpieczeństwo: tylko feature branch'e (nie main/master).
- `skip_paths` — nie commituj generated/large/log files.

### Commit Format

Każdy WIP commit ma format:

```
WIP: <concise description of what changed>

[gstack-context]
Decisions: <key choices made this step>
Remaining: <what's left in the logical unit>
Tried: <failed approaches worth recording> (omit if none)
Skill: </skill-name-if-running> (optional)
[/gstack-context]
```

**Przykład:**
```
WIP: backtest-advanced — dodaj ticker validation w data_providers.py:download()

[gstack-context]
Decisions: regex `^[A-Z0-9^.\-]{1,15}$` (akceptuje SPY, BRK.B, RDS-A)
Remaining: error message refinement + tests
Tried: whitelist check (za sztywne), uppercase normalization (niebezpieczne dla non-US)
Skill: backtest-advanced
[/gstack-context]
```

### Kiedy commitować

Commit **po każdym completed logical unit**:
- Nowy intentional file (nie generated, nie log)
- Completed function/module
- Verified bug fix
- Przed długim install/build/test command (zabezpieczenie)

Commit **NIE po**:
- Mid-edit state (niedokończona funkcja)
- Failing tests
- Bulk refactor bez regression check
- Generated files (auto-save od edytora)

### Rules (non-negotiable)

1. **Stage only intentional files** — `git add <file>` per file, **NIGDY** `git add -A` ani `git add .`
2. **Prefix `WIP:`** w każdym commit message.
3. **Blok `[gstack-context]`** obowiązkowy (Decisions + Remaining minimum).
4. **`Tried:` omit if none** — nie zostawiaj pustej linii.
5. **Push tylko gdy `checkpoint_push: true`** w configu. Domyślnie FALSE.
6. **Squash na końcu** przez `finishing-a-development-branch` (WIP → clean commits).

### Bezpieczeństwo

- **Branch allowlist** zapobiega commit na main/master/production.
- **Skip paths** zapobiega commit generated/large files.
- **Manual review** każdego WIP przed squash (Adam przegląda `git log --oneline`).
- **OFF by default** — agent nie włącza bez explicit zgody.

## OpenClaw Adaptation

- **Brak globalnych skryptów** — commit wykonujemy przez `exec` + `git commit` z formatowanym message.
- **Config file** w `~/.openclaw/workspace/` (gitignored dla WIP artifacts).
- **Pairs with:** `finishing-a-development-branch` (squash + cleanup na końcu).
- **Backup:** `~/.openclaw/backups/pre-continuous-checkpoint-<timestamp>/` przed aktywacją.

## Compatibility

- **OpenClaw runtime:** skill dostępny w agentach którzy robią długie sesje: `techleader-developer-reviewer`, `work-data-engineer`, `quant-researcher`, `main` (do potwierdzenia po Etap 6).
- **Format A headers:** zgodny z 12 standardowymi nagłówkami.
- **Pin:** gstack v1.58.5.0 commit `11de390` (MIT).
- **Polska treść:** zachowana zgodnie z Adam preferencją.

## Failure Modes

| Failure | Przyczyna | Mitigacja |
|---|---|---|
| Commit na main branch | Bug w branch_allowlist | Strict allowlist + pre-commit hook check |
| Commit generated files | Lenistwo (git add -A) | Rule 1: per-file staging |
| Brak bloku [gstack-context] | Skip context | Commit-msg hook validates format |
| Push bez zgody | `push: true` accidental | Default `push: false`, explicit opt-in |
| Bulk refactor jako 1 commit | "To logic unit" | Rule: 1 logical unit = 1 function/module/fix |
| Squash później niemożliwy | Force-push historia | Continuous commits on feature branch, never main |
| Mid-edit commit | Niecierpliwość | Rule: commit only po completed logical unit |

## Security Audit

- **Source provenance:** gstack v1.58.5.0 commit `11de390` (MIT) — otwarte źródło.
- **OpenClaw adaptation:** ręczna adaptacja 2026-06-28 (Etap 4 adopcji).
- **Brak skryptów/hooków/binarek:** skill jest instruction-only.
- **Brak sekretów/credentials.**
- **Activation policy:** `agents/openai.yaml` z `policy.allow_implicit_invocation: false` (explicit only).
- **Safety contract:** OFF by default, branch allowlist required, no force-push, no git add -A.
- **Reversible:** `git reset --soft HEAD~N` cofnie N WIP commits.
- **Audit class:** PASS.
