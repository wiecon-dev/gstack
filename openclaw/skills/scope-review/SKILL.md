---
name: "scope-review"
description: "Użyj gdy Adam prosi o review planu, podważenie propozycji, scope check, albo decyzję expand/reduce. Adaptacja gstack /plan-ceo-review z 4 trybami: EXPANSION/SELECTIVE/HOLD/REDUCTION."
---

# Scope Plan Review (gstack → OpenClaw)

## Origin

- **Source pinned:** gstack v1.58.5.0 commit `11de390` (MIT), `/plan-ceo-review` skill.
- **OpenClaw adaptation:** ręczna adaptacja 2026-06-28 w ramach Etapu 2 adopcji gstack.
- **Inspiracja:** `gstack/SKILL.md` filozofia 4 trybów scope review (Garry Tan / YC).
- **Typ:** instruction-only rigid skill (HARD GATE: user 100% w kontroli).

Nie kopiuj globalnych skryptów gstack (`bin/gstack-decision-log` itp.) — używamy naszego `MEMORY.md` i `memory_add`.

## Description

Scope Plan Review to filozofia review, w której agent występuje w **jednym z 4 trybów** zależnie od potrzeby Adama. Cel: zrobić plan extraordinary, wychwycić każdą minę zanim wybuchnie, zapewnić że shipped = shipped na najwyższym standardzie.

**HARD GATE:** Nigdy nie modyfikuj scope'a bez explicit zgody Adama. Każda zmiana = opt-in.

## When to Use

- Adam prosi o review planu lub propozycji.
- Adam mówi "podważ to", "poke holes", "znajdź 10x better version".
- Adam pyta "czy rozszerzyć czy zawęzić scope".
- Decyzja architektoniczna z potencjałem scope creep.
- Nowy feature/product przed implementacją.

## When NOT to Use

- Gdy chcesz weryfikacji implementacji (diff review) → `code-review-and-quality`.
- Gdy pytanie dotyczy root cause bug → `debug-toolkit` / `systematic-debugging`.
- Gdy pytanie dotyczy stacku/toolingu → `architecture-review`.
- Gdy decyzja jest trywialna (1-2 opcje, niski impact).

## Inputs

- **Plan lub propozycja** do review (tekst, dokument, plan file).
- **Kontekst** (projekt, branch, deadline, zespół).
- **Wskazówka Adama** o trybie (opcjonalna — jeśli brak, wybierz na podstawie sygnałów).

## Outputs

- **Ocena w jednym z 4 trybów** (poniżej).
- **Per-opcja scope changes** przedstawione indywidualnie z opt-in/out.
- **Decyzja** zapisana w `memory_add` jeśli durable.
- **Rekomendacja** z uzasadnieniem.

## Workflow / Process

### Step 1: Gather inputs

1. **Odczytaj plan / propozycję** — użyj `read` lub zaczerpnij z conversation context.
2. **Odczytaj kontekst** — projekt, branch, deadline, zespół, priorytety.
3. **Sprawdź sygnał trybu od Adama** — słowo-klucz (np. "zróbmy minimalnie" → REDUCTION).

### Step 2: Pick mode

Wybierz jeden z 4 trybów. **Nie jest to deterministyczny algorytm** — to heurystyka. Gdy sygnały są niejasne, **zapytaj Adama** który tryb chce.

| Sygnał | Domyślny tryb | Pytanie do Adama |
|---|---|---|
| "10-star", "10x better", brak deadline | EXPANSION | "Czy tryb EXPANSION — szukać idealnej wersji?" |
| Plan solidny, ale chcemy options | SELECTIVE | "Czy SELECTIVE — przedstawić expansion options do cherry-pick?" |
| "Scope OK", focus na jakość | HOLD | "Czy HOLD — robić plan bulletproof bez zmian scope?" |
| "Minimalnie", deadline, validation | REDUCTION | "Czy REDUCTION — wyciąć do MVP?" |
| Brak sygnału / niejasny | — | "Który tryb scope review: EXPANSION / SELECTIVE / HOLD / REDUCTION?" |

### Tryb 1: SCOPE EXPANSION

**Postawa:** Wizualizujesz platonic ideal. Pchasz scope W GÓRĘ.

- Pytaj "what would make this 10x better for 2x the effort?"
- Dla każdej expansion idei: przedstaw indywidualnie, Adam opt-in/out.
- Cel: katedra, nie bungalow.

### Tryb 2: SELECTIVE EXPANSION

**Postawa:** Rigorous reviewer z taste. Trzymasz obecny scope jako baseline, robisz go bulletproof. Osobno, surface'ujesz każdą expansion opportunity.

- Dla każdej expansion idei: przedstaw indywidualnie z osobną decyzją.
- Adam cherry-pick'uje to co chce.

### Tryb 3: HOLD SCOPE

**Postawa:** Plan's scope jest zaakceptowany. Twoja robota to zrobić go bulletproof.

- Catch every failure mode, test every edge case, ensure observability, map every error path.
- **NIE** dodawaj scope'a cicho. **NIE** zmniejszaj scope'a cicho.
- Pytaj gdy widzisz gap (ale tylko jeśli wymaga scope change).

### Tryb 4: SCOPE REDUCTION

**Postawa:** Znajdź minimum viable version który daje core outcome. Wytnij resztę. Bądź bezwzględny.

- MVP cut bezwzględnie.
- Dla każdej ciętej rzeczy: uzasadnij dlaczego to nie core.

### Step 3: Present expansion options (per-expansion)

Gdy tryb wymaga expansion options, dla każdej idei emituj pytanie w formacie:

