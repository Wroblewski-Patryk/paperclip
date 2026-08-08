# Audyt Paperclip Softwarehouse: raw vs instancja lokalna, aktualizacja i repozytoria produktów

**Data stanu:** 2026-08-08  
**Repozytorium kontrolne:** `Paperclip_Softwarehouse`  
**Zakres:** Paperclip bazowy, konfiguracja i dane działającej instancji, rozszerzenia kodu, możliwość aktualizacji oraz repozytoria Roost, Soar i Featherly.

## 1. Odpowiedź w skrócie

Lokalny Paperclip nie jest już „Paperclipem z dodatkową konfiguracją”. To rozbudowany fork produktu, w którym równolegle istnieją cztery warstwy:

1. standardowa funkcjonalność odziedziczona z Paperclipa;
2. konfiguracja firmy, agentów, projektów, celów, instrukcji i adapterów;
3. lokalne rozszerzenia kodu i modelu danych budujące autonomiczny softwarehouse;
4. zewnętrzne skrypty kontrolne, automatyzacje Codex i repozytoria wytwarzanych aplikacji.

Bezpośrednia aktualizacja do obecnego upstreamu **nie jest bezpieczna**. Nie ma jednej migracji, która automatycznie zachowa i zintegruje wszystkie lokalne rozwiązania. Szczególnie zagrożone są:

- niezatwierdzone zmiany w aktualnym drzewie roboczym;
- lokalne tabele i usługi autonomii, nadzoru, delegacji, dostaw i pamięci organizacyjnej;
- migracje o tych samych numerach, lecz innej zawartości niż w upstreamie;
- zmodyfikowane kontrakty współdzielone przez bazę, serwer i UI;
- instrukcje i skrypty zależne od lokalnych endpointów;
- semantyka pracy agentów, która może przetrwać jako dane, ale przestać działać po wymianie kodu.

Wniosek operacyjny: aktualizacja powinna być osobnym projektem integracyjnym z kopią bazy, gałęzią migracyjną, mapą funkcji i testem odtworzenia. Nie powinna być wykonywana na działającej instancji przez prosty merge, rebase, `git pull` ani instalację nowego wydania.

Jednocześnie zbudowany system ma realną wartość. Najmocniejsze elementy to ścisła topologia runtime, izolacja katalogów, rozbudowane instrukcje agentów, warstwa dostaw i wyników, pamięć organizacyjna, admission control, nadzór oraz mechanizmy ograniczania autonomii. Największy brak nie leży dziś w liczbie mechanizmów, lecz w domknięciu pętli od aktywności agenta do zweryfikowanego wyniku biznesowego.

## 2. Co oznacza „raw Paperclip” w tym audycie

Porównanie ma dwa punkty odniesienia, ponieważ odpowiadają one na dwa różne pytania.

### 2.1. Baza historyczna forka

- remote: `henkdz/master`;
- commit: `1374136a826...`;
- data commitu: 2026-06-02;
- relacja: jest przodkiem lokalnego `main`, a lokalny `main` jest przodkiem bieżącego HEAD;
- opis wersji: `canary/v2026.602.0-canary.1-13-g...`.

To jest właściwa baza do pytania: „co zostało dodane do wersji Paperclipa, od której zaczęliśmy?”.

### 2.2. Aktualny upstream Paperclip

- remote: `upstream/master` (`paperclipai/paperclip`);
- commit widziany podczas audytu: `19be4cf...`;
- opis: `canary/v2026.808.0-canary.4`;
- najnowszy pobrany stabilny tag: `v2026.722.0`.

To jest właściwa baza do pytania: „co trzeba zrobić, aby przejść na aktualną linię rozwoju Paperclipa?”.

Pole `version` nie wystarcza do rozróżnienia tych generacji: historyczny fork, bieżący lokalny HEAD, upstream i stabilny tag nadal raportują pakietową wersję `0.3.1`. Źródło należy identyfikować przez pełny commit, zestaw migracji i kontrakt API.

## 3. Stan lokalnego Paperclipa

### 3.1. Źródło i skala rozbudowy

- bieżąca gałąź: `codex/rolling-work-queue`;
- HEAD: `e92e06c11e093f13fb421411448596e52646fa26`;
- HEAD jest około 464 commity przed `henkdz/master`;
- HEAD jest 153 commity przed lokalnym `main`;
- względem wspólnej bazy z aktualnym upstreamem: lokalny HEAD ma 477 własnych commitów, a upstream 955 własnych;
- różnica `henkdz/master..HEAD`: 2267 plików, około 1 078 109 dodań i 2 096 usunięć.

