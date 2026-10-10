# Tasks

Implementacja startuje dopiero po jawnej akceptacji proposal, spec, design i tych tasków. Do tej akceptacji nie zmieniać kodu `browse/`.

## 1. Czyste przeliczenie RSS

- [ ] 1.1 **AFK — RED:** dodać testy czystej funkcji: `VmRSS` w kB staje się bajtami razy 1024, brak statusu daje `null` i notatkę `process RSS unavailable`, jeden brak nie kasuje drugiego procesu, typ `GPU` nie jest przepisywany, a brak jakiegokolwiek odczytu nie udaje zera; zweryfikować oczekiwany FAIL komendą `bun test browse/test/memory-command.test.ts`.
- [ ] 1.2 **AFK — GREEN:** zaimplementować tę funkcję na stubie czytnika statusu, jeszcze bez `/proc`; zweryfikować PASS tą samą komendą.
- [ ] 1.3 **AFK — REFACTOR:** podłączyć czytnik `/proc/<id>/status` w `getMemorySnapshot()`, tylko linia `VmRSS`, bez `ps`; zweryfikować PASS `bun test browse/test/memory-command.test.ts`.

## 2. Tekst i notatki

- [ ] 2.1 **AFK — RED:** dodać testy linii `Process RSS:`, sumy po surowym typie, `unmeasured`, braku pola VRAM w JSON oraz usunięcia notatki `Per-Chromium-process RSS not collected` po udanym odczycie; zweryfikować oczekiwany FAIL komendą `bun test browse/test/memory-command.test.ts`.
- [ ] 2.2 **AFK — GREEN:** dodać linię tekstu i notatkę, że liczba to Linux VmRSS, nie VRAM; nie zmieniać linii `Bun server:`; zweryfikować PASS tą samą komendą.
- [ ] 2.3 **AFK — REFACTOR:** upewnić się, że `processes: null` nadal drukuje `(unavailable — see notes)` i nie dostaje zerowego RSS; zweryfikować PASS `bun test browse/test/memory-command.test.ts`.

## 3. Zamknięcie bez płatnych evali

- [ ] 3.1 **AFK:** uruchomić `bun test browse/test/memory-command.test.ts`, `git diff --check` i `scripts/openspec-safe.sh validate native-gpu-memory-breakdown --strict`; zachować świeży wynik bez failures.
- [ ] 3.2 **AFK:** dopisać do `docs/openspec-pilot.md` krótki rekord tylko ze świeżych faktów. Nie uruchamiać `EVALS=1`.
- [ ] 3.3 **HITL:** pokazać Adamowi diff i wynik testu. Archiwizacja i commit wymagają osobnej zgody.
