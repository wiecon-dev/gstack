# GStack → OpenClaw Adoption Plan

**Fork:** `wiecon-dev/gstack` (HEAD `11de390`, v1.58.5.0)
**Branch:** `wiecon/openclaw-adapt`
**Plan owner:** Adam (wiecon) + Robbo
**Plan date:** 2026-06-28
**Status:** 🚧 IN PROGRESS

## 1. Context

GStack (Garry Tan's Claude Code framework) ma 60+ skillów, 100+ bin/ skryptów,
rozbudowaną architekturę pod Claude Code. Nasz workspace ma 171 skillów,
~90% pokrycia tematycznego z gstack.

**Wniosek z rekonesansu (2026-06-28):** GStack to engineering porn —
piękna architektura, mocne zasady, doskonałe formaty. Ale tightly coupled
do Claude Code i flow Garry'ego. Najlepsza wartość = wziąć koncepty
(formaty, filozofie, taksonomie), nie kod.

## 2. Co adoptujemy (TOP 6 wartościowych rzeczy)

1. **AskUserQuestion format** (D-numbering, ELI10, Completeness X/10, Net line)
2. **Filozofia 4 trybów scope review** (EXPANSION/SELECTIVE/HOLD/REDUCTION)
3. **Verification Mode taxonomy** (DIFF-VERIFIABLE/CROSS-REPO/EXTERNAL-STATE/CONTENT-SHAPE)
4. **Scope Drift Detection** (Step 1.5 z `/review`)
5. **Continuous Checkpoint Mode** (auto-commit WIP z blokiem [gstack-context])
6. **Decision Brief format** (hard-stop escape dla destructive actions)

## 3. Czego NIE adoptujemy

- iOS skills (5) — nie robimy iOS
- `/browse`, `/open-gstack-browser`, `/setup-browser-cookies` — mamy `playwright`
- `/codex` — OpenAI-specific, nie w naszym flow
- `/setup-gbrain`, `/sync-gbrain` — mamy Mem0+QMD
- `/scrape`, `/skillify` — niszowe
- `/make-pdf`, `/diagram` — niszowe, odłożone
- `/careful`, `/freeze`, `/guard`, `/unfreeze` — mamy `AGENTS.md` + `verification-before-completion-openclaw`
- Telemetria, plan-tune, question-tuning — "level 2 optimization"
- Jargon blacklist — specyficzny styl Garry'ego
- 100+ bin/ skryptów — nieprzenośne

## 4. Etap breakdown

### Etap 1: AskUserQuestion format specification (foundation)

**Cel:** Stworzyć kanoniczny dokument formatu AskUserQuestion, który inne skille
będą mogły adoptować. Plus demonstracyjna integracja w `verification-before-completion-openclaw`.

**Deliverables:**
- `/srv/samba/openclaw/github_forks/gstack/openclaw/ASKUSERQUESTION_FORMAT.md` (nowy)
- Aktualizacja `/home/openclaw/.openclaw/workspace/skills/verification-before-completion-openclaw/SKILL.md` (nowe sekcje z formatem)

**Czas:** 1 sesja, ~2-3h
**Zależności:** brak (foundation)
**Weryfikacja:** Smoke test nowego formatu w 1 skillu + git diff readable
**Ryzyko:** niskie (docs + minimalna zmiana skilla)

### Etap 2: gstack-openclaw-scope-review

**Cel:** Nowy skill adaptujący 4-trybową filozofię scope review z `/plan-ceo-review`.
Jedyny naprawdę brakujący skill w naszym arsenale.

**Deliverables:**
- `/srv/samba/openclaw/github_forks/gstack/openclaw/skills/gstack-openclaw-scope-review/SKILL.md` (nowy)
- `/srv/samba/openclaw/github_forks/gstack/openclaw/skills/gstack-openclaw-scope-review/agents/openai.yaml` (nowy)
- Aktualizacja `/home/openclaw/.openclaw/openclaw.json` (dodanie do odpowiednich agentów)
- Restart Gateway za zgodą Adama

**Czas:** 1 sesja, ~1-2h
**Zależności:** Etap 1 (format AUQ)
**Weryfikacja:** Smoke test skill + sub-agent audit READY-TO-ACTIVATE
**Ryzyko:** średnie (nowy skill + Gateway restart)

### Etap 3: code-review-and-quality enhancement

**Cel:** Dodać Verification Mode taxonomy + Scope Drift Detection z gstack `/review`
do naszego `code-review-and-quality`. Największy etap objętościowo.

**Deliverables:**
- Aktualizacja `/home/openclaw/.openclaw/workspace/skills/code-review-and-quality/SKILL.md`
- Nowa sekcja "Verification Modes" + "Scope Drift Detection Step 1.5"
- Restart Gateway za zgodą Adama

**Czas:** 1-2 sesje, ~3-4h
**Zależności:** Etap 1 (format AUQ dla decision briefs)
**Weryfikacja:** Smoke test + sub-agent audit READY-TO-ACTIVATE + diff review
**Ryzyko:** średnie (szeroko używany skill)

### Etap 4: continuous-checkpoint-mode

**Cel:** Nowy skill opakowujący Continuous Checkpoint Mode (WIP auto-commit
z blokiem [gstack-context]). Inwazyjne tylko gdy user włączy, domyślnie OFF.

**Deliverables:**
- `/home/openclaw/.openclaw/workspace/skills/continuous-checkpoint-mode/SKILL.md` (nowy)
- `/home/openclaw/.openclaw/workspace/skills/continuous-checkpoint-mode/agents/openai.yaml` (nowy)
- Konwencja pliku `~/.openclaw/workspace/.checkpoint-config.json` (mode + push flag)
- Aktualizacja openclaw.json

**Czas:** 0.5 sesji, ~1-2h
**Zależności:** brak (independent)
**Weryfikacja:** Smoke test + symulacja WIP commit + sub-agent audit
**Ryzyko:** niskie (nowy skill, domyślnie OFF)

### Etap 5: agents-gstack-section.md refinement

**Cel:** Zmapować nasze Format A skille do gstack tierów (SIMPLE/MEDIUM/HEAVY/FULL/PLAN)
w pliku dispatch logic w gstack/openclaw/.

**Deliverables:**
- Aktualizacja `/srv/samba/openclaw/github_forks/gstack/openclaw/agents-gstack-section.md`
- Sekcja "Format A skills → tier mapping"

**Czas:** 0.5 sesji, ~1h
**Zależności:** Etapy 2-4 (nowe skille muszą istnieć, żeby je zmapować)
**Weryfikacja:** Review z Adamem czy mapping ma sens
**Ryzyko:** niskie (docs only)

### Etap 6: Verification + smoke test (finalizacja)

**Cel:** Pełen audyt 6 etapów adopcji, smoke test wszystkich nowych/zmienionych skilli,
sub-agent READY-TO-ACTIVATE.

**Deliverables:**
- `/srv/samba/openclaw/github_forks/gstack/openclaw/ADOPTION_REPORT.md` (finalny raport)
- Aktualizacja `MEMORY.md` (kluczowe learnings + nowy stack)
- Commit + push na `wiecon/openclaw-adapt`

**Czas:** 0.5 sesji, ~1h
**Zależności:** Etapy 1-5
**Weryfikacja:** sub-agent audit, smoke test, Adam review
**Ryzyko:** niskie (audyt)

## 5. File locations

**GStack fork (git tracking):**
- Plany: `openclaw/ADOPTION_PLAN.md` (ten plik)
- Format specs: `openclaw/ASKUSERQUESTION_FORMAT.md`
- Nowe skille: `openclaw/skills/gstack-openclaw-*/SKILL.md`
- Dispatch logic: `openclaw/agents-gstack-section.md`

**Workspace (nasze skille):**
- Formatowane skille: `~/.openclaw/workspace/skills/<name>/SKILL.md`
- Config: `~/.openclaw/openclaw.json`

**Backup (reguła AGENTS.md):**
- `~/.openclaw/backups/<step-name>-<timestamp>/`

## 6. Risk management

**Reguły:**
- Backup przed każdą zmianą skilla (reguła AGENTS.md "Config-change rule")
- Per-Etap raport z sub-agent audit READY-TO-ACTIVATE
- Restart Gateway tylko za zgodą Adama (reguła MEMORY.md)
- Każdy nowy skill przechodzi Format A 12 nagłówków (reguła Etap 7)
- Nowe skille dodane do openclaw.json w transzach (max 4 edycje per restart)

**Kill criteria:**
- Jeśli Etap 1-2 fail → wracamy do rekonesansu
- Jeśli Etap 3 (code-review enhancement) powoduje regresję → revert + scope reduction
- Jeśli 3+ restarty Gateway bez postępu → pauza, rekonsultacja

## 7. Success criteria

**Adopcja udana jeśli:**
1. Wszystkie 6 etapów ukończone z sub-agent audit READY-TO-ACTIVATE
2. AUQ format używany w co najmniej 3 naszych skillach
3. Scope review skill użyty przez Adama co najmniej raz
4. Code review skill daje wymiernie lepsze wyniki (verification mode classification użyte)
5. Continuous checkpoint mode dostępny i przetestowany (off-by-default)
6. Dispatch logic w gstack spójny z naszym stackiem
7. Adam happy z trade-off (cena adopcji vs wartość)

## 8. Tracking

- Ten plik aktualizowany po każdym etapie
- Per-etap raporty: `openclaw/ETAP<N>-RAPORT.md`
- Daily notes w `~/.openclaw/workspace/memory/YYYY-MM-DD.md`

## 9. Historia zmian

- 2026-06-28 — Plan utworzony, Etap 1 in progress