Liczba dodanych linii jest zawyżona przez generowane grafy, snapshoty migracji, indeksy zdarzeń i dokumentację stanu. Nie oznacza miliona linii nowej logiki biznesowej. Oznacza natomiast, że rozdzielenie kodu produktu od dowodów i artefaktów stało się pilnym problemem utrzymaniowym.

### 3.2. Drzewo robocze i działająca instancja

Podczas audytu repozytorium miało około 127 zmienionych lub nieśledzonych ścieżek. Sam diff śledzonych plików obejmował 61 plików, około 2263 dodań i 99 usunięć. Wśród zmian są nowe schematy bazy, migracje, usługi autonomii, delegacji i nadzoru, trasy, testy i dokumentacja.

Proces na porcie `3200` uruchamia bezpośrednio `src/index.ts` z tego repozytorium, a nie zamrożony artefakt wydania. Oznacza to, że aktualny stan roboczy jest częścią działającego produktu. Restart po niekontrolowanym merge'u może zmienić zachowanie lub uniemożliwić start, nawet zanim zostanie wykonana migracja.

### 3.3. Topologia i granice

Sprawdzenia wykonane w czasie audytu:

- ścisły Paperclip API/UI na `127.0.0.1:3200`: przechodzi;
- ścisły embedded PostgreSQL na `54329`: przechodzi;
- jedna kanoniczna kopia Paperclip, Soar, Roost i Featherly: przechodzi;
- brak dodatkowych worktree tych projektów: przechodzi;
- audyt granic workspace: przechodzi;
- Docker: inwentarz niedostępny, ostrzeżenie nieblokujące;
- izolacja projektów w bieżącej kolejce: nie przechodzi — cztery zadania canary Soar nie mają kanonicznego znacznika projektu.

Topologia uruchomieniowa jest więc uporządkowana. Niespójność dotyczy warstwy danych sterujących pracą, nie katalogów ani portów.

## 4. Inwentarz rozwiązań

Szczegółowy, filtrowalny rejestr znajduje się w towarzyszącym pliku `2026-08-08-paperclip-solution-inventory.csv`. Poniżej przedstawiono grupy funkcjonalne.

### 4.1. Konfiguracja i dane standardowego Paperclipa

| Obszar | Stan | Ocena |
|---|---:|---|
| Firma | 1 firma LuckySparrow | poprawnie scentralizowana |
| Agenci | 39 agentów | bardzo rozbudowana organizacja |
| Adaptery używane przez agentów | 39 × `codex_local` | jednolity runtime, mała różnorodność wykonawcza |
| Modele | 30 Terra, 7 Sol, 2 Luna | świadome zróżnicowanie koszt/jakość |
| Cele | 13, w tym 8 aktywnych | istnieje warstwa strategiczna |
| Projekty | 9, w tym 4 aktywne i 5 archiwalnych | tylko 3 projekty są powiązane z celami |
| Rutyny | 37, z czego 24 archiwalne i 13 wstrzymanych | obecnie nie są głównym silnikiem pracy |
| Budżet | 4600 centów tygodniowo, 20 000 miesięcznie | limity istnieją; raportowanie kosztów wykonania jest niepełne |
| Instrukcje agentów | 39 unikalnych pakietów | kompletne, ale bardzo ciężkie kontekstowo |

Konfiguracja agentów ma 30 pakietów zarządzanych i 9 zewnętrznych. Wyszukiwanie jest wyłączone dla wszystkich 39 agentów. Minimalny pakiet zawierał 41 plików Markdown i około 161 KB treści. Audyt kompletności instrukcji przeszedł, ale sama wielkość zwiększa koszt kontekstu i ryzyko sprzecznych reguł. Mechanizmy admission/context są więc potrzebne nie tylko jako funkcja rozwojowa, lecz także jako obrona przed własną złożonością instrukcji.

Audyt ustawień agentów zgłosił 38 błędów, ponieważ skrypt oczekiwał globalnego `dangerouslyBypassApprovalsAndSandbox=true`. To oczekiwanie jest sprzeczne z aktualnymi politykami bezpieczeństwa projektu, według których bypass ma być wyjątkiem dla prac systemowych. Skrypt konfiguracyjny/audytowy jest nieaktualny i nie powinien być używany do masowego włączenia bypassu.

