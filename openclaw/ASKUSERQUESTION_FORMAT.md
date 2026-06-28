# AskUserQuestion Format — OpenClaw Adaptation

> Kanoniczny specyfikacja formatu pytań decyzyjnych dla skilli OpenClaw.
> Adaptacja gstack AskUserQuestion Format v1.0 z 2026-06-28.

## 1. Cel

Standaryzować jak nasze skille zadają pytania decyzyjne Adamowi.
Cel: zero ambiguity, jednoznaczna rekomendacja, transparentny trade-off.

## 2. Kiedy używać

**Używaj tego formatu gdy:**
- Skill musi zapytać Adama o wybór między ≥2 opcjami
- Decyzja ma trade-off (nie trywialne tak/nie)
- Skill chce zarekomendować konkretną opcję
- Skill musi uzasadnić rekomendację

**NIE używaj gdy:**
- Trywialne tak/nie (np. "kontynuować?")
- Jednoznaczna instrukcja do wykonania
- Prośba o informację zwrotną bez wariantów
- Decyzja wewnętrzna (skill sam decyduje)

## 3. Format (OpenClaw wersja)

```
Opcja <N> — <one-line question title>
Kontekst: <1 short grounding sentence — repo, branch, task>

ELI10: <plain English a 16-year-old could follow, 2-4 sentences, name the stakes>

Stakes if we pick wrong: <one sentence — what breaks, what user sees, what's lost>

Recommendation: <opcja> because <one-line reason>

Completeness: A=X/10, B=Y/10, C=Z/10   (10=complete, 7=happy path, 3=shortcut)
(lub: "Note: opcje różnią się rodzajem, nie zakresem — brak oceny completeness")

Pros / cons:

A) <etykieta opcji> (recommended)
  ✅ <pro — konkretny, obserwowalny, ≥40 znaków>
  ❌ <con — uczciwy, ≥40 znaków>

B) <etykieta opcji>
  ✅ <pro>
  ❌ <con>

Net: <one-line synthesis — co faktycznie trade-offujemy>
```

## 4. Wymagania (self-check przed emisją)

Przed wysłaniem pytania decyzyjnego, sprawdź:

- [ ] **Opcja <N>** header present (numeracja: pierwsze pytanie w sesji = Opcja 1, inkrementuj)
- [ ] **Kontekst** present (repo / branch / task grounding)
- [ ] **ELI10** paragraph present (2-4 zdania, zwykłym językiem, name the stakes)
- [ ] **Stakes** line present (co się psuje przy złym wyborze)
- [ ] **Recommendation** line present with concrete reason
- [ ] **Completeness** scored (coverage) OR kind-note present
- [ ] Każda opcja ma ≥2 ✅ i ≥1 ❌, każdy ≥40 znaków
- [ ] **(recommended)** label on exactly one opcja (AUTO_DECIDE zależy od tego)
- [ ] Dual-scale effort labels for effort-bearing opcje (`(human: ~2 days / CC: ~15 min)`)
- [ ] **Net** line closes the decision

## 5. Warianty

### 5.1 5+ opcji — split chain (NIGDY nie dropuj)

Gdy masz 5+ realnych opcji, **NIGDY** nie dropuj, merge, ani nie odkładaj cicho.

Pick compliant shape:
- **Batch w grupy ≤4** — dla coherent alternatives (np. version bumps)
- **Split per-opcja** — dla independent scope items. Default.

Split per-opcja shape:
```
Opcja <N>.k — Include <item-name>?
ELI10: <plain English>
Stakes: <one sentence>
Recommendation: Include because <reason>
Note: opcje różnią się rodzajem (Include/Defer/Cut/Hold), nie zakresem

A) Include
B) Defer
C) Cut
D) Hold (stop chain, discuss)
```

Dla N>6: emituj najpierw `Opcja <N>.0` meta-pytanie (proceed/narrow/batch).

### 5.2 Hard-stop (one-way / destructive decisions)

Gdy decyzja jest jednokierunkowa (nieodwracalna / destrukcyjna — delete, force-push,
drop, overwrite):

- Wymagaj explicit potwierdzenia (dokładna litera opcji lub słowo)
- Stwierdź wyraźnie co jest nieodwracalne
- **NIGDY** nie proguj na vague/partial/ambiguous reply — re-ask
- Cisza lub "ok"/"sure" bez explicit wyboru = NOT YET CONFIRMED
- Escape: `✅ No cons — this is a hard-stop choice`

### 5.3 Decision Brief (gdy narzędzie AskUserQuestion jest niedostępne)

Gdyby kiedyś OpenClaw miał tryb prose-only (np. niektóre agenty / spawned sessions),
użyj **prose fallback** zamiast tool call. Ten sam content, inna struktura
(akapity, nie bullets):

