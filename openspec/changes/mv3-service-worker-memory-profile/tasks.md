# Tasks

Implementacja startuje dopiero po jawnej akceptacji proposal, spec, design i tych tasków. Do tej akceptacji nie zmieniać kodu `browse/`.

## 1. Formatter listy workerów

- [ ] 1.1 **AFK — RED:** dodać testy tekstu i `--json` dla workera obecnego, workera poza `tabs`, listy ponad 10, pustej listy `(none)` oraz traktowania brakującego pola jak `[]`; zweryfikować oczekiwany FAIL komendą `bun test browse/test/memory-command.test.ts`.
- [ ] 1.2 **AFK — GREEN:** dodać pole `serviceWorkers` i sekcję `Service workers:` bez odczytu CDP; zweryfikować PASS tą samą komendą.
- [ ] 1.3 **AFK — REFACTOR:** ujednolicić sortowanie i ogon `...and N more` z istniejącym limitem kart, bez zmiany linii `Bun server:` i `Renderers:`; zweryfikować PASS `bun test browse/test/memory-command.test.ts`.

## 2. Mapowanie celów CDP

- [ ] 2.1 **AFK — RED:** dodać testy czystej funkcji mapującej stub listy celów: zostaje tylko service worker `chrome-extension://`, odpada dokument offscreen i worker strony, błąd metryk daje `null` oraz notatkę `service worker heap unavailable`, brak sesji daje pustą listę i `service worker targets unavailable`, a jeden błąd nie kasuje drugiego workera; zweryfikować oczekiwany FAIL komendą `bun test browse/test/memory-command.test.ts`.
- [ ] 2.2 **AFK — GREEN:** zaimplementować mapowanie na stubie, jeszcze bez podpinania żywego CDP; zweryfikować PASS tą samą komendą.
- [ ] 2.3 **AFK — REFACTOR:** podłączyć mapowanie w `getMemorySnapshot()` przez istniejącą sesję CDP przeglądarki, z `detach` w `finally`, bez `worker.evaluate` i bez ruszania notatki o braku RSS; zweryfikować PASS `bun test browse/test/memory-command.test.ts`.

## 3. Zamknięcie bez płatnych evali

- [ ] 3.1 **AFK:** uruchomić `bun test browse/test/memory-command.test.ts`, `git diff --check` i `scripts/openspec-safe.sh validate mv3-service-worker-memory-profile --strict`; zachować świeży wynik bez failures.
- [ ] 3.2 **AFK:** dopisać do `docs/openspec-pilot.md` krótki rekord zmiany 2 tylko ze świeżych faktów, w tym że płatne evale nie były potrzebne, bo zmiana nie tyka globalnych touchfiles; zweryfikować `git diff --check`.
- [ ] 3.3 **HITL:** pokazać Adamowi diff, wynik testu i status OpenSpec. Nie uruchamiać `EVALS=1`. Archiwizacja i commit wymagają osobnej zgody.