### 4.2. Konfiguracja poza repozytorium

- `C:\Users\wrobl\.paperclip\adapter-plugins.json` rejestruje zewnętrzny adapter Hermes `@henkey/hermes-paperclip-adapter` w wersji 0.4.3;
- żaden z 39 aktywnych agentów nie korzysta obecnie z `hermes_local`;
- konfiguracja przetrwa wymianę repozytorium, ale kompatybilność API pluginu z nowym Paperclipem musi być osobno sprawdzona;
- lokalne automatyzacje Codex realizują cztery aktywne, zasadniczo tylko-odczytowe kontrole: watchdog, dzienną integralność, operational doctor i tygodniowe meta-review;
- automatyzacja higieny dysku jest wstrzymana.

Te automatyzacje są dobrym zewnętrznym bezpiecznikiem, o ile pozostają obserwacyjne. Po aktualizacji trzeba zweryfikować endpointy i formaty odpowiedzi, od których zależą.

### 4.3. Rozszerzenia kodu już zatwierdzone w Git

Najważniejsze lokalne domeny dodane ponad historyczną bazę:

- admission controls, decyzje dopuszczenia i przejścia stanu;
- propozycje przypisania zadań;
- instalacje zespołów z katalogu;
- delivery tasks i przejścia dostaw;
- product deliveries i product outcomes;
- organizational records i observations;
- workspace resource claims;
- Roost outbox i integracja publikowania;
- API i UI Softwarehouse;
- pamięć organizacyjna i uczenie;
- artefakty i work products;
- rozbudowane dashboardy operacyjne;
- OpenAPI oraz dodatkowe trasy kontroli firmy.

Jest to faktyczna rozbudowa produktu i modelu danych, a nie wyłącznie konfiguracja. Bez przeniesienia kodu nowy upstream nie będzie umiał korzystać z tych tabel ani interpretować części danych.

### 4.4. Rozszerzenia kodu niezabezpieczone commitem

W drzewie roboczym znajdują się między innymi:

- schematy `autonomy`, `delegation_reports`, `supervision`, `work_proposals`;
- migracje 0112–0122;
- silnik native control i jego kontrakt;
- autonomy decision service;
- context admission;
- przepływ delegacji;
- execution quota;
- hierarchy health;
- next legal action;
- run context builder;
- session runtime budget;
- supervision registry;
- odpowiadające trasy i testy.

To warstwa o najwyższym ryzyku utraty. Nie jest chroniona nawet przez zwykłe odtworzenie gałęzi Git. Przed jakąkolwiek aktualizacją musi zostać podzielona na logiczne commity, zweryfikowana i oznaczona jako: przenoszona, zastępowana przez upstream albo wycofywana.

### 4.5. Działający model autonomii

Aktualny snapshot wskazuje:

- 5 dostaw produktu: 4 `outcome_accepted`, 1 `review_accepted`;
- 17 decyzji organizacyjnych: 8 zaakceptowanych, 9 proponowanych;
- 129 obserwacji organizacyjnych, z czego 113 pozostaje w stanie `proposed`;
- 27 ustaleń nadzorczych: 21 wysokich i 4 krytyczne;
- 500 cykli nadzoru, z czego 499 ukończonych;
- 189 nawrotów problemów;
- 8 shadow comparisons, 7 wymagających uwagi;
- 1 zweryfikowana interwencja i 1 promowane uczenie.

To pokazuje, że pętla obserwacji i nadzoru działa technicznie, ale konwersja obserwacji w zaakceptowane decyzje, trwałe uczenie i wyniki jest jeszcze niska. Wcześniejsze raporty wskazywały zero interwencji i zero promocji; obecny stan jest poprawą, ale nadal nie dowodzi dojrzałej pętli autonomicznego doskonalenia.

### 4.6. Aktywność a wynik

W okresie 2026-07-26–2026-08-08 zarejestrowano:

- 18 822 uruchomienia;
- 13 204 sukcesy techniczne;
- 5 320 niepowodzeń;
- około 28,3% niepowodzeń.

Pierwsze dwa dni miały skrajnie wysoki udział błędów, później sytuacja się poprawiła, lecz 2026-08-08 nadal 6 z 11 uruchomień zakończyło się niepowodzeniem. Endpoint szczegółowych heartbeat runs nie odpowiedział ani w 10, ani w 30 sekund, przez co nie udało się w tym audycie wiarygodnie rozbić przyczyn błędów. Sama niedostępność tego widoku jest problemem obserwowalności lub wydajności.

