# gstack → OpenClaw Adoption Report

**Final report date:** 2026-06-28
**Fork:** `wiecon-dev/gstack` (HEAD `11de390`, v1.58.5.0)
**Branch:** `wiecon/openclaw-adapt`
**Plan:** `openclaw/ADOPTION_PLAN.md`
**Status:** ✅ COMPLETE — all 6 stages done, 3 skills READY-TO-ACTIVATE after sub-agent audit.

## Executive Summary

Adoptowaliśmy **3 nowe skill-e / enhancements** z gstack, wszystkie przeszły
isolated sub-agent audit **READY-TO-ACTIVATE**. Żaden kod gstack nie został
przeniesiony 1:1 — wszystko to adaptacja konceptów do OpenClaw Format A.

| Skill / Asset | Location | Status | Etap |
|---|---|---|---|
| AskUserQuestion Format spec | `openclaw/ASKUSERQUESTION_FORMAT.md` | ✅ Używany przez `verification-before-completion-openclaw` | 1 |
| `gstack-openclaw-scope-review` | `openclaw/skills/gstack-openclaw-scope-review/` | ✅ READY-TO-ACTIVATE (openclaw-extra) | 2 |
| `code-review-and-quality` | `~/.openclaw/workspace/skills/code-review-and-quality/SKILL.md` | ✅ READY-TO-ACTIVATE (workspace skill) | 3 |
| `continuous-checkpoint-mode` | `openclaw/skills/continuous-checkpoint-mode/` | ✅ READY-TO-ACTIVATE (openclaw-extra) | 4 |
| Dispatch refinement | `openclaw/agents-gstack-section.md` | ✅ Mapping Format A → gstack tiers | 5 |
| Sub-agent audit | ten raport | ✅ 3/3 READY-TO-ACTIVATE | 6 |

## What Was Ported (and why)

### 1. AskUserQuestion Format (Etap 1)

**Z gstack:** kanoniczny format pytań decyzyjnych `D<N>`.
**Do OpenClaw:** `Opcja <N>` (spójne z naszą regułą numeracji opcji Adama).

**Kluczowe elementy zachowane:**
- ELI10 plain English (2-4 zdania)
- Completeness X/10 scoring (10/7/3)
- Pros/Cons ≥40 chars, uczciwe ✅ i ❌
- (recommended) label na dokładnie jednej opcji
- Stakes line + Recommendation + Net line
- Hard-stop escape dla destructive decisions
- Split chains dla 5+ opcji

**Demo integracja:** nowa sekcja w `verification-before-completion-openclaw`
"Decision Briefs (AskUserQuestion Format)" z szablonem dla vbc-context.

### 2. 4-Mode Scope Review (Etap 2)

**Z gstack:** `/plan-ceo-review` — 4 tryby: EXPANSION, SELECTIVE, HOLD, REDUCTION.
**Nowy skill:** `gstack-openclaw-scope-review` z HARD GATE: Adam 100% w kontroli.

**OpenClaw-specific:**
- Heurystyka wyboru trybu (nie deterministyczny pseudo-code)
- Per-expansion opt-in (zgodnie z Iron Laws)
- Durable scope decisions → `memory_add`
- Format Opcja N (nie D<N>)
- Plain text message (nie Claude Code tool call)

### 3. Verification Mode + Scope Drift (Etap 3)

**Z gstack:** `/review` — Verification Mode taxonomy, Scope Drift Detection.
**Wzmocniony skill:** `code-review-and-quality`.

**Dodane:**
- **Verification Mode:** DIFF-VERIFIABLE / CROSS-REPO / EXTERNAL-STATE / CONTENT-SHAPE
- **Scope Drift Detection (Step 1.5):** "Did they build what was requested?"
- **Plan Completion Audit:** DONE / PARTIAL / NOT DONE / CHANGED / UNVERIFIABLE
- 5-axis review z Verification Mode classification
- UNVERIFIABLE > silent DONE

### 4. Continuous Checkpoint Mode (Etap 4)

**Z gstack:** auto-commit WIP z `[gstack-context]`.
**Nowy skill:** `continuous-checkpoint-mode` — **OFF BY DEFAULT**.

**OpenClaw-specific:**
- Explicit activation via config file / Adam flag
- Format: `WIP:` + blok `[gstack-context]` (Decisions, Remaining, Tried)
- Branch allowlist (bez main/master)
- Per-file staging (nigdy `git add -A`)
- Config `.checkpoint-config.json` dodany do `.gitignore`
- Pairs with `finishing-a-development-branch` (squash)