```
Opcja <N> — <one-line question title>
Kontekst: ...
ELI10: ...
Recommendation: <opcja> because <reason>

A) <etykieta> (recommended)
   <Completeness: X/10>
   <2-4 sentences reasoning>

B) <etykieta>
   <Completeness: Y/10>
   <2-4 sentences reasoning>

Net: <one-line synthesis>

(Odpowiedz literą A/B/C/D)
```

## 6. Różnice vs gstack oryginał

| Element | GStack | OpenClaw adaptacja |
|---|---|---|
| Numbering | `D<N>` | `Opcja <N>` (spójne z naszą regułą numeracji opcji Adama) |
| Tool | AskUserQuestion (Claude Code native) | Plain text message (Adam-facing przez Discord/Telegram) |
| Channel | Tool use in skill context | Wiadomość tekstowa do Adama |
| Persona | Garry-shaped product judgment | Robbo, spójnie z SOUL.md (ciepły, konkretny, decyzyjny) |
| Recommended label parsing | PreToolUse hook parsuje | Adam czyta i decyduje (no automation) |
| Telemetry | Auto-logged | Opcjonalnie do MEMORY.md (przez `memory_add`) |

**Zachowane 1:1:**
- ELI10 plain English principle
- Completeness X/10 scoring (10/7/3)
- Pros/cons ≥40 chars
- (recommended) on exactly one option
- Stakes line
- Recommendation line with reason
- Net line
- 5+ options as split chain
- Hard-stop escape for destructive

## 7. Przykład (real case)

```
Opcja 3 — Który skill rozszerzyć o Verification Mode taxonomy?

Kontekst: Projekt gstack→OpenClaw adopcja, Etap 3, branch `wiecon/openclaw-adapt`.

ELI10: Verification Mode taxonomy to klasyfikacja "co można zweryfikować
z tego diff-a" (DIFF-VERIFIABLE/CROSS-REPO/EXTERNAL-STATE/CONTENT-SHAPE).
Dodanie tego do naszego code review skilla pozwala systematycznie oznaczać
które claimy można sprawdzić automatycznie, a które wymagają manual check.
3 kandydatów: code-review-and-quality (PR review), code-reviewer (alt impl),
verification-before-completion-openclaw (już mamy).

Stakes: Zły wybór = marnujemy 3-4h na przepisanie skilla który nie jest
codziennie używany albo który już ma podobne mechanizmy.

Recommendation: code-review-and-quality — bo to szeroko używany skill
(multi-tier review, integration z PR flow) i weryfikacja diff to jego core use case.

Completeness: A=9/10, B=7/10, C=8/10

Pros / cons:

A) code-review-and-quality (recommended)
  ✅ Najszerzej używany code review skill w naszym stacku, daily use
  ✅ Diff verification to jego naturalny use case, nie nowy feature
  ❌ Duży skill (~12 KB), zmiana wymaga ostrożności i audytu

B) code-reviewer
  ✅ Lżejszy skill, łatwiejszy do modyfikacji
  ❌ Mniej używany (overlap z A) — mniejszy impact

C) verification-before-completion-openclaw
  ✅ Już ma klasyfikację "evidence types" (matryca dowodów)
  ❌ Scope inny: completion verification, nie PR diff review

Net: Maksymalny impact za cenę średniego ryzyka. code-reviewer to podobny
mechanizm co A więc redundantny, vbc już ma swoją matrycę.
```

## 8. Integracja z istniejącymi regułami

**Spójność z MEMORY.md:**
- Reguła "Opcja 1, Opcja 2, Opcja 3" dla pytań do Adama → ten format ją rozszerza
  o wymaganą strukturę (ELI10, Completeness, Pros/Cons)
- Reguła "Przy diagnozie problemu: opisać problem i zadać 1-2 pytania doprecyzowujące"
  → użyj tego formatu dla tych pytań

**Spójność z SOUL.md:**
- "Miej opinie" → (recommended) z konkretnym powodem
- "Konkret i decyzje" → Net line + Recommendation
- "Ciepły, pomocny, konkretny" → ELI10 plain English

**Spójność z skillami Format A:**
- Verification-before-completion-openclaw: już ma "Macierz dowodów" → adoptuj Completeness
- Doubt-driven-development: ma "Brama STOP" → użyj hard-stop escape dla destructive

## 9. Wdrożenie (Etap 1)

- [x] Ten dokument utworzony
- [ ] Integracja przykładowa w `verification-before-completion-openclaw`
- [ ] Demo w ADOPTION_REPORT

## 10. Referencje

- GStack source: `gstack/SKILL.md` (top-level router), `gstack/spec/SKILL.md`
- GStack docs: `gstack/docs/askuserquestion-split.md`, `gstack/docs/askuserquestion-cjk.md`
- MEMORY.md: "Reguła numerowania opcji decyzyjnych"