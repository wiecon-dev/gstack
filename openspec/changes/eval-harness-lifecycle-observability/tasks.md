# Tasks

## 1. Lifecycle START/END i natychmiastowy stderr

- [ ] 1.1 **AFK — RED:** dodać testy publicznego kontraktu journalu dla START, END/PASS, END/FAIL, unikalnego `attempt_id`, dokładnie jednego END oraz braku END po przerwaniu; zweryfikować, że `bun test test/helpers/eval-lifecycle.test.ts` kończy się oczekiwanym FAIL przed implementacją.
- [ ] 1.2 **AFK — GREEN:** zaimplementować minimalny helper append-only JSONL i propagację `attempt_id` z `runSkillTest()` do wyniku/collectora; zweryfikować PASS komendą `bun test test/helpers/eval-lifecycle.test.ts` oraz sprawdzić, że rekordy nie zawierają promptu, outputu ani env.
- [ ] 1.3 **AFK — REFACTOR:** scentralizować formatowanie START/END na stderr i zapis journalu bez zmiany semantyki PASS/FAIL; zweryfikować `bun test test/helpers/eval-lifecycle.test.ts test/helpers/observability.test.ts` i ręcznie potwierdzić po jednej niebuforowanej linii START/END w teście z przechwyconym stderr.

## 2. Odporne na współbieżność wyniki partial

- [ ] 2.1 **AFK — RED:** dodać testy dwóch równoległych appendów, dwóch collectorów, unikalnych plików tymczasowych, integralnego JSON oraz zachowania wyników po symulowanym przerwaniu; zweryfikować oczekiwany FAIL komendą `bun test test/helpers/eval-store.test.ts test/helpers/eval-lifecycle.test.ts`.
- [ ] 2.2 **AFK — GREEN:** zastąpić wspólny `_partial-e2e.json` snapshotami izolowanymi przez `run_id` i `collector_id`, zachowując `_partial: true` oraz dotychczasowy format finalny; zweryfikować PASS komendą `bun test test/helpers/eval-store.test.ts test/helpers/observability.test.ts test/helpers/eval-lifecycle.test.ts`.
- [ ] 2.3 **AFK — REFACTOR:** ujednolicić odkrywanie partial i zagwarantować, że `eval:compare`, `eval:list` i `eval:summary` nie wybierają partial jako baseline; zweryfikować targetowanymi testami skryptów oraz fixtures zawierającymi jednocześnie plik finalny i co najmniej dwa partiale.

## 3. Wielotestowy widok `eval:watch`

- [ ] 3.1 **AFK — RED:** dodać scenariusze renderowania wielu aktywnych prób, zakończonego testu, stale START bez END, niekompletnej końcowej linii JSONL i partial bez aktywnego procesu; zweryfikować oczekiwany FAIL komendą `bun test test/helpers/observability.test.ts`.
- [ ] 3.2 **AFK — GREEN:** przełączyć `eval:watch` na journal + wszystkie snapshoty partial z fallbackiem do starego heartbeat; zweryfikować PASS komendą `bun test test/helpers/observability.test.ts` oraz snapshotem tekstowym pokazującym równolegle co najmniej dwa aktywne testy.
- [ ] 3.3 **AFK — REFACTOR:** ograniczyć duplikację parserów i opisać w `docs/openspec-pilot.md` nowe artefakty, semantykę stale oraz prywatność danych; zweryfikować testami z 3.2 i uruchomieniem `bun run eval:watch` na hermetycznym fixture bez aktywnych płatnych evali.

## 4. Integracja, baseline i zamknięcie zmiany

- [ ] 4.1 **AFK:** uruchomić `bun test test/helpers/eval-lifecycle.test.ts test/helpers/eval-store.test.ts test/helpers/observability.test.ts`, `git diff --check` i `scripts/openspec-safe.sh validate eval-harness-lifecycle-observability --strict`; zachować świeży output z zerową liczbą failures.
- [ ] 4.2 **AFK:** uruchomić darmowy baseline `bun test` oraz adekwatne `bun run skill:check`; sklasyfikować każdy failure względem znanych problemów środowiskowych i nie deklarować GREEN bez bezpośredniego dowodu.
- [ ] 4.3 **HITL:** przed płatnym diff-selected E2E przedstawić Adamowi liczbę wybranych testów, estymowany koszt/czas i poprosić o osobną zgodę; dowodem jest jawna akceptacja w bieżącym bezpiecznym wątku.
- [ ] 4.4 **AFK po 4.3:** uruchomić zatwierdzony diff-selected eval i potwierdzić zgodność liczby START/END/zapisanych wyników, zachowanie partial po kontrolowanym przerwaniu oraz brak regresji; dołączyć świeże ścieżki artefaktów i wynik komendy.
- [ ] 4.5 **AFK:** po pełnej weryfikacji oznaczyć wpis P1 w `TODOS.md` jako DONE z odnośnikiem do testów/dowodów oraz zaktualizować metryki pilota w `docs/openspec-pilot.md`; zweryfikować `git diff --check` i brak twierdzeń wykraczających poza zebrane dowody.
- [ ] 4.6 **HITL:** przed archiwizacją przedstawić Adamowi finalny diff, wyniki testów, status OpenSpec i metryki narzutu pilota; archiwizować dopiero po osobnej jawnej zgodzie.
