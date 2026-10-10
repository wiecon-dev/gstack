# Spec Delta

## Purpose

Pokazać w `$B memory` i `GET /memory` stertę JS workerów serwisowych rozszerzenia MV3, których dzisiejszy snapshot nie widzi, bo liczy tylko karty z `BrowserManager.pages`.

## ADDED Requirements

### Requirement: Worker rozszerzenia jest osobnym wpisem snapshotu
System SHALL dodać do `MemorySnapshot` pole `serviceWorkers`. Każdy wpis SHALL zawierać `url`, `jsHeapUsed` i `jsHeapTotal`. `url` SHALL być adresem workera. Pola sterty SHALL być liczbami bajtów albo `null`, gdy pomiar się nie udał. Wpis workera MUST NOT pojawić się w `tabs`.

#### Scenario: Worker rozszerzenia jest dostępny
- **WHEN** sesja CDP przeglądarki zwraca cel typu service worker, którego URL zaczyna się od `chrome-extension://`, i `Runtime.getHeapUsage` zwraca `usedSize` oraz `totalSize`
- **THEN** `serviceWorkers` zawiera ten URL, `jsHeapUsed` równe `usedSize` i `jsHeapTotal` równe `totalSize`, a `tabs` nie zawiera tego URL

#### Scenario: Jest więcej niż dziesięć workerów
- **WHEN** snapshot zawiera ponad 10 workerów rozszerzenia i użytkownik prosi o tekst, nie `--json`
- **THEN** tekst pokazuje 10 największych według `jsHeapUsed`, a następnie linię `...and N more` z liczbą pominiętych

#### Scenario: JSON i endpoint mają te same dane
- **WHEN** ten sam snapshot jest formatowany jako `$B memory --json` albo zwrócony przez `GET /memory`
- **THEN** oba wyniki zawierają tę samą tablicę `serviceWorkers`

### Requirement: Brak pomiaru nie jest cichym zerem
System MUST NOT rzucać wyjątku z całego `$B memory` albo `GET /memory` tylko dlatego, że jeden worker zniknął albo jego metryki są niedostępne. System SHALL odróżnić niedostępną sesję CDP od udanego pomiaru bez workerów rozszerzenia.

#### Scenario: Sesja CDP przeglądarki jest niedostępna
- **WHEN** nie ma uchwytu przeglądarki albo nie da się otworzyć sesji CDP używanej już do drzewa procesów
- **THEN** polecenie kończy się wynikiem, `serviceWorkers` jest pustą tablicą, a `notes` zawiera podciąg `service worker targets unavailable`

#### Scenario: Metryki jednego workera zawodzą
- **WHEN** cel workera jest widoczny, ale `Runtime.getHeapUsage` kończy się błędem albo nie wraca w ciągu sekundy
- **THEN** wpis z jego URL pozostaje, `jsHeapUsed` i `jsHeapTotal` są `null`, snapshot pozostałych kart i workerów jest dokończony, a `notes` zawiera podciąg `service worker heap unavailable`

#### Scenario: Pomiar znalazł zero workerów rozszerzenia
- **WHEN** sesja CDP działa i nie zwraca żadnego service workera o URL `chrome-extension://`
- **THEN** `serviceWorkers` jest pustą tablicą, tekst zawiera `Service workers:` oraz `(none)`, a `notes` nie zawiera `service worker targets unavailable`

### Requirement: Istniejący kontrakt pamięci zostaje
System SHALL zachować dotychczasowe pola `bunServer`, `tabs`, `processes`, `structures`, `capturedAt` i `notes`. Istniejąca notatka o braku RSS procesów Chromium MUST NOT zostać usunięta przez tę zmianę. Stopka sidebara SHALL nadal pokazywać tylko RSS Bun i liczbę kart.

#### Scenario: Stary konsument czyta snapshot
- **WHEN** konsument czyta `bunServer.rss` i długość `tabs`
- **THEN** dostaje te same znaczenia co przed zmianą, niezależnie od zawartości `serviceWorkers`

#### Scenario: Tekst diagnostyczny
- **WHEN** użytkownik uruchamia `$B memory` bez `--json` i jest co najmniej jeden worker z pomiarem
- **THEN** wynik zawiera sekcję zaczynającą się od `Service workers:` oraz URL workera, a istniejące linie `Bun server:` i `Renderers:` pozostają

### Requirement: Snapshot nie zbiera prywatnej treści workera
System MUST NOT zapisywać w snapshotcie storage rozszerzenia, ciasteczek, kodu źródłowego workera, treści stron ani wartości zmiennych środowiskowych. Jedynym identyfikatorem workera w nowym wpisie SHALL być jego URL.

#### Scenario: Formatowanie wpisu
- **WHEN** system serializuje wpis `serviceWorkers`
- **THEN** obiekt zawiera wyłącznie `url`, `jsHeapUsed` i `jsHeapTotal`

## Constraints

- Runtime: Bun 1.3.10 i Playwright 1.58.2 już używane przez `browse`.
- Zakres: tylko cele Chromium typu service worker z prefiksem `chrome-extension://`.
- Pomiar sterty workera: `Runtime.getHeapUsage` (`usedSize`, `totalSize`). `Performance.getMetrics` zostaje przy kartach, bo cel service workera tej metody nie ma. Brak odpowiedzi oznacza `null`, nie `0`.
- Operacyjnie: błąd jednego celu nie przerywa reszty snapshotu. Brak nowego timeoutu w pierwszym slice; obowiązuje dotychczasowe `catch` i kontynuacja.
- Prywatność: URL rozszerzenia zostaje w lokalnej diagnostyce. Brak nowej sieci i telemetrii.

## API

- Wejście bez zmian: `memory` i `memory --json` oraz autoryzowany `GET /memory`.
- Wyjście addytywne: `serviceWorkers: Array<{ url: string; jsHeapUsed: number | null; jsHeapTotal: number | null }>`.
- Formatter traktuje brak pola u starych fixture jako pustą listę, ale nowy snapshot zawsze to pole ustawia.

## Errors

- Brak przeglądarki albo sesji CDP: pusta lista plus notatka `service worker targets unavailable`.
- Cel znika w trakcie: wpis pominięty, reszta snapshotu wraca.
- Metryki odrzucone: URL zostaje, obie sterty `null`, notatka `service worker heap unavailable`.
- Nieznane argumenty CLI zachowują się jak dziś: ignorowane poza rozpoznanym `--json`.

## Testing

- Testy jednostkowe bez Chromium podstawiają gotowy snapshot i listę celów CDP.
- Przypadki: worker obecny, worker poza `tabs`, więcej niż 10, zero przy działającej sesji, sesja niedostępna, błąd metryk jednego z dwóch workerów, `--json` i tekst.
- Polecenie dowodu: `bun test browse/test/memory-command.test.ts`.
- Płatne `EVALS=1` nie należą do dowodu tej zmiany.

## Migration

- Pole jest nowe i opcjonalne dla starych czytelników JSON.
- Stopka nie wymaga migracji.
- Rollback to odwrócenie commita. Zapisane wcześniej snapshoty bez pola pozostają czytelne dla stopki.
