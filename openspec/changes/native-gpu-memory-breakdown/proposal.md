# Proposal

## Why

`$B memory` pokazuje RSS procesu Bun i stertę JS kart oraz workerów, ale nie pamięć procesów Chromium. `SystemInfo.getProcessInfo` zwraca tylko `type`, `id` i `cpuTime`. Notatka w snapshotcie mówi, że RSS nie jest zbierany. Incydent OOM dotyczył pamięci Chromium, której ta diagnostyka nie widzi. Żywy odczyt na Chrome for Testing 149, Linux, 2026-10-10, pokazał, że `id` jest PID-em systemu i `/proc/<id>/status` ma `VmRSS` także dla procesu o typie `GPU`. CDP nie zwraca pamięci karty graficznej.

## What Changes

- Dodać do każdego wpisu `processes` pole `rss`: liczba bajtów albo `null`.
- Brać bajty z linii `VmRSS` w `/proc/<id>/status`, przeliczone z kB razy 1024. Nie uruchamiać `ps` i nie czytać `cmdline`, `environ` ani map.
- Gdy plik statusu dla danego `id` nie istnieje albo nie ma `VmRSS`, zostawić ten proces z `rss: null` i jedną notatką. Pozostałe procesy mierzyć dalej. Nie rzucać wyjątku z całego polecenia.
- Gdy uda się odczytać choć jeden RSS, usunąć dotychczasową notatkę, że RSS procesów w ogóle nie jest zbierany.
- W tekście dodać linię `Process RSS:` z sumą bajtów według surowego `type`. Typ `GPU` zostaje zapisany tak, jak zwraca go CDP.
- Dodać stałą notatkę, że jest to RSS procesu Linux, nie VRAM i nie odczyt z Activity Monitor.
- Nie dodawać pola VRAM. `SystemInfo.getInfo` opisuje urządzenie GPU, nie jego pamięć.

## Capabilities

### New Capabilities

- `native-gpu-memory-breakdown`: RSS procesów Chromium w `$B memory` i `GET /memory`, z osobnym rozpoznaniem procesu `GPU`.

### Modified Capabilities

Brak. Zmiany 1 i 2 zostają osobnymi deltami.

## Impact

- Kod, po akceptacji: `browse/src/memory-snapshot.ts`, `browse/src/memory-command.ts`, `browse/src/browser-manager.ts` oraz `browse/test/memory-command.test.ts`.
- API: `processes[].rss` jest addytywne. `id`, `type`, `cpuTime`, `bunServer`, `tabs`, `serviceWorkers` i stopka zostają.
- Kompatybilność: Claude Code, Codex i OpenClaw czytają ten sam lokalny snapshot. Stary konsument ignoruje nowe pole.
- Prywatność: czytany jest tylko jeden licznik `VmRSS` procesów, których id podało CDP tej przeglądarki. Bez argumentów procesu i bez treści stron.
- Blast radius: brak generatorów skilli i brak płatnych evali. Weryfikacja to `bun test browse/test/memory-command.test.ts`.
- Rollback: odwrócić commit. Brak migracji danych.

### Mierzalne kryteria sukcesu

- Przy czytelnym `/proc/<id>/status` każdy taki proces ma `rss` w bajtach, a stara notatka o całkowitym braku RSS znika.
- Proces typu `GPU` jest w tekście pod tą nazwą, ze swoim RSS. Snapshot nie ma pola VRAM.
- Brak statusu dla jednego id daje `rss: null` tylko jemu, plus notatkę, bez wyjątku.
- `processes: null` nadal oznacza brak sesji przeglądarki, nie zerowy RSS.
- `bun test browse/test/memory-command.test.ts` przechodzi świeżo, bez płatnych evali.

### Non-goals

- VRAM, pamięć Skia, cache GPU i zgodność z liczbą z Activity Monitor.
- RSS na Windows i macOS. Tam `rss` zostaje `null` i zostaje notatka.
- Uruchamianie `ps` albo innego procesu diagnostycznego.
- Zmiana sterty JS kart i workerów.
- Naprawa wycieku. Ta zmiana tylko mierzy.
- Nowa flaga CLI i zmiana tekstu stopki.
