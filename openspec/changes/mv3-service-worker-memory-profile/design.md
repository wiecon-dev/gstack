# Design

## Context

`getMemorySnapshot()` w `browse/src/browser-manager.ts` buduje `tabs` wyłącznie z `this.pages` i czyta `Performance.getMetrics`. Drzewo procesów bierze z `SystemInfo.getProcessInfo` przez `browser.newBrowserCDPSession()`. Komentarz w `memory-snapshot.ts` mówi wprost, że RSS procesu nie wchodzi do tego snapshotu i czeka na zmianę „native/GPU memory breakdown”.

Playwright 1.58.2 udostępnia `BrowserContext.serviceWorkers(): Array<Worker>`. Publiczny `Worker` ma `url()` i `evaluate()`, ale nie ma sesji CDP. `performance.memory` nie jest kontraktem używanym przez ten kod i nie jest wiarygodnym API workera. Dlatego sam `evaluate()` nie jest źródłem sterty.

Zmiana nie dotyka generatorów `SKILL.md`.

## Goals / Non-Goals

**Goals:**

- Pokazać workery `chrome-extension://` obok kart, tymi samymi nazwami metryk JS.
- Nie przewracać całego polecenia, gdy jeden cel zniknie.
- Odróżnić „nie dało się zapytać” od „zapytaliśmy i nie ma workera”.
- Zachować addytywny JSON i obecną stopkę.

**Non-Goals:**

- RSS, GPU i pamięć natywna.
- Automatyczna naprawa albo restart workera.
- Workery zwykłych stron.
- Nowa komenda albo flaga.

## Decisions

### 1. Osobna lista, nie nowy rodzaj karty

`serviceWorkers` jest osobnym polem. Doklejenie workera do `tabs` zepsułoby licznik kart w stopce i istniejące testy „no tabs tracked”.

Alternatywa — dopisać worker jako tab z ujemnym id — została odrzucona, bo kłamie typ i rusza stopkę.

### 2. Sterta z istniejącej sesji CDP, nie z evaluate

Implementacja znajduje cele service worker przez sesję CDP przeglądarki, której kod już używa do procesów, i zatrzymuje tylko URL z prefiksem `chrome-extension://`. Publiczna sesja Playwright 1.58.2 nie ma `attachToTarget`, więc odczyt idzie przez `Target.attachToTarget` z `flatten: false` i `Target.sendMessageToTarget`. Żywy probe na Chrome for Testing 149, 2026-10-10, pokazał, że `Performance.getMetrics` na tym celu zwraca „wasn't found”, a `Runtime.getHeapUsage` zwraca `usedSize` i `totalSize`. Te dwie liczby trafiają do `jsHeapUsed` i `jsHeapTotal`. Po odczycie sesja celu jest odłączana.

`worker.evaluate(() => performance.memory)` na tym samym probe zwróciło `null`, więc nie jest źródłem bajtów.

### 3. Null znaczy brak pomiaru

Karty dziś wstawiają `0`, gdy metryki nie mają klucza. Dla nowego pola `0` wyglądałoby jak pusty worker. Dlatego nieudany odczyt przy widocznym celu zapisuje `null` i notatkę `service worker heap unavailable`. Brak sesji daje pustą tablicę i inną notatkę: `service worker targets unavailable`.

### 4. Tekst ma ten sam limit co karty

Formatter pokazuje do 10 workerów sortowanych malejąco po `jsHeapUsed`. `null` sortuje się za liczbami. Ogon używa istniejącego wzorca `...and N more`. Brak pola u starych fixture traktuje jak `[]`, żeby nie przepisywać każdego testu, który nie dotyczy workerów. Nowy snapshot zawsze ustawia tablicę.

### 5. Stopka zostaje

`renderMemFooter()` czyta wyłącznie RSS i liczbę kart. Dokładanie tam workerów zmieniłoby progi ostrzeżeń bez nowej decyzji. Ta zmiana ich nie rusza.

## Risks / Trade-offs

- Podłączenie CDP do workera rozszerzenia może się nie udać albo przedłużyć snapshot. Mitygacja: błąd jednego celu nie przerywa pętli, sesja jest odłączana, brak nowego równoległego odpytywania wszystkich celów naraz w pierwszym slice.
- `Target.getTargets` może zwrócić też dokumenty offscreen. Filtr typu service worker i prefiksu URL ma ich nie wciągać. Test stubem musi podać oba i oczekiwać tylko workera rozszerzenia.
- URL `chrome-extension://<id>/…` ujawnia identyfikator rozszerzenia operatorowi lokalnej diagnostyki. To jest zamierzone i nie wychodzi poza dotychczasowy model lokalnego JSON.

## Migration Plan

1. Dodać typ i formatter za testami na stubie.
2. Dodać czyste mapowanie listy celów i wyników metryk, też na stubie.
3. Podłączyć mapowanie w `getMemorySnapshot()` bez zmiany pozostałych pól.
4. Rollback: odwrócić commit. Stopka i starzy czytelnicy JSON działają bez pola.

## Open Questions

Brak. Żywy probe rozstrzygnął źródło bajtów: `Runtime.getHeapUsage`, nie `Performance.getMetrics`. Publiczne pola zostają `jsHeapUsed` i `jsHeapTotal`. Gdy odpowiedź nie przyjdzie, zostaje `null` i notatka.

## Monitoring

Brak nowej telemetrii. Obserwacją jest sam snapshot: liczba wpisów, `null` oraz notatki. Testy jednostkowe są dowodem regresji formatu.
