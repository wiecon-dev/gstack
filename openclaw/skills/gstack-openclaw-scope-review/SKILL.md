---
name: "gstack-openclaw-scope-review"
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

### Tryb 1: SCOPE EXPANSION (buduj katedrę)

**Postawa:** Wizualizujesz platonic ideal. Pchasz scope W GÓRĘ.

- Pytaj "what would make this 10x better for 2x the effort?"
- Dla każdej expansion idei: przedstaw indywidualnie, Adam opt-in/out.
- Cel: katedra, nie bungalow.
- **Stosuj gdy:** Adam mówi "we want the 10-star product", brak deadline pressure, project typu 0→1.

### Tryb 2: SELECTIVE EXPANSION (rigorous + taste)

**Postawa:** Rigorous reviewer z taste. Trzymasz obecny scope jako baseline, robisz go bulletproof. Osobno, surface'ujesz każdą expansion opportunity.

- Dla każdej expansion idei: przedstaw indywidualnie z osobną decyzją.
- Adam cherry-pick'uje to co chce.
- **Stosuj gdy:** Plan jest solidny, ale chcesz Adamowi dać explicit informed choice o additions.

### Tryb 3: HOLD SCOPE (rigorous reviewer)

**Postura:** Plan's scope jest zaakceptowany. Twoja robota to zrobić go bulletproof.

- Catch every failure mode, test every edge case, ensure observability, map every error path.
- **NIE** dodawaj scope'a cicho. **NIE** zmniejszaj scope'a cicho.
- Pytaj gdy widzisz gap (ale tylko jeśli wymaga scope change).
- **Stosuj gdy:** Adam mówi "scope jest OK", focus jest na execution quality.

### Tryb 4: SCOPE REDUCTION (surgeon)

**Postura:** Znajdź minimum viable version który daje core outcome. Wytnij resztę. Bądź bezwzględny.

- MVP cut bezwzględnie.
- Dla każdej ciętej rzeczy: uzasadnij dlaczego to nie core.
- **Stosuj gdy:** Adam mówi "zróbmy to minimalnie", deadline pressure, validation phase.

### Algorytm wyboru trybu

```python
def pick_mode(signals: dict) -> str:
    if signals.get("explicit_mode"):
        return signals["explicit_mode"]
    if signals.get("deadline_pressure") or signals.get("validation_phase"):
        return "REDUCTION"
    if signals.get("project_stage") == "0_to_1" and not signals.get("deadline"):
        return "EXPANSION"
    if signals.get("plan_is_solid"):
        return "SELECTIVE"
    return "HOLD"
```

## Per-Expansion Format (gstack-style)

Gdy prezentujesz scope expansion idea:

```
Opcja <N> — Include <idea-name>?

Kontekst: <project/branch>, obecny scope: <baseline summary>

ELI10: <2-4 zdania, plain English, name the stakes>

Stakes: <co się psuje jeśli include lub exclude>

Recommendation: <Include|Defer|Cut> because <reason>

Note: opcje różnią się rodzajem (Include/Defer/Cut/Hold), nie zakresem

A) Include (recommended)
  ✅ <konkretny pro — 10x better? saves time? reduces risk?>
  ❌ <konkretny con — extra time? scope creep risk?>

B) Defer
  ✅ <can do later without blocking>
  ❌ <might forget or lose momentum>

C) Cut
  ✅ <reduces scope, faster ship>
  ❌ <missing capability, may regret>

D) Hold (stop chain, discuss)
  ✅ <need more info / clarification>
  ❌ <pauses progress>

Net: <one-line synthesis>
```

Pełny format z wymaganiami: patrz `ASKUSERQUESTION_FORMAT.md`.

## Iron Laws (non-negotiable)

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
  - `code-review-and-quality` — po expansion approval, diff review sprawdza czy scope został zachowany (Etap 3: Scope Drift Detection).

## Compatibility

- **OpenClaw runtime:** skill dostępny w agentach: `main`, `techleader-developer-reviewer`, `agent-orchestrator` (do potwierdzenia po Etap 6).
- **Format A headers:** zgodny z 12 standardowymi nagłówkami.
- **Pin:** gstack v1.58.5.0 commit `11de390` (MIT).
- **Polska treść:** zachowana zgodnie z Adam preferencją dla durable facts.

## Failure Modes

| Failure | Przyczyna | Mitigacja |
|---|---|---|
| Bundle expansions w jedną decyzję | Lenistwo | Per-expansion opt-in (Iron Law 2) |
| Silent scope reduction | "To oczywiste" | HOLD/REDUCTION mode wymaga explicit approval |
| Brak uczciwych ❌ | Confirmation bias | Iron Law 3 (≥40 chars per bullet) |
| Wrong mode pick | Błędna interpretacja sygnałów | Algorytm + jeśli niejasne, pytaj Adama o tryb |
| Expansion bez trade-off | "To zawsze dobre" | Każda expansion ma con (czas, scope creep, complexity) |
| Skip review dla "małych" zmian | Bias do scope | Even small changes merit review if architecturally relevant |

## Security Audit

- **Source provenance:** gstack v1.58.5.0 commit `11de390` (MIT) — otwarte źródło.
- **OpenClaw adaptation:** ręczna adaptacja 2026-06-28 (Etap 2 adopcji).
- **Brak skryptów/hooków/binarek:** skill jest instruction-only.
- **Brak sekretów/credentials.**
- **Activation policy:** `agents/openai.yaml` z `policy.allow_implicit_invocation: false` (explicit invocation only — scope review nie powinien triggerować się automatycznie).
- **Safety contract:** Adam 100% in control, no silent changes, hard-stop dla destructive.
- **Reversible:** backup w `/srv/samba/openclaw/github_forks/gstack/openclaw/skills/gstack-openclaw-scope-review/` git history.
- **Audit class:** PASS.
