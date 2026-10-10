# Proposal

## Why

Obecna warstwa observability zapisuje postęp dopiero po pierwszym wywołaniu narzędzia i wynik dopiero po zakończeniu testu. Przy równoległym `bun run test:evals` test może więc przez długi czas nie pozostawić jednoznacznego sygnału START/END, a współdzielone pliki heartbeat i partial mogą zostać nadpisane przez inny worker, przez co zdrowego procesu nie da się pewnie odróżnić od zawieszonego.

## What Changes

- Dodać append-only, maszynowo czytelny dziennik lifecycle z rekordem START i END dla każdego testu eval.
- Wypisywać START oraz końcowy PASS/FAIL bezpośrednio na stderr, niezależnie od buforowania raportera Bun.
- Zachować każdy zakończony wynik inkrementalnie w sposób odporny na współbieżne collectory i przerwanie procesu.
- Oznaczać dane częściowe tak, aby `eval:compare` i inne narzędzia nie traktowały ich jak kompletnego baseline'u.
- Rozszerzyć `eval:watch`, aby opierał stan na trwałych rekordach lifecycle i pokazywał wiele równoległych testów bez fałszywego zastępowania aktywnego testu.
- Zachować istniejące artefakty diagnostyczne: heartbeat, `progress.log`, surowe NDJSON i końcowy plik wyniku.
- Po potwierdzeniu zgodności usunąć nieaktualny wpis P1 z `TODOS.md` albo oznaczyć go jako DONE z dowodem.

## Capabilities

### New Capabilities

- `eval-harness-lifecycle-observability`: Kontrakt widoczności START/END, trwałych wyników częściowych, bezpiecznej współbieżności i prezentacji stanu długich uruchomień eval.

### Modified Capabilities

Brak — repo nie ma jeszcze głównych specyfikacji OpenSpec.

## Impact

- Kod: `test/helpers/session-runner.ts`, `test/helpers/eval-store.ts`, współdzielone helpery E2E i `scripts/eval-watch.ts`.
- Testy: targetowane testy jednostkowe observability/eval-store oraz testy współbieżności i odporności na przerwanie procesu.
- Dane lokalne: wyłącznie katalog projektu gstack pod `~/.gstack/projects/<slug>/`; bez treści promptów w logu lifecycle i bez nowych danych sieciowych.
- Kompatybilność: zachowanie CLI pozostaje addytywne dla Claude Code, Codex i OpenClaw; format końcowych plików eval pozostaje kompatybilny, a dane partial są jawnie oznaczone.
- Blast radius: helpery globalne są touchfiles dla całego zestawu evali, więc po implementacji wymagają szerokiego diff-selected run; darmowe testy muszą przejść wcześniej.
- Rollback: odwrócić commit zmiany; istniejące końcowe pliki wyników i stare komendy pozostają czytelne, a nowe lokalne artefakty obserwowalności można pozostawić jako diagnostyczne.

### Mierzalne kryteria sukcesu

- Każdy uruchomiony test tworzy rekord START przed uruchomieniem procesu modelu i dokładnie jeden rekord END po uzyskaniu wyniku.
- Po wymuszonym przerwaniu runu zachowane są wyniki wszystkich testów zakończonych przed przerwaniem.
- Dwa równoległe testy nie tracą ani nie nadpisują wzajemnych rekordów lifecycle lub wyników.
- `eval:watch` rozróżnia test aktywny, zakończony i potencjalnie stale bez polegania na samym `pgrep`.
- Targetowane testy oraz wymagany baseline przechodzą świeżo przed oznaczeniem zmiany jako ukończonej.

### Non-goals

- Wznawianie niedokończonego procesu modelu od ostatniego turnu.
- Zdalny dashboard, wysyłanie telemetrii lub synchronizacja artefaktów poza lokalną maszynę.
- Zmiana semantyki wyboru testów, retry, limitów współbieżności albo oceny PASS/FAIL.
- Przebudowa całego systemu przechowywania historycznych wyników eval.
