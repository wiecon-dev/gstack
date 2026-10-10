# Design

## Context

`getMemorySnapshot()` bierze procesy z `SystemInfo.getProcessInfo`. Lokalny komentarz mówi, że `id` nie jest PID-em systemu i że CDP nie ma RSS. Decyzja przeglądu D2 zabraniała `ps`.

Probe na Chrome for Testing 149, Linux, 2026-10-10:

- pola procesu to tylko `type`, `id`, `cpuTime`;
- `id` wskazał istniejący `/proc/<id>/status`;
- `VmRSS` było obecne dla `browser` (138420 kB) i `GPU` (100704 kB);
- `SystemInfo.getInfo` ma `gpu`, `modelName`, `modelVersion`, `commandLine`, bez bajtów pamięci;
- `Memory.getDOMCounters` na sesji przeglądarki zwraca „wasn't found”.

Typ procesu GPU na tym Chrome to `GPU`, wielkimi literami, nie `gpu`.

## Goals / Non-Goals

**Goals:**

- Pokazać RSS procesów Chromium, w tym procesu `GPU`, bez udawania VRAM.
- Nie przewracać snapshotu, gdy jeden PID zniknie.
- Zostawić addytywny JSON i obecną stopkę.

**Non-Goals:**

- VRAM i inne liczniki karty graficznej.
- `ps`, Activity Monitor, Windows, macOS.
- Zmiana pomiaru JS.

## Decisions

### 1. RSS z jednej linii procfs, nie z CDP i nie z ps

CDP nie ma pola pamięci procesu. Implementacja, po akceptacji, czyta wyłącznie linię `VmRSS:` z `/proc/<id>/status` i mnoży kB przez 1024. To jest wąski wyjątek od D2: nie uruchamiamy powłoki ani `ps`, ale źródłem bajtów nie jest CDP. Gdy `/proc/<id>` nie istnieje, `rss` jest `null`. Nie szukamy innego PID.

Alternatywa — zostawić samą notatkę „CDP nie ma RSS” — została odrzucona, bo na tym hoście liczba jest dostępna i o nią chodzi w zmianie 3.

Alternatywa — dodać VRAM z `SystemInfo.getInfo` — została odrzucona, bo ta metoda nie zwraca bajtów pamięci.

### 2. Typ procesu bez normalizacji

`type` zostaje taki, jaki zwróciło CDP. Suma RSS w tekście grupuje po tym surowym napisie. `GPU` i `gpu` nie są scalane.

### 3. Stara notatka znika tylko po realnym odczycie

Gdy choć jeden proces ma liczbę, notatka „Per-Chromium-process RSS not collected” nie wchodzi do wyniku. Zostaje krótsza notatka, że wartość to Linux `VmRSS`, nie VRAM. Gdy żaden odczyt się nie uda, `rss` jest `null` i zostaje notatka o niedostępnym RSS.

## Risks / Trade-offs

- Na innym systemie `id` może nie być PID-em. Skutek: `null` i notatka, nie zła liczba.
- `VmRSS` nie tłumaczy odczytu 160 GB z Activity Monitor. Notatka ma to powiedzieć wprost.
- Czytanie `/proc` dotyczy tylko id zwróconych przez sesję tej przeglądarki.

## Migration Plan

Pole `rss` jest nowe. Brak migracji. Rollback to odwrotny commit. Stary tekst linii `Chromium processes:` zostaje; dochodzi osobna linia `Process RSS:`.

## Open Questions

Brak. Źródło bajtów, brak VRAM i wyjątek od `ps` są rozstrzygnięte powyżej.
