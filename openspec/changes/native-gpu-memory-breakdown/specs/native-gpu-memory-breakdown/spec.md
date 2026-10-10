# Spec Delta

## Purpose

Pokazać w `$B memory` i `GET /memory` RSS procesów Chromium, w tym procesu `GPU`, bez udawania pomiaru VRAM.

## ADDED Requirements

### Requirement: Proces Chromium ma RSS albo jawny brak
System SHALL dodać do każdego elementu `processes` pole `rss`. Wartość SHALL być liczbą bajtów albo `null`. Bajty MUST pochodzić z linii `VmRSS` w `/proc/<id>/status`, pomnożone przez 1024. System MUST NOT uruchamiać `ps` i MUST NOT czytać `cmdline`, `environ` ani map pamięci. Istniejące pola `id`, `type` i `cpuTime` MUST NOT zmienić znaczenia.

#### Scenario: Status procesu jest czytelny
- **WHEN** `SystemInfo.getProcessInfo` zwraca proces, a `/proc/<id>/status` zawiera `VmRSS` w kB
- **THEN** `rss` tego procesu jest równe tej liczbie kB pomnożonej przez 1024, a notatka `Per-Chromium-process RSS not collected` nie występuje

#### Scenario: Jednego statusu brak
- **WHEN** jeden `id` nie ma czytelnego `VmRSS`, a inny ma
- **THEN** brakujący proces ma `rss: null`, zmierzony proces zachowuje liczbę, snapshot zawiera notatkę `process RSS unavailable` i polecenie nie rzuca wyjątku

#### Scenario: Żaden status nie jest czytelny
- **WHEN** lista procesów wróciła z CDP, ale żaden `id` nie ma czytelnego `VmRSS`
- **THEN** każdy `rss` jest `null` i snapshot zawiera notatkę, że RSS procesu jest niedostępny

#### Scenario: Nie ma sesji przeglądarki
- **WHEN** snapshot ma `processes: null`
- **THEN** wynik nie zawiera zerowego RSS procesów i tekst zostaje przy `Chromium processes: (unavailable — see notes)`

### Requirement: GPU oznacza proces, nie VRAM
System SHALL zachować `type` dokładnie tak, jak zwrócił je CDP. System MUST NOT dodać pola VRAM ani pamięci karty graficznej. Tekst SHALL zawierać linię `Process RSS:` z sumami `rss` pogrupowanymi po surowym `type`. Dla grupy z samym `null` tekst SHALL pokazać `unmeasured` zamiast bajtów.

#### Scenario: Proces GPU ma RSS
- **WHEN** lista zawiera proces o typie `GPU` z liczbowym `rss` i użytkownik prosi o tekst
- **THEN** linia `Process RSS:` zawiera `GPU` oraz te bajty, a JSON nie zawiera pola VRAM

#### Scenario: Ten sam snapshot idzie do JSON i endpointu
- **WHEN** ten sam snapshot jest formatowany jako `$B memory --json` albo zwrócony przez `GET /memory`
- **THEN** oba wyniki mają te same `processes[].rss`

### Requirement: Notatka nie myli RSS z VRAM
Gdy choć jeden `rss` jest liczbą, system SHALL dodać notatkę, że pomiar to Linux `VmRSS` procesu, nie VRAM i nie odczyt Activity Monitor. System MUST NOT zmienić linii `Bun server:` ani tekstu stopki.

#### Scenario: Jest przynajmniej jeden RSS
- **WHEN** co najmniej jeden proces ma liczbowy `rss` i użytkownik prosi o tekst
- **THEN** notatki zawierają informację, że jest to Linux VmRSS, nie VRAM, a linia `Bun server:` zostaje bez zmiany znaczenia

## Constraints

- Źródło: wyłącznie linia `VmRSS` z `/proc/<id>/status`. Brak pliku albo brak linii oznacza `null`, nie `0`.
- `id` jest używane jako PID tylko do tej ścieżki. Brak wpisu nie uruchamia innego wyszukiwania.
- Typ `GPU` nie jest zamieniany na `gpu`.
- VRAM, Skia, cache GPU, Windows i macOS są poza tym wymaganiem.
- Stopka sidebara zostaje przy `bunServer.rss` i `tabs.length`.
- Błąd jednego procesu nie przerywa reszty snapshotu.

## API

- Wejście: istniejące `$B memory`, `$B memory --json` i `GET /memory`. Bez nowej flagi.
- Wyjście: `processes[].rss: number | null`. Przy braku przeglądarki całe `processes` zostaje `null`.
- Tekst: obecna linia `Chromium processes:` plus nowa linia `Process RSS:`.

## Errors

- Nieczytelny status jednego PID: `rss: null` dla niego, notatka `process RSS unavailable`, reszta snapshotu wraca.
- Brak sesji CDP: `processes: null` i dotychczasowa linia unavailable. To nie jest zmierzony zerowy RSS.
- Odmowa odczytu `/proc`: ten sam skutek co brak statusu. Bez wyjątku do użytkownika.

## Testing

- Czysta funkcja na stubie: kB na bajty, brak pliku daje `null`, jeden błąd nie kasuje drugiego, typ `GPU` bez zmiany.
- Formatter: linia `Process RSS:`, `unmeasured`, brak pola VRAM w JSON, stara notatka znika po udanym odczycie.
- Komenda: `bun test browse/test/memory-command.test.ts`. Płatne evale nie są wymagane.
- Żywy Chrome nie jest częścią testu jednostkowego.

## Migration

- Pole jest addytywne. Stary klient je ignoruje.
- Notatka o całkowitym braku RSS jest usuwana tylko wtedy, gdy przynajmniej jeden odczyt się udał.
- Rollback: odwrotny commit. Brak migracji zapisanych danych.