Zestawienie 18 822 uruchomień z zaledwie 5 dostawami produktu i 4 zaakceptowanymi wynikami wskazuje, że system mierzy przede wszystkim aktywność. Nie ma jeszcze wystarczająco silnej, kompletnej relacji:

`uruchomienie → zmiana → test → review → deployment → obserwowany wynik → decyzja organizacyjna`.

To jest centralny brak wobec celu „autonomiczny softwarehouse”.

## 5. Komplementarność i zbieżność rozwiązań

### 5.1. Elementy dobrze komplementarne

1. **Granice workspace + claims + izolacja projektów.** Fizyczna granica katalogów jest wzmacniana przez logiczne roszczenia do zasobów.
2. **Instrukcje + admission/context + next legal action.** Ciężkie instrukcje są uzupełniane przez mechanizmy ograniczające kontekst i dopuszczalne akcje.
3. **Dostawy + wyniki + dowody.** Model delivery/outcome dobrze uzupełnia task-centric Paperclipa i przesuwa punkt ciężkości na wartość produktu.
4. **Pamięć organizacyjna + obserwacje + decyzje.** Istnieją potrzebne elementy uczenia na poziomie firmy.
5. **Nadzór natywny + automatyzacje obserwacyjne.** Kontrola wewnętrzna ma zewnętrzny bezpiecznik, niebędący drugim autonomicznym mutatorem.
6. **Ścisły runtime + backupy.** Jedna instancja i jedna baza redukują niejednoznaczność operacyjną.

### 5.2. Elementy częściowo nakładające się

- lokalne decyzje, kolejki, nadzór i admission pokrywają się funkcjonalnie z nowymi upstreamowymi decisions, decision queues, watchdogs, recovery, attention i policy layers;
- lokalne delivery/product outcomes częściowo sąsiadują z upstreamowymi pipelines, cases i status cards;
- lokalna kontrola narzędzi i instrukcji spotyka się z upstreamowymi skill policies i tool gateway;
- lokalny katalog zespołów i instalacje zespołów mogą kolidować z nowszym modelem zarządzania środowiskami i konfiguracją firmy.

Nie należy wybierać zwycięzcy na podstawie nazw. Dla każdego obszaru potrzebny jest test semantyczny: dane, invariants, API, UI, uprawnienia, log aktywności, rollback i dowody. Część lokalnych rozwiązań może zostać zastąpiona przez upstream, ale nie automatycznie.

### 5.3. Braki i niespójności

- 572 ścieżki zostały zmienione zarówno lokalnie, jak i w upstreamie;
- największe nakładanie dotyczy testów serwera, komponentów UI, usług, shared contracts, stron, bazy i tras;
- dashboard raportuje 2448 zadań, natomiast paginowana lista widoczna w audycie 2007; populacje lub filtry nie są semantycznie wyrównane;
- 240 z 1781 widocznych zadań `done` nie miało typed evidence;
- 61 zadań pozostaje zablokowanych, a 129 elementów jest otwartych według dashboardu;
- tylko 3 z 9 projektów są połączone z celami;
- root organizacji ma 13 bezpośrednich raportów, co jest większe niż deklarowany limit rozgałęzienia autonomicznej delegacji równy 8;
- 19 z 39 ról sklasyfikowano jako PM, podczas gdy inżynierów jest 7 — organizacja jest silnie zarządcza;
- koszt wykonań nie jest wiarygodnie połączony z dużą liczbą runów;
- 129 pozycji intent debt oraz 262 stare/nieprzypisane/bez typu rekordy zależności blokują legalny canary;
- bieżący test izolacji ma 4 blokery w Soar.

## 6. Czy aktualizacja zachowa rozwiązania

### 6.1. Macierz trwałości

