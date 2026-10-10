# Design

## Context

Zobacz `proposal.md` — Why. Repo ma już częściową observability: `session-runner.ts` zapisuje heartbeat dopiero przy `tool_use`, log postępu i surowe NDJSON, a `EvalCollector.addTest()` nadpisuje wspólny `_partial-e2e.json`. `eval:watch` odczytuje jeden globalny heartbeat i jeden partial. Te mechanizmy pomagają w pojedynczym teście, lecz nie tworzą lifecycle START/END i nie są bezpiecznym źródłem prawdy dla wielu równoległych collectorów.

Zmiana dotyczy globalnych touchfiles zestawu evali, musi działać w Bun 1.3.10 na macOS i Linux oraz nie może uzależniać poprawności testu od pomocniczego zapisu diagnostycznego. Nie dotyka generatorów skilli ani plików `SKILL.md`.

## Goals / Non-Goals

**Goals:**

- Jednoznacznie połączyć START i END każdej próby testu.
- Zachować zakończone wyniki po SIGTERM, timeout albo awarii późniejszego testu.
- Usunąć kolizje wspólnych plików partial i pojedynczego heartbeat jako źródła prawdy.
- Zachować kompatybilność końcowych plików eval i bieżących komend.
- Zapewnić deterministyczne testy bez wywołań płatnych modeli.

**Non-Goals:**

- Wznawianie procesu modelu lub automatyczne ponawianie niedokończonych prób.
- Zdalne przesyłanie, synchronizacja lub retencja artefaktów.
- Zmiana algorytmu PASS/FAIL, retry lub selekcji testów.
- Usunięcie istniejących NDJSON, heartbeat i logów narzędzi w pierwszej iteracji.

## Decisions

### 1. Append-only journal per run jako źródło lifecycle

Powstanie mały moduł observability współdzielony przez runner i collector. Będzie zapisywał rekordy JSONL do katalogu bieżącego runu, po jednym kompletnym rekordzie w pojedynczym wywołaniu append. Każda próba otrzyma `run_id` i unikalny `attempt_id`; START zostanie zapisany przed spawnem modelu, a END podczas rejestracji wyniku.

Wybrano JSONL zamiast jednego aktualizowanego JSON, ponieważ append zachowuje wcześniejsze rekordy po przerwaniu procesu i nie wymaga sekwencji read-modify-write. Alternatywa — rozszerzenie jednego `e2e-live.json` — nadal traciłaby równoległe testy i wymagałaby blokad.

### 2. Identyfikator próby przechodzi przez wynik runnera

`runSkillTest()` utworzy `attempt_id`, zapisze START i zwróci identyfikator w `SkillTestResult`. `recordE2E()`/`EvalCollector.addTest()` użyje go do END oraz trwałego wyniku. END będzie idempotentny w obrębie collectora, aby retry lub przypadkowe podwójne wywołanie nie tworzyło dwóch końców tej samej próby.

Alternatywa — korelacja tylko po nazwie testu — została odrzucona, bo retry i równoległe uruchomienia mogą mieć tę samą nazwę.

### 3. Partial jest izolowany per run i collector

Zamiast wspólnego `_partial-e2e.json` każdy collector zapisze atomowy snapshot do unikalnej ścieżki partial wyprowadzonej z `run_id` oraz `collector_id`. Plik tymczasowy również będzie unikalny dla docelowego snapshotu. Sfinalizowany wynik zachowa obecny schemat i nazwę; partial zachowa `_partial: true`.

`eval:compare`, `eval:list` i `eval:summary` będą nadal pomijały partial. `eval:watch` odkryje wszystkie snapshoty aktywnego lub ostatniego niesfinalizowanego runu i złączy widok po `attempt_id`.

Alternatywa — mutex wokół jednego partial — zwiększa złożoność między procesami i pozostawia jeden plik jako punkt kolizji.

### 4. stderr jest kanałem natychmiastowym, a JSONL kanałem trwałym

