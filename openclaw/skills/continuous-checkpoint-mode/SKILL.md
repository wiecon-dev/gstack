---
name: "continuous-checkpoint-mode"
description: "Użyj gdy Adam chce auto-commit postępu w trakcie długich sesji (WIP z blokiem [gstack-context]). Adaptacja gstack Continuous Checkpoint Mode. Domyślnie OFF — explicit opt-in."
---

# Continuous Checkpoint Mode (gstack → OpenClaw)

## Origin

- **Source pinned:** gstack v1.58.5.0 commit `11de390` (MIT), Continuous Checkpoint Mode z main `SKILL.md`.
- **OpenClaw adaptation:** ręczna adaptacja 2026-06-28 w ramach Etapu 4 adopcji gstack.
- **Typ:** opt-in configuration skill (domyślnie OFF, wymaga explicit activation).

Nie używaj globalnych skryptów gstack — auto-commit wykonujemy przez lokalne `git commit` z formatowanym blokiem kontekstowym.

## Description

Continuous Checkpoint Mode to tryb pracy w którym agent auto-commit'uje **każdy completed logical unit** z `WIP:` prefixem i blokiem `[gstack-context]` zawierającym Decisions, Remaining, Tried. Cel: w długich sesjach (backtesty, migracje, duże refaktory) nie stracić kontekstu po kompaktacji ani restart.

**OFF BY DEFAULT.** Agent NIE włącza tego trybu samodzielnie. Wymaga explicit activation przez jeden z:
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

### Step 1: Verify activation

1. Sprawdź czy istnieje `~/.openclaw/workspace/.checkpoint-config.json`.
2. Jeśli brak — sprawdź wiadomość Adama / kontekst skill'a na słowa "continuous checkpoint".
3. Jeśli `mode != "continuous"` — STOP. Ten skill nie jest aktywny.

### Step 2: Verify git context

1. **Branch check:** `git branch --show-current`. Porównaj z `branch_allowlist` z configu. Jeśli branch nie pasuje → STOP (nie commituj).
2. **Dirty check:** `git status --short`. Jeśli brak zmian → nic do commitowania.
3. **Gitignore check:** `.gitignore` MUSI zawierać `.checkpoint-config.json`. Jeśli brak → ostrzeż Adama, nie aktywuj dopóki nie dodane.

### Step 3: Select files (per-file staging)

Dla każdej zmiany w `git status --short`:
- Jeśli ścieżka pasuje do `skip_paths` configu — pomiń.
- Jeśli plik jest generated (np. `.log`, `node_modules/`, `__pycache__/`, build artifacts) — pomiń.
- Jeśli plik to mid-edit (np. test FAIL, niedokończona funkcja) — NIE commituj.
- W przeciwnym razie: `git add <file>` **per file**, nigdy `git add -A` ani `git add .`.

### Step 4: Build commit message

Format:

```
WIP: <concise description of what changed>

[gstack-context]
Decisions: <key choices made this step>
Remaining: <what's left in the logical unit>
Tried: <failed approaches worth recording> (omit if none)
Skill: </skill-name-if-running> (optional)
[/gstack-context]
```

Przykład:
```
WIP: backtest-advanced — dodaj ticker validation w data_providers.py:download()

[gstack-context]
Decisions: regex `^[A-Z0-9^.\-]{1,15}$` (akceptuje SPY, BRK.B, RDS-A)
Remaining: error message refinement + tests
Tried: whitelist check (za sztywne), uppercase normalization (niebezpieczne dla non-US)
Skill: backtest-advanced
[/gstack-context]
```

### Step 5: Commit

1. Upewnij się że branch jest na allowlist.
2. Upewnij się że staged files to tylko intencjonalne zmiany.
3. Wykonaj `git commit -m "<message z bloku>"`.
4. Zapisz log: `~/.openclaw/logs/continuous-checkpoint.log` append-only.

### Step 6: Push decision

1. Jeśli `push: true` w configu → `git push origin <branch>`.
2. Jeśli `push: false` (default) → NIE pushuj. Adam pushuje ręcznie po review.

### Step 7: End-of-session squash