| Warstwa | Czy sama aktualizacja ją zachowa? | Uwagi |
|---|---|---|
| Standardowe dane firmy/agenci/projekty/issues | częściowo | powinny przejść tylko przez przetestowane migracje i zgodny schemat |
| Eksport firmy | częściowo | nie obejmuje pełnego lokalnego modelu autonomii, dostaw, pamięci i nadzoru |
| Pełny backup PostgreSQL | zachowa bajty | nowy kod może nie znać lokalnych tabel i nie umieć ich użyć |
| Lokalne commity | nie automatycznie | wymagają merge'u, rebase'u lub portowania |
| Niezatwierdzone zmiany | nie | najwyższe ryzyko bezpośredniej utraty |
| Lokalne migracje | niebezpieczne | mają kolidujące numery i wpisy journal z upstreamem |
| Adapter Hermes w profilu użytkownika | plik przetrwa | plugin może być niekompatybilny; obecnie nie jest używany przez agentów |
| Automatyzacje Codex | pliki przetrwają | endpointy i formaty API mogą się zmienić |
| Repozytoria Roost/Soar/Featherly | tak, fizycznie niezależne | sposób sterowania nimi przez Paperclip może przestać działać |
| Wygenerowane instrukcje runtime | zwykle tak na dysku | mogą być niezgodne z nowym modelem promptów/adapterów |

### 6.2. Konflikt migracji

Lokalne i upstreamowe migracje używają tych samych numerów 0099–0122 dla innych zmian. Przykłady:

- lokalne `0099_issue_completion_evidence` vs upstream `0099_skills_store_foundation`;
- lokalne `0113_clear_stephen_strange` vs upstream `0113_pipeline_foundation`;
- lokalne `0122_backfill_autonomy_calibration_cohort` vs upstream `0122_pipeline_case_documents`.

Upstream ma obecnie migracje aż do 0211. Lokalny migrator sprawdza dokładne wpisy i hashe, więc problem nie sprowadza się do prostego pominięcia starszych timestampów. Połączenie dwóch dzienników może pozostawić pliki niezarejestrowane, kolidujące lub wykonane w złej kolejności. Potrzebny jest kontrolowany most migracyjny, a nie mechaniczne skopiowanie katalogu migracji.

### 6.3. Backup

W repozytoryjnym katalogu instancji znajdowało się siedem backupów bazy z 2026-08-08, każdy około 1,324 GB; najnowszy plik to `paperclip-20260808-170610.sql.gz`. To dobry sygnał, ale w tym audycie nie wykonano pełnego testu restore. Backup nie jest dowodem odzyskiwalności, dopóki odtworzona kopia nie przejdzie kontroli liczebności, kluczy, sekretów/kluczy szyfrujących, migracji i krytycznych przepływów.

## 7. Bezpieczna strategia aktualizacji

### Etap A — zamrożenie i dowody

1. Zatrzymać rozwój modelu danych na czas przygotowania integracji.
2. Podzielić aktualne zmiany robocze na logiczne, recenzowalne commity.
3. Zapisać pełny manifest: commit, migracje, konfiguracja użytkownika, konfiguracja runtime, liczebności tabel, aktywne endpointy i hash instrukcji.
4. Wykonać pełny backup bazy oraz niezależny eksport standardowych danych firmy.
5. Odtworzyć backup do odizolowanej bazy i potwierdzić jego użyteczność.

### Etap B — klasyfikacja funkcji

Dla każdego wiersza z rejestru rozwiązań nadać jedną decyzję:

- `KEEP_LOCAL` — nadal potrzebne i bez odpowiednika upstream;
- `ADOPT_UPSTREAM` — upstream pokrywa wymaganie po testach semantycznych;
- `BRIDGE` — tymczasowy adapter lub transformacja danych;
- `EXTERNALIZE` — przenieść poza core do pluginu/skryptu;
- `RETIRE` — funkcja albo dane nie mają już wartości.

### Etap C — nowa gałąź integracyjna

1. Założyć gałąź od wybranego stabilnego taga upstream, nie od canary.
2. Najpierw uruchomić czysty upstream z nową, pustą bazą.
3. Portować rozwiązania pionowymi przekrojami: DB → shared → server → UI → test → docs.
4. Renumerować lokalne migracje powyżej upstreamowego końca albo przygotować jawne migracje transformujące istniejącą bazę. Nie zmieniać historii zastosowanej na produkcyjnej bazie bez mapy zgodności.
5. Preferować pluginy dla adapterów i integracji zewnętrznych; nie utrzymywać hardcoded imports, jeśli upstream oferuje kontrakt rozszerzeń.

### Etap D — próba migracji na kopii

1. Uruchomić migrację wyłącznie na kopii odtworzonej bazy.
2. Porównać liczebności i próbki wszystkich standardowych i lokalnych tabel.
3. Zweryfikować autoryzację, zakres firmy, aktywność mutation logs i budżet hard-stop.
4. Odtworzyć co najmniej jeden przepływ: issue → checkout → wykonanie → dowody → review → delivery → outcome.
5. Zweryfikować agentów, instrukcje, adaptery, dashboard, nadzór, pamięć i eksport.
6. Przeprowadzić test kompatybilności automatyzacji i skryptów.