### 5. Dispatch Refinement (Etap 5)

**Plik:** `openclaw/agents-gstack-section.md`

**Dodane:** tabela mapowania gstack tierów (SIMPLE/MEDIUM/HEAVY/FULL/PLAN)
do naszych Format A skills. Preferujemy OpenClaw-native equivalenty:
- `/review` → `code-review-and-quality`
- `/investigate` → `systematic-debugging` + `debug-toolkit`
- `/plan-ceo-review` → `gstack-openclaw-scope-review`
- `/autoplan` → `writing-plans` + `subagent-driven-development`
- `/office-hours` → `brainstorming`

## What Was NOT Ported

- iOS skills (5) — nie robimy iOS
- `/browse`, `/codex`, `/scrape`, `/make-pdf`, `/diagram` — mamy lepsze alternatywy
- `/setup-gbrain`, `/sync-gbrain` — mamy Mem0+QMD
- Telemetria, plan-tune, question-tuning — "level 2 optimization"
- 100+ `bin/` skryptów — tightly coupled do Claude Code
- Jargon blacklist — specyficzny styl Garry'ego

## Configuration Changes

### `openclaw.json`

- **Backup:** `~/.openclaw/backups/openclaw-pre-extraDirs-gstack-20260628T2155.bak`
- **Changes:**
  - Dodano `gstack-openclaw-scope-review` do 6 agentów: `main`, `techleader-developer-reviewer`, `failover1-developer-reviewer`, `quant-researcher`, `work-data-engineer`, `agent-orchestrator`
  - Dodano `continuous-checkpoint-mode` do 4 agentów: `main`, `techleader-developer-reviewer`, `quant-researcher`, `work-data-engineer`
  - Dodano `/srv/samba/openclaw/github_forks/gstack/openclaw/skills` do `skills.load.extraDirs`
    (odkrycie: 4 istniejące gstack-openclaw-* skille nie były ładowane bez tego)

### Agent assignments

| Agent | scope-review | checkpoint |
|---|---|---|
| main | ✅ | ✅ |
| techleader-developer-reviewer | ✅ | ✅ |
| work-data-engineer | ✅ | ✅ |
| quant-researcher | ✅ | ✅ |
| failover1-developer-reviewer | ✅ | ❌ |
| agent-orchestrator | ✅ | ❌ |

## Verification

### Sub-agent audit (Etap 6)

Isolated sub-agent `gstack-etap6-audit` z `context=isolated` sprawdził:
- Format A 12 headers + Security Audit
- Runtime visibility (`openclaw skills list`)
- JSON validity
- Duplicate headers / skill names
- Specyficzne issues z każdego skillu

**Wynik:**
| Skill | Pierwszy audit | Re-audit po fixach |
|---|---|---|
| `gstack-openclaw-scope-review` | FIX-REQUIRED | ✅ READY-TO-ACTIVATE |
| `continuous-checkpoint-mode` | FIX-REQUIRED | ✅ READY-TO-ACTIVATE |
| `code-review-and-quality` | FIX-REQUIRED | ✅ READY-TO-ACTIVATE |

**Kluczowe naprawy po pierwszym audycie:**
- scope-review: dodano `Tools / Commands` i `Constraints`, z pseudo-code na heurystykę, `default_prompt` po angielsku
- continuous-checkpoint: dodano `Tools / Commands` i `Constraints`, safety wydzielono do `Security Audit`, dodano `.gitignore` dla `.checkpoint-config.json`, usunięto commit-msg hook false assurance
- code-review-and-quality: poprawiono `###` sub-headery, usunięto duplikaty `##`

### Smoke test (runtime)

- `openclaw skills list` pokazuje `gstack-openclaw-scope-review` jako ✓ ready
- `openclaw skills list` pokazuje `continuous-checkpoint-mode` jako ✓ ready
- `code-review-and-quality` jest loaded (excluded dla main zgodnie z allowlist)
- `openclaw.json` JSON-valid ✅

## Git History

```
8936499 feat(openclaw): Etap 2+4+5 — scope-review + continuous-checkpoint + dispatch refinement
6dcb58d feat(openclaw): Etap 1 — AskUserQuestion Format spec + adoption plan
11de390 v1.58.5.0 feat: first-run activation scaffold + gstack router front door (#2078)
```