Gdy sesja kończy się lub Adam mówi "skończmy":
1. Wywołaj `finishing-a-development-branch` do squash WIP → clean commits.
2. Usuń `~/.openclaw/workspace/.checkpoint-config.json` jeśli był tymczasowy.

## Tools / Commands

- `read` — odczytaj `.checkpoint-config.json`.
- `exec` — uruchom `git branch --show-current`, `git status --short`, `git add <file>`, `git commit -m "..."`, `git push` (tylko gdy push: true).
- `write` (append) — zapisz log do `~/.openclaw/logs/continuous-checkpoint.log`.
- `memory_add` — zapisz durable decision że checkpoint mode był użyty (opcjonalnie).

## Constraints

1. **Stage only intentional files** — `git add <file>` per file, **NIGDY** `git add -A` ani `git add .`
2. **Prefix `WIP:`** w każdym commit message.
3. **Blok `[gstack-context]`** obowiązkowy (Decisions + Remaining minimum).
4. **`Tried:` omit if none** — nie zostawiaj pustej linii.
5. **Push tylko gdy `push: true`** w configu. Domyślnie FALSE.
6. **Squash na końcu** przez `finishing-a-development-branch` (WIP → clean commits).
7. **Branch allowlist** — commituj tylko na feature branch'ach z listy; NIGDY na main/master/production.
8. **Skip paths** — nie commituj generated/large/log files.
9. **Commit tylko po completed logical unit** — nie w połowie edycji, nie przy failing tests, nie bulk refactor bez regression check.
10. **Config file gitignored** — `.checkpoint-config.json` musi być w `.gitignore` workspace; jeśli nie, nie aktywuj trybu.

## OpenClaw Adaptation

- **Brak globalnych skryptów gstack** — wszystko przez OpenClaw tools (`exec`, `read`, `write`).
- **Config file** w `~/.openclaw/workspace/` (gitignored dla WIP artifacts).
- **Pairs with:** `finishing-a-development-branch` (squash + cleanup na końcu).
- **Backup:** `~/.openclaw/backups/pre-continuous-checkpoint-<timestamp>/` przed aktywacją.

## Compatibility

- **OpenClaw runtime:** skill dostępny w agentach którzy robią długie sesje: `techleader-developer-reviewer`, `work-data-engineer`, `quant-researcher`, `main`.
- **Format A headers:** zgodny z 12 standardowymi nagłówkami.
- **Pin:** gstack v1.58.5.0 commit `11de390` (MIT).
- **Polska treść:** zachowana zgodnie z Adam preferencją.

## Failure Modes

| Failure | Przyczyna | Mitigacja |
|---|---|---|
| Commit na main branch | Bug w branch_allowlist | Strict allowlist check w Step 2 |
| Commit generated files | Lenistwo (git add -A) | Constraint 1: per-file staging + skip_paths w Step 3 |
| Brak bloku [gstack-context] | Skip context | Constraint 3: blok obowiązkowy w Step 4 |
| Push bez zgody | `push: true` accidental | Constraint 5: default `push: false` |
| Bulk refactor jako 1 commit | "To logic unit" | Constraint 9: 1 completed logical unit |
| Squash później niemożliwy | Force-push historia | Continuous commits na feature branch, nigdy main |
| Mid-edit commit | Niecierpliwość | Constraint 9: commit only po completed logical unit |
| Config file w repo | `.gitignore` brakuje `.checkpoint-config.json` | Constraint 10: sprawdź gitignore w Step 2, nie aktywuj jeśli brak |

## Security Audit

- **Source provenance:** gstack v1.58.5.0 commit `11de390` (MIT) — otwarte źródło.
- **OpenClaw adaptation:** ręczna adaptacja 2026-06-28 (Etap 4 adopcji).
- **Brak skryptów/hooków/binarek:** skill jest instruction-only.
- **Brak sekretów/credentials.**
- **Activation policy:** `agents/openai.yaml` z `policy.allow_implicit_invocation: false` (explicit only).
- **Safety contract:** OFF by default, branch allowlist required, no force-push, no git add -A.
- **Reversible:** `git reset --soft HEAD~N` cofnie N WIP commits.
- **Audit class:** PASS.