### Etap E — shadow i cutover

1. Uruchomić nową instancję na odizolowanej kopii danych i bez prawa mutowania repozytoriów produkcyjnych.
2. Porównać decyzje kandydata z obecną instancją.
3. Dopuścić pojedynczy, bezpieczny canary dopiero po usunięciu obecnych blockerów.
4. Przygotować rollback obejmujący jednocześnie kod, bazę, konfigurację i klucze.
5. W oknie przełączenia zatrzymać zapisy, wykonać finalny backup, migrować i uruchomić smoke testy.

## 8. Ocena repozytoriów aplikacji

### 8.1. Zasada ogólna

Duża liczba commitów nie oznacza automatycznie, że commity są zbędne. Git przechowuje historię przyrostowo, a usuwanie historii utrudnia audyt, rollback i powiązanie pracy agentów. W tej chwili problemem jest przede wszystkim:

- wersjonowanie ogromnej ilości generowanych raportów i stanu;
- wielokrotne, drobne aktualizacje tych samych plików kontrolnych;
- pozostawione gałęzie issue;
- rozjazd gałęzi lokalnej, origin i wdrożenia;
- niewystarczające powiązanie commitów kodowych z Paperclip issue i wynikami.

Najpierw należy uporządkować bieżące drzewa i reguły przyszłych commitów. Przepisywanie całej historii (`filter-repo`, force-push) powinno być osobnym, późniejszym projektem i tylko wtedy, gdy koszt przechowywania/klonowania rzeczywiście to uzasadnia.

### 8.2. Roost

**Stan Git**

- HEAD `62ed064af428...`, równy `origin/main`;
- wdrożony SHA również jest zgodny;
- 603 commity łącznie, 25 od 2026-07-03;
- 62 lokalne gałęzie: 33 scalone, 29 niescalonych;
- 2 zmodyfikowane pliki generowanego raportowania architektury.

**Charakter repozytorium**

- 2218 śledzonych plików;
- około 1976 to dokumentacja lub stan;
- około 83 to kod źródłowy;
- 1562 pliki Markdown;
- `.agents/state` około 3,29 MB, `docs/status` około 1,83 MB;
- pack Git około 121 MB.

**Ocena**

Produkcja jest zdrowa i zgodna z głównym źródłem. Nie ma podstaw do usuwania historii kodu. Priorytetem jest zamknięcie dwóch zmian generowanych, archiwizacja/pruning scalonych i zweryfikowanych gałęzi oraz ograniczenie przyszłego wersjonowania raportów. Niescalonych gałęzi nie wolno kasować zbiorczo — najpierw należy sprawdzić unikalne commity i powiązane issue.

### 8.3. Soar

**Stan Git**

- gałąź `codex/soar-profile-canary`;
- HEAD `39458c063...`, 5 commitów przed `origin/main`;
- wdrożony SHA `a83e6ae...`, więc źródło lokalne i produkcja są rozbieżne;
- 3 nieśledzone pliki closeout/evidence;
- 2663 commity łącznie, 198 od 2026-07-03;
- 229 lokalnych gałęzi: 181 scalonych, 48 niescalonych.

**Charakter ostatniej pracy**

- 153 ze 198 commitów było docs/metadata-only;
- 18 dotyczyło wyłącznie generowanego stanu;
- około 34 dotknęły kodu lub testów;
- 124 commity mają prefiks `docs`;
- 114 commitów dotknęło co najmniej 10 plików;
- jeden commit był pusty.

**Akrecja danych**

- 7582 śledzone pliki;
- około 6273 to dokumentacja lub stan;
- około 5121 ma charakter historii/generowanych danych;
- katalog `history` ma około 45,8 MB;
- `.agents/state` ma około 4,4 MB;
- pojedyncze aktywne pliki stanu mają od około 0,7 do 3,3 MB;
- pack Git około 202 MB.

**Ważna dobra zmiana**

Pięć lokalnych commitów nie wygląda jak przypadkowy odpad. Zawierają porządkowanie dowodów i zasad oraz usunięcie z wersjonowania dużej ilości generowanych statusów/grafów. Diff gałęzi obejmuje około 740 905 usuniętych linii. To kierunek zgodny z wnioskami audytu i powinien zostać zrecenzowany oraz świadomie zintegrowany, a nie odrzucony.

