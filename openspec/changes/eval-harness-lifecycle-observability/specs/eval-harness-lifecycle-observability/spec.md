# Spec Delta

## Purpose

Zapewnia jednoznaczny, trwały i bezpieczny przy współbieżności obraz lifecycle długich testów eval, również gdy run zostanie przerwany przed końcowym raportem.

## ADDED Requirements

### Requirement: Każda próba testu ma widoczny lifecycle
System SHALL zapisać rekord START przed uruchomieniem procesu modelu oraz dokładnie jeden rekord END po zarejestrowaniu wyniku każdej próby testu eval. Rekordy SHALL zawierać identyfikatory runu i próby, nazwę testu, timestamp oraz status; END SHALL dodatkowo zawierać PASS/FAIL, czas trwania i podstawową diagnostykę zakończenia.

#### Scenario: Test kończy się powodzeniem
- **WHEN** harness rozpoczyna próbę testu i później rejestruje wynik pozytywny
- **THEN** trwały dziennik zawiera odpowiadające sobie rekordy START i END z tym samym identyfikatorem próby oraz statusem PASS

#### Scenario: Test kończy się błędem lub timeoutem
- **WHEN** harness rejestruje błąd, timeout albo negatywny wynik próby
- **THEN** trwały dziennik zawiera rekord END ze statusem FAIL i maszynowo czytelną przyczyną zakończenia

#### Scenario: Proces kończy się przed wynikiem
- **WHEN** proces zostaje przerwany po rekordzie START, ale przed rejestracją wyniku
- **THEN** rekord START pozostaje na dysku bez fałszywego rekordu END i może zostać sklasyfikowany jako niedokończony lub stale

### Requirement: Postęp jest widoczny bez buforowania raportera
System MUST wypisywać jednowierszowy komunikat START oraz końcowy komunikat PASS/FAIL bezpośrednio na stderr dla każdej próby testu, niezależnie od momentu opróżnienia standardowego raportera Bun.

#### Scenario: Długi test nie wywołał jeszcze narzędzia
- **WHEN** test został uruchomiony, lecz proces modelu nie wyemitował jeszcze wywołania narzędzia
- **THEN** obserwator widzi komunikat START na stderr i trwały rekord START

#### Scenario: Równoległy zestaw kończy pojedynczy test
- **WHEN** jeden z wielu równoległych testów kończy się
- **THEN** jego komunikat PASS/FAIL jest natychmiast wypisany na stderr bez czekania na zakończenie pliku testowego lub całego runu

### Requirement: Zakończone wyniki są utrwalane inkrementalnie
System SHALL trwale zapisywać wynik każdego zakończonego testu przed przejściem do końcowego podsumowania. Dane niekompletnego runu MUST być jawnie oznaczone jako partial i MUST NOT być wybierane jako kompletny baseline porównawczy.

#### Scenario: Run zostaje przerwany po części testów
- **WHEN** run kończy się awaryjnie po zapisaniu wyników części testów
- **THEN** wszystkie wcześniej zakończone wyniki pozostają dostępne jako dane partial po ponownym uruchomieniu narzędzi

#### Scenario: Narzędzie porównuje wyniki
- **WHEN** `eval:compare` albo inny konsument wybiera poprzedni kompletny baseline
- **THEN** pomija artefakty oznaczone jako partial

#### Scenario: Run kończy się poprawnie
- **WHEN** collector finalizuje run
- **THEN** system zapisuje dotychczasowy kompletny plik wyniku bez flagi partial i pozostawia artefakty diagnostyczne do inspekcji

### Requirement: Równoległe testy nie tracą wzajemnych danych
System MUST izolować lub atomowo dopisywać artefakty lifecycle i partial tak, aby równoległe próby, collectory oraz pliki testowe nie nadpisywały wzajemnie poprawnych rekordów.

#### Scenario: Dwa testy rozpoczynają się równocześnie
- **WHEN** dwa workery zapisują START w tym samym czasie
- **THEN** oba kompletne rekordy są możliwe do odczytania i żaden nie zastępuje drugiego

#### Scenario: Dwa collectory zapisują wyniki częściowe
- **WHEN** różne collectory utrwalają zakończone testy w nakładającym się czasie
- **THEN** wynik każdego collectora pozostaje dostępny w integralnym JSON lub JSONL bez współdzielonego pliku tymczasowego podatnego na kolizję

#### Scenario: Pojedynczy zapis nie powiedzie się
- **WHEN** zapis artefaktu observability zwraca błąd I/O
- **THEN** harness raportuje ostrzeżenie diagnostyczne, ale nie zmienia wyniku testu modelu wyłącznie z powodu awarii pomocniczej observability

### Requirement: Watcher prezentuje stan wielu prób
`eval:watch` SHALL prezentować testy aktywne, zakończone i niedokończone na podstawie trwałych artefaktów lifecycle oraz wyników partial, bez uznawania samej obecności procesu `bun test` za dowód żywotności konkretnego testu.

#### Scenario: Wiele testów jest aktywnych
- **WHEN** dziennik zawiera START bez END dla więcej niż jednej niestarej próby
- **THEN** watcher pokazuje każdą aktywną próbę z nazwą i czasem od ostatniego sygnału

#### Scenario: Próba przestaje emitować postęp
- **WHEN** aktywna próba przekracza ustalony próg świeżości bez END lub nowszego sygnału
- **THEN** watcher oznacza ją jako stale, nie deklarując automatycznie zakończenia procesu

#### Scenario: Brak aktywnego runu, ale istnieje partial
- **WHEN** nie ma świeżych prób aktywnych, lecz pozostały wyniki partial
- **THEN** watcher pokazuje odzyskane zakończone wyniki i informuje, że run nie został sfinalizowany

### Requirement: Artefakty observability zachowują prywatność i kompatybilność
Lifecycle log SHALL zawierać wyłącznie metadane operacyjne potrzebne do identyfikacji i diagnozy testu; MUST NOT zapisywać promptów, odpowiedzi modelu, sekretów ani wartości zmiennych środowiskowych. Istniejący format kompletnych wyników eval i istniejące komendy SHALL pozostać kompatybilne.

#### Scenario: Rekord lifecycle jest zapisywany
- **WHEN** system serializuje START, postęp albo END
- **THEN** rekord zawiera tylko identyfikatory, nazwę testu, czasy, status, liczniki i znormalizowaną przyczynę zakończenia

#### Scenario: Dotychczasowy konsument czyta kompletny wynik
- **WHEN** konsument zgodny z formatem sprzed zmiany otwiera sfinalizowany plik eval
- **THEN** nadal odczytuje wymagane pola bez migracji danych