Ta sama funkcja lifecycle utworzy zwięzłą linię START/END na stderr i rekord JSONL. START nie czeka na pierwszy `tool_use`; END zawiera PASS/FAIL i znormalizowaną przyczynę. Szczegółowe prompty, output i transkrypty pozostają wyłącznie w dotychczasowych, kontrolowanych artefaktach.

Alternatywa — poleganie na reporterze Bun — została odrzucona, ponieważ buforuje wyniki dużych plików przy `--concurrent`.

### 5. Istniejący heartbeat zostaje warstwą kompatybilności

W pierwszej iteracji `e2e-live.json`, `progress.log` i per-test NDJSON pozostają. Watcher preferuje journal oraz partial, a stary heartbeat wykorzystuje tylko jako fallback dla runów rozpoczętych przez starszy kod. Dzięki temu rollback nie wymaga migracji lokalnych danych.

### 6. Testy przez publiczne zachowanie plików

Najpierw powstaną testy w katalogu tymczasowym dla: START/END, idempotencji END, dwóch równoległych appendów, dwóch collectorów, przerwanego runu, filtrowania partial i renderowania watchera. Testy nie uruchamiają Claude ani płatnych evali. Po GREEN integracja runnera zostanie sprawdzona targetowanymi testami, a szeroki eval zostanie uruchomiony dopiero po darmowym baseline i osobnej kontroli kosztu.

## Risks / Trade-offs

- [Append do jednego journalu może zachować uszkodzoną ostatnią linię po twardym killu] → parser ignoruje wyłącznie niekompletną końcową linię i zachowuje wszystkie wcześniejsze rekordy; test obejmuje ten przypadek.
- [Duplikaty przy retry lub podwójnym callbacku] → stabilny `attempt_id` i idempotencja END w collectorze; watcher deduplikuje po identyfikatorze.
- [Wzrost liczby lokalnych plików partial] → pliki są małe i lokalne; retencja/cleanup nie wchodzi w ten change, aby nie dodawać destrukcyjnej automatyki.
- [Modyfikacja global touchfiles uruchamia szeroki zestaw evali] → najpierw szybkie testy jednostkowe i darmowy baseline; płatny diff-selected run dopiero po jawnej zgodzie na koszt.
- [Best-effort I/O może ukryć awarię observability] → stderr emituje pojedyncze ostrzeżenie z bezpieczną ścieżką i kodem błędu, ale wynik właściwego testu pozostaje niezmieniony.
- [Stary heartbeat i nowe źródło mogą chwilowo się różnić] → journal ma pierwszeństwo, heartbeat jest wyłącznie fallbackiem i jest oznaczony w testach kompatybilności.

## Migration Plan

1. Dodać RED testy formatu journalu, współbieżnych zapisów i partial per collector.
2. Dodać moduł lifecycle oraz propagację `attempt_id`; przejść do GREEN bez zmiany watchera.
3. Przenieść partial na izolowane snapshoty i zabezpieczyć konsumentów przed wyborem partial jako baseline.
4. Przełączyć `eval:watch` na journal + snapshoty z fallbackiem do starego heartbeat.
5. Uruchomić targetowane testy, `git diff --check`, strict OpenSpec validation i darmowy baseline repo.
6. Po osobnej zgodzie uruchomić wymagany diff-selected eval, zebrać dowody i dopiero wtedy zaktualizować `TODOS.md`.

Rollback: odwrócić commit implementacyjny. Stare końcowe wyniki pozostają bez zmian, a nowe journal/partial są ignorowane przez starszy kod. Nie usuwać automatycznie lokalnych artefaktów podczas rollbacku.

## Monitoring

- `bun run eval:watch` pokazuje liczbę prób aktywnych, zakończonych i stale oraz wiek ostatniego sygnału.
- Test integracyjny potwierdza, że przerwany run pozostawia czytelny START i zakończone wyniki partial.
- Po pierwszym realnym runie porównać liczbę START, END i zapisanych wyników; `END <= START`, a po poprawnej finalizacji wartości powinny być równe.

## Open Questions

Brak pytań blokujących artefakty lub podział pracy. Polityka długoterminowej retencji lokalnych journali może zostać zaplanowana osobno po danych z pilota.