**Ocena**

Soar wymaga najwyższego priorytetu higieny. Nie zaleca się czyszczenia przez przepisywanie 2663 commitów. Zalecane jest:

1. zintegrowanie lub jawne odrzucenie pięciu lokalnych commitów;
2. ustalenie kanonicznej relacji source/deployment;
3. przeniesienie wygenerowanych dowodów do artefaktów Paperclip lub skompresowanej historii poza aktywnym drzewem;
4. pozostawienie jednego małego dokumentu „current truth” zamiast wielomegabajtowych, stale przepisywanych rejestrów;
5. przegląd 181 scalonych gałęzi do bezpiecznego usunięcia i osobny przegląd 48 niescalonych;
6. naprawa czterech canary issues bez project markerów.

### 8.4. Featherly

**Stan Git**

- gałąź `candidate/featherly-main-convergence-20260731`;
- HEAD `0ba5dca3...`;
- brak skonfigurowanego upstreamu gałęzi;
- względem `origin/main`: 37 commitów lokalnych i 7 zdalnych;
- co najmniej 3 lokalne commity są patch-equivalent z commitami na origin, mimo innych hashy;
- 365 commitów łącznie, 38 od 2026-07-03;
- 2 lokalne gałęzie, obie zawarte w HEAD.

**Drzewo robocze**

Istnieje spójny, niezacommitowany pionowy przekrój „Exchange connection”: kontroler, request/model/policy, usługi, migracja, UI i test. To nie wygląda jak losowy śmieć, lecz nie można automatycznie uznać tego za prawidłowy zakres produktu. Dokumentacja Featherly opisuje przede wszystkim wielojęzyczny CMS, więc należy potwierdzić decyzję produktową i kompletność testów przed commitem albo usunięciem.

**Ocena**

Repozytorium ma rozsądniejszą proporcję kodu do dokumentacji niż Roost i Soar. Największe ryzyko to konwergencja gałęzi oraz nieznany SHA produkcji. Należy użyć `git cherry`/porównania patch-id, aby nie powielać równoważnych commitów, następnie zrebase'ować lub zbudować kontrolowany merge z `origin/main`. Nie wolno resetować lokalnej gałęzi, bo zawiera realne, unikalne poprawki bezpieczeństwa, sanitizacji, PostgreSQL i dowodów.

## 9. Docelowy model utrzymania

### 9.1. Co powinno pozostać konfiguracją

- firma, cele, projekty, role i hierarchia;
- wybór modeli, limity kosztów i czasu;
- szablony instrukcji i polityki admission;
- aktywne adaptery i ich bezpieczna konfiguracja;
- mapowanie repozytoriów i środowisk;
- progi canary, review i dowodów;
- obserwacyjne harmonogramy kontroli.

Konfiguracja powinna mieć wersjonowane źródło prawdy oraz kontrolowany mechanizm materializacji do bazy/runtime. Nie należy wersjonować każdej wygenerowanej kopii instrukcji.

### 9.2. Co uzasadnia rozszerzenie core

- niezmienniki bezpieczeństwa wymagające transakcji i company scope;
- model delivery/outcome, jeśli upstream nie zapewnia równoważnej semantyki;
- atomowe claims i checkout;
- nadzór i decision gates, jeśli muszą blokować mutacje;
- activity logging i kontrola budżetu;
- migracje danych potrzebne do utrzymania tych niezmienników.

### 9.3. Co powinno być zewnętrzne

- adapter Hermes i przyszłe adaptery narzędziowe;
- publisher/outbox specyficzny dla produktu, jeśli może działać przez stabilny kontrakt pluginu;
- read-only watchdogi i raporty porównawcze;
- ciężkie generatory grafów, indeksów i raportów;
- archiwalne dowody wykonania.

### 9.4. Minimalna definicja sukcesu softwarehouse

System powinien raportować nie tylko liczbę zadań i runów, ale dla każdego produktu:

- aktualny kanoniczny branch i commit;
- wdrożony commit i środowisko;
- otwarte ryzyka i decyzje;
- ostatnią zaakceptowaną dostawę;
- test/review/deployment evidence;
- obserwowany wynik po wdrożeniu;
- koszt i czas od założenia do wyniku;
- kolejną legalną akcję;
- możliwość odtworzenia całego łańcucha z Paperclip issue.