## Backups

| Plik | Backup | Uzasadnienie |
|---|---|---|
| `code-review-and-quality/SKILL.md` | `~/.openclaw/backups/code-review-and-quality-pre-etap3-20260628.bak` | przed migracją Etapu 3 |
| `code-review-and-quality/SKILL.md` | `~/.openclaw/backups/code-review-quality-pre-audit-fix-20260628.bak` | przed fixami audytu |
| `openclaw.json` | `~/.openclaw/backups/openclaw-pre-etap2-4-20260628T2148.bak` | przed dodaniem skilli |
| `openclaw.json` | `~/.openclaw/backups/openclaw-pre-extraDirs-gstack-20260628T2155.bak` | przed extraDirs |

## Lessons Learned

1. **gstack skills w forku nie ładowały się bez extraDirs.** 4 istniejące gstack-openclaw-* skille były martwe (nie widoczne w runtime) dopóki nie dodaliśmy ścieżki do `skills.load.extraDirs`. To było istotne odkrycie — trzeba było restartować Gateway 2 razy.

2. **Isolated sub-agent audyt ma realną wartość.** Pierwszy audyt złapał braki Format A i operationalization gaps których main agent nie zauważył (confirmation bias). Naprawy po audycie poprawiły jakość skilli.

3. **Pseudo-code ≠ instructions.** Pierwsza wersja mode-pickera była funkcją Python — sub-agent słusznie zauważył, że LLM lepiej rozumie tabelę heurystyczną + fallback do pytania Adama.

4. **OFF BY DEFAULT dla inwazyjnych skilli.** Continuous checkpoint mógłby zaśmiecać historię gdyby był domyślnie ON. Explicit opt-in + branch allowlist to minimum bezpieczeństwa.

5. **Cross-references lepsze niż duplikaty.** Format AUQ żyje w osobnym pliku, a skille go referencjonują. To bardziej utrzymywalne niż kopiowanie szablonu do każdego skillu.

## Residual Risks (accepted)

| Risk | Mitigacja |
|---|---|
| `gstack-openclaw-scope-review` może generować inconsistent opcje jeśli `ASKUSERQUESTION_FORMAT.md` zostanie zmieniony | Plik jest w fork gstack, wersjonowany, skill referencjonuje kanoniczny path |
| `continuous-checkpoint-mode` wymaga modelu żeby poprawnie klasyfikował "mid-edit" pliki | Constraints + branch allowlist + skip_paths + `.gitignore`; Adam review przed push |
| `code-review-and-quality` jest excluded dla `main` | To OK — skill jest używany przez deweloperów (`techleader`, `failover1`) |
| 6 restartów Gateway w ciągu dnia | Każdy był za zgodą Adama; zero utraty danych, zero nowych doctor warnings |

## Next Steps / Maintenance

- [ ] Obserwuj użycie `gstack-openclaw-scope-review` przez 2 tygodnie — czy Adam korzysta z 4 trybów?
- [ ] Obserwuj użycie `continuous-checkpoint-mode` — czy włączasz go w praktyce?
- [ ] Dodaj smoke test automatyczny do `openclaw-mem0` lub `morning-report`?
- [ ] Rozważ adaptację `/codex` jako OpenClaw-native adversarial review (niski priorytet)
- [ ] Uaktualnij `MEMORY.md` o ten raport (zrobione w tej samej sesji)

## Approval

- **Adam wybrał Opcję 4** (wszystkie etapy po kolei) 2026-06-28 21:46 GMT+2.
- **Adam zatwierdził restart Gateway** 2026-06-28 21:53 GMT+2.
- **Adam potwierdził kontynuację pracy** 2026-06-28 22:04-22:05 GMT+2.
- **Sub-agent audit:** 0 FIX-REQUIRED, 0 REJECT, 3/3 READY-TO-ACTIVATE.

## References

- GStack source: `https://github.com/wiecon-dev/gstack/tree/wiecon/openclaw-adapt/openclaw/`
- ADOPTION_PLAN.md: `openclaw/ADOPTION_PLAN.md`
- ASKUSERQUESTION_FORMAT.md: `openclaw/ASKUSERQUESTION_FORMAT.md`
- MEMORY.md: `~/.openclaw/workspace/MEMORY.md` (sekcja gstack)
- Daily note: `~/.openclaw/workspace/memory/2026-06-28.md`

---

*End of report — adoption complete.*