```
Opcja <N> — Include <idea-name>?
Kontekst: <project/branch>, obecny scope: <baseline summary>
ELI10: <2-4 zdania, plain English, name the stakes>
Stakes: <co się psuje jeśli include lub exclude>
Recommendation: <Include|Defer|Cut> because <reason>
Note: opcje różnią się rodzajem (Include/Defer/Cut/Hold), nie zakresem
A) Include (recommended)
  ✅ <pro>
  ❌ <con>
B) Defer ...
Net: <one-line synthesis>
```

Pełny format: `ASKUSERQUESTION_FORMAT.md` w fork gstack (lub rekonstruuj z sekcji Format w tym skillu).

### Step 4: Record durable decisions

- Każda scope change = `memory_add` (kategoria `decision`, język polski).
- Każdy opt-in/out = notka w daily memory jeśli tymczasowy.

### Step 5: Hand off

- EXPANSION/SELECTIVE approvals → `code-review-and-quality` (Scope Drift Detection w trakcie implementacji).
- HOLD review findings → `verification-before-completion-openclaw` do weryfikacji na końcu.
- REDUCTION cuts → `finishing-a-development-branch` do squash/cleanup.

1. **Adam jest 100% w kontroli.** Każda scope change jest explicit opt-in. Nigdy cicho add/remove.
2. **Per-expansion opt-in.** Nigdy bundle multiple expansions w jedną decyzję.
3. **Honest trade-offs.** Każda opcja ma uczciwe ✅ i ❌ (≥40 chars).
4. **Completeness scores dla coverage różnic** (10/7/3). Kind-note gdy options różnią się rodzajem.
5. **Hard-stop dla destructive.** Jeśli scope reduction obejmuje już shipped functionality → STOP, zapytaj Adama.

## OpenClaw Adaptation

- **Channel:** plain text message (Discord/Telegram), nie tool call.
- **Numbering:** `Opcja N` (spójne z MEMORY.md regułą numeracji opcji Adama).
- **Memory:** durable scope decisions zapisuj przez `memory_add` (kategoria `decision`).
- **Pairs with:**
  - `verification-before-completion-openclaw` — po scope decision, verification wymaga świeżego dowodu że scope jest realizowany.
  - `code-review-and-quality` — po expansion approval, diff review sprawdza czy scope został zachowany (Scope Drift Detection).

## Compatibility

- **OpenClaw runtime:** skill dostępny w agentach: `main`, `techleader-developer-reviewer`, `agent-orchestrator`.
- **Format A headers:** zgodny z 12 standardowymi nagłówkami.
- **Pin:** gstack v1.58.5.0 commit `11de390` (MIT).
- **Polska treść:** zachowana zgodnie z Adam preferencją dla durable facts.

## Tools / Commands

- `memory_add` — zapisz durable scope decisions (kategoria `decision`).
- `memory_search` — sprawdź poprzednie scope decisions / standing rules.
- `read` / `grep` — odczytaj plan file / conversation context.
- `sessions_spawn` (opcjonalnie) — izolowany sub-agent do adversarial review (`doubt-driven-development`).

## Constraints

1. **Adam jest 100% w kontroli.** Każda scope change jest explicit opt-in. Nigdy cicho add/remove.
2. **Per-expansion opt-in.** Nigdy bundle multiple expansions w jedną decyzję.
3. **Honest trade-offs.** Każda opcja ma uczciwe ✅ i ❌ (≥40 chars).
4. **Completeness scores dla coverage różnic** (10/7/3). Kind-note gdy options różnią się rodzajem.
5. **Hard-stop dla destructive.** Jeśli scope reduction obejmuje już shipped functionality → STOP, zapytaj Adama.
6. **Dokumentuj decisions.** Każdy durable scope decision = `memory_add` (kategoria `decision`, polskie słowa).

## Failure Modes

| Failure | Przyczyna | Mitigacja |
|---|---|---|
| Bundle expansions w jedną decyzję | Lenistwo | Per-expansion opt-in (Constraint 2) |
| Silent scope reduction | "To oczywiste" | HOLD/REDUCTION mode wymaga explicit approval |
| Brak uczciwych ❌ | Confirmation bias | Constraint 3 (≥40 chars per bullet) |
| Wrong mode pick | Błędna interpretacja sygnałów | Heurystyka w Step 2 — gdy niejasne, pytaj Adama |
| Expansion bez trade-off | "To zawsze dobre" | Każda expansion ma con (czas, scope creep, complexity) |
| Skip review dla "małych" zmian | Bias do scope | Even small changes merit review if architecturally relevant |
| Over-reliance na pseudo-code | Model traktuje heurystykę jako deterministyczną regułę | Step 2 jawnie mówi "zapytaj Adama" dla niejasnych sygnałów |

## Security Audit

- **Source provenance:** gstack v1.58.5.0 commit `11de390` (MIT) — otwarte źródło.
- **OpenClaw adaptation:** ręczna adaptacja 2026-06-28 (Etap 2 adopcji).
- **Brak skryptów/hooków/binarek:** skill jest instruction-only.
- **Brak sekretów/credentials.**
- **Activation policy:** `agents/openai.yaml` z `policy.allow_implicit_invocation: false` (explicit invocation only — scope review nie powinien triggerować się automatycznie).
- **Safety contract:** Adam 100% in control, no silent changes, hard-stop dla destructive.
- **Reversible:** backup w `/srv/samba/openclaw/github_forks/gstack/openclaw/skills/gstack-openclaw-scope-review/` git history.
- **Audit class:** PASS.