Bez takiej karty wynikowej autonomia będzie optymalizować aktywność i produkcję dokumentów, a nie dostarczanie działającego software'u.

## 10. Priorytety

### P0 — przed aktualizacją

- nie wykonywać aktualizacji na żywej instancji;
- zabezpieczyć niezacommitowane zmiany Paperclipa;
- wykonać i przetestować restore pełnej bazy;
- przygotować manifest migracji oraz mapę kolizji 0099–0122;
- zamrozić dokładny commit i konfigurację działającego runtime;
- naprawić fałszywe oczekiwanie globalnego sandbox bypass w audycie ustawień.

### P1 — jakość autonomii

- domknąć canary blockers i project markers;
- naprawić lub zoptymalizować endpoint heartbeat runs;
- ujednolicić populacje task dashboard/list;
- wymagać typed evidence dla wszystkich nowych `done`;
- zwiększyć konwersję observation → decision → intervention → promoted learning;
- połączyć runy i koszt z delivery/outcome;
- ograniczyć span of control i nadmiar ról koordynacyjnych.

### P1 — repozytoria produktów

- Soar: zintegrować gałąź porządkową, ustalić deployed/source SHA i ograniczyć generowany stan;
- Featherly: rozstrzygnąć konwergencję 37/7 commitów i zakres Exchange connection;
- Roost: zamknąć dwa pliki generowane i przejrzeć gałęzie;
- dla wszystkich: automatycznie zapisywać Paperclip issue ID i evidence URL w commit/PR lub work product;
- nie wykonywać masowego history rewrite na obecnym etapie.

### P2 — aktualizacja Paperclipa

- przeprowadzić funkcja-po-funkcji analizę lokalne vs upstream;
- wybrać stabilny tag docelowy;
- zbudować gałąź integracyjną i most migracyjny;
- wykonać próbę na kopii bazy oraz shadow run;
- dopiero po dowodach zaplanować cutover i rollback.

## 11. Ocena dojrzałości

Ocena jest jakościowa i służy priorytetyzacji, nie jest metryką kontraktową.

| Wymiar | Ocena | Uzasadnienie |
|---|---:|---|
| Topologia i granice runtime | 8/10 | ścisłe porty, pojedyncze katalogi, działające audyty |
| Mechanizmy kontroli i governance | 7/10 | rozbudowane gates, nadzór, decyzje, budżety |
| Kompletność instrukcji agentów | 8/10 | kompletna, lecz zbyt ciężka i trudna w utrzymaniu |
| Domknięcie wykonania do wyniku | 4/10 | bardzo dużo runów, bardzo mało formalnych dostaw/wyników |
| Uczenie organizacyjne | 4/10 | 129 obserwacji, ale tylko 1 promocja i 1 zweryfikowana interwencja |
| Obserwowalność i spójność danych | 5/10 | dashboardy istnieją, lecz występują timeouty i różne populacje |
| Gotowość do bezpiecznej aktualizacji | 2/10 | kolizje migracji, duży overlap, żywy dirty tree |
| Higiena repozytoriów produktów | 4/10 | realny kod jest wartościowy, lecz Soar/Roost są zalane stanem i gałęziami |

Całościowo system jest zaawansowanym laboratorium sterowania autonomiczną organizacją, a nie jeszcze powtarzalną linią produkcyjną softwarehouse. Następny wzrost jakości powinien pochodzić z uproszczenia, walidacji i domykania wyników, nie z dokładania kolejnych agentów lub kolejnych warstw raportowania.

## 12. Zakres dowodów i ograniczenia audytu

W audycie wykonano inspekcję Git, runtime, bazy przez dostępne API, konfiguracji użytkownika, automatyzacji, skryptów topology/workspace/source-control/project-truth oraz produkcyjnych probe'ów trzech produktów. Nie wykonano mutacji danych ani wdrożeń.

Nie wykonano pełnego `pnpm test`, repo-wide typecheck/build ani testowego restore bazy, ponieważ celem tego przebiegu była diagnoza i raport, a działająca instancja korzysta z bieżącego, brudnego drzewa. Istniejący raport projektu deklaruje 44/44 przechodzące testy ukierunkowane, lecz jest to dowód zastany, a nie test niezależnie powtórzony w tym audycie.

Stan upstreamu i działającej instancji jest migawką z 2026-08-08. Przed rozpoczęciem projektu aktualizacyjnego należy ponownie zamrozić commity i wygenerować delta od tej migawki.

