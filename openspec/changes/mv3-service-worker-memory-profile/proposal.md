# Proposal

## Why

`$B memory` i `GET /memory` mierzą stertę JS kart śledzonych w `BrowserManager.pages` oraz drzewo procesów Chromium bez RSS. Worker serwisowy rozszerzenia MV3 nie jest kartą, więc wyciek w `chrome-extension://…` nie pojawia się na liście rendererów ani w stopce, która pokazuje tylko RSS Bun i liczbę kart. Diagnostyka powstała po incydencie OOM i bez tego profilu nie da się odróżnić ciężkiej karty od ciężkiego workera rozszerzenia.

## What Changes

- Dodać do snapshotu osobną listę workerów serwisowych rozszerzenia, nie mieszając ich z `tabs`.
- Dla każdego takiego workera podać URL oraz stertę JS z `Runtime.getHeapUsage`. Karty zostają przy `Performance.getMetrics`, bo cel workera tej metody nie ma.
- Gdy odczyt workera się nie powiedzie, zachować wpis z pustym pomiarem i notatką, bez wyjątku z całego polecenia.
- Gdy sesja CDP przeglądarki jest niedostępna, zwrócić pustą listę i jawną notatkę, że cele nie były dostępne. To nie jest to samo co udany pomiar zera workerów.
- Zostawić bez zmian znaczenie `bunServer`, `tabs`, `processes`, `structures` i istniejącej notatki o braku RSS.
- Nie zmieniać tekstu stopki sidebara.

## Capabilities

### New Capabilities

- `mv3-service-worker-memory-profile`: Obserwowalny profil pamięci workerów serwisowych rozszerzenia MV3 w `$B memory` i `GET /memory`.

### Modified Capabilities

Brak. Główne specyfikacje OpenSpec nadal nie istnieją; zmiana 1 pozostaje osobnym deltem.

## Impact

- Kod, po akceptacji: `browse/src/memory-snapshot.ts`, `browse/src/memory-command.ts`, `browse/src/browser-manager.ts` oraz `browse/test/memory-command.test.ts`.
- API: pole JSON `serviceWorkers` jest addytywne. Istniejące pola zostają.
- Kompatybilność: Claude Code, Codex i OpenClaw korzystają z tego samego lokalnego CLI/endpointu. Stopka sidebara czyta tylko `bunServer.rss` i `tabs.length`, więc nowa lista jej nie zmienia.
- Prywatność: URL workera rozszerzenia jest identyfikatorem diagnostycznym. Snapshot nie zawiera storage, ciasteczek, kodu workera ani treści stron.
- Blast radius: brak generatorów skilli i brak globalnych touchfiles evali. Weryfikacja to darmowe testy `browse/test`, nie płatny zestaw E2E.
- Rollback: odwrócić commit. Starzy konsumenci ignorują nieznane pole JSON. Brak migracji danych.

### Mierzalne kryteria sukcesu

- `$B memory --json` i `GET /memory` zwracają `serviceWorkers` jako tablicę.
- Worker `chrome-extension://` nie występuje w `tabs`.
- Tekst zawiera sekcję `Service workers:` i pokazuje co najwyżej 10 wpisów oraz ogon `...and N more`.
- Niedostępna sesja CDP daje pustą tablicę i notatkę o niedostępności, a nie ciche „zero workerów”.
- Błąd pojedynczego workera nie przerywa snapshotu pozostałych kart i workerów.
- `bun test browse/test/memory-command.test.ts` przechodzi świeżo, bez uruchamiania płatnych evali.

### Non-goals

- RSS procesów, pamięć natywna, GPU, Skia i cache. To pozostaje zmianą 3.
- Naprawa wycieku. Ta zmiana tylko mierzy.
- Workery stron, dedicated workers i shared workers.
- Firefox i WebKit. Playwright 1.58.2 opisuje service workers jako obsługiwane tylko w Chromium.
- Zmiana progów albo tekstu stopki `RSS · N tabs`.
- Nowa flaga CLI poza istniejącym `--json`.
