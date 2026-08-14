# Dashboard Paperclipa — instrukcja redesignu UX/UI

Data: 2026-08-14
Zakres: `ui/src/pages/Dashboard.tsx`, `ui/src/components/InnovationCommandCenter.tsx` oraz dane dashboardowe
Cel: zmienić dashboard z katalogu informacji w ekran operatorski, który w 10 sekund odpowiada na trzy pytania:

1. Czy Paperclip działa zdrowo?
2. Co wymaga reakcji właściciela?
3. Co autonomiczne zespoły robią teraz i czy praca zmierza w dobrym kierunku?

## 1. Diagnoza obecnego widoku

Materiał audytowy: [`docs/dashboard-audit-current.png`](../../docs/dashboard-audit-current.png).

Obecny dashboard ma dobre, spójne wizualnie komponenty, ale jego hierarchia nie odpowiada ważności informacji:

- `Agent availability` zajmuje pełną szerokość mimo stabilnego stanu `ON`.
- Niedostępny snapshot `Innovation portfolio` zajmuje jeden z największych obszarów nad zgięciem ekranu, choć nie daje użytkownikowi działania.
- Krytyczna informacja `81 blocked issues` ma podobną wagę wizualną jak zdrowe zera.
- `39 enabled agents`, `0 running`, `163 open` i `0 work in progress` nie tworzą jednej, zrozumiałej diagnozy.
- `Owner queue` pokazuje liczniki, lecz nie podaje przyczyny, wieku, wpływu, właściciela ani następnego działania.
- Najważniejsze dane o pracy, trendach i powodzeniu wykonań znajdują się dopiero niżej i wymagają przewijania.
- `Recent Activity` jest chronologicznym strumieniem zdarzeń, a nie listą zdarzeń istotnych dla operatora.
- Wykres `Success Rate` pokazuje dzień bez uruchomień jako `0%`, co może wyglądać jak awaria zamiast braku próby.
- Brakuje jednego, jednoznacznego stanu całego systemu i wspólnego znacznika świeżości danych.

Wniosek: dashboard powinien być zoptymalizowany pod wyjątki, decyzje i zmianę stanu, a nie pod prezentowanie wszystkich dostępnych modułów.

## 2. Docelowa hierarchia informacji

Kolejność od góry:

1. **Stan ogólny i świeżość** — jednozdaniowa diagnoza, np. `Paperclip is online; delivery is constrained by 81 blocked issues.`
2. **Needs attention** — maksymalnie 3–5 najważniejszych problemów, posortowanych według wpływu i pilności.
3. **System health** — API, baza danych, scheduler, runtime, event stream, evidence freshness i quota.
4. **Operational pulse** — tylko KPI potrzebne do oceny przepływu: live runs, success rate, WIP, blocked, quota.
5. **Live & recent work** — kompaktowa tabela aktualnej i niedawnej pracy agentów.
6. **Trend i anomalie** — jeden łączony wykres zamiast czterech równorzędnych miniwykresów.
7. **Kontekst drugorzędny** — innovation portfolio, activity i historyczne listy w niższej części lub w zwijanych modułach.

## 3. Specyfikacja sekcji

### 3.1 Nagłówek operatorski

W jednym wierszu umieścić:

- tytuł `Dashboard`;
- badge stanu: `Healthy`, `Needs attention`, `Degraded` albo `Unavailable`;
- wspólny czas obserwacji, np. `Observed 2m ago`;
- stan auto-refresh;
- kompaktową kontrolkę `Agents ON/OFF`.

Pełny panel `Agent availability` rozwijać dopiero dla stanów `draining`, `off`, `reopening`, błędu albo pracy odroczonej. Stabilne `ON` nie powinno zajmować osobnego modułu.

### 3.2 Needs attention

To jest główny moduł strony. Każdy wiersz musi zawierać:

- priorytet/severity;
- nazwę problemu;
- krótką przyczynę opartą na danych;
- wpływ (`81 issues`, `3 projects`, `8 agents`);
- wiek problemu i świeżość dowodu;
- właściciela;
- sugerowane następne działanie;
- link prowadzący od razu do przefiltrowanego widoku.

Przykładowa kolejność dla obecnego stanu:

1. `81 blocked issues` → `Review blocked work`.
2. `14 runnable issues unassigned` → `View & assign`.
3. `8 agents paused` → `Review constraints`.
4. `Project truth unavailable` → `Open control cockpit`.

Zera nie powinny tworzyć osobnych rzędów. Zwinąć je do komunikatu `No approval or budget incidents`.

### 3.3 System health

Pokazać 6–7 kompaktowych sygnałów:

- API;
- database;
- scheduler/heartbeat queue;
- runtime/workspace services;
- event stream/live updates;
- evidence/project-truth freshness;
- provider quota.

Każdy sygnał: `status`, `last observed`, opcjonalnie jedna wartość diagnostyczna. Kolor czerwony tylko dla potwierdzonej awarii; brak lub stary dowód powinien być bursztynowy/neutralny, nie zielony.

### 3.4 Operational pulse

Pozostawić maksymalnie pięć komórek:

- `Live runs`;
- `Success rate (14d)` wraz ze zmianą względem poprzedniego okresu;
- `Work in progress`;
- `Blocked` wraz ze zmianą i najstarszym wiekiem;
- `Provider quota used` wraz z resetem.

Każda liczba musi mieć kontekst. Nie pokazywać samego `0`, jeśli oznacza ono różne rzeczy. Przykład: `0 live runs — queue has 14 runnable unassigned issues`.

### 3.5 Live & recent work

Zastąpić cztery duże karty wykonań zwartą tabelą. Kolumny:

- agent i status sygnału;
- issue/task;
- stan wykonania;
- czas trwania;
- ostatni sygnał;
- evidence/recovery status.

Domyślnie pokazać aktywne wykonania, potem anomalie, potem ostatnie zakończone. Transkrypt pozostawić w szczególe runu lub w rozwijanym wierszu.

### 3.6 Trend i anomalie

Połączyć `Run Activity` i `Success Rate` w jeden wykres 14-dniowy:

- throughput jako słupki lub linia;
- success rate jako druga linia;
- widoczny próg celu;
- adnotacje dla anomalii i zmian kontroli;
- brak wykonań prezentować jako `No runs`, a nie `0% success`.

`Issues by Priority` i `Issues by Status` przenieść do widoku Issues lub pokazywać na żądanie. Na dashboardzie ważniejsze są trend, ograniczenia i następne działanie.

### 3.7 Innovation portfolio

Gdy snapshot jest niedostępny, pokazać tylko kompaktowy pasek stanu z linkiem do rozwiązania problemu. Pełną tabelę projektów renderować dopiero, gdy zawiera aktualne i użyteczne dane.

## 4. Zasady UX i UI

- Zachować `Card` / `.paperclip-surface`, semantyczne tokeny i komponenty `Identity`, `StatusBadge`, `StatusIcon`.
- Hierarchię budować spacingiem, typografią, kolejnością i dividerami; nie mnożyć kart i cieni.
- Turkus oznacza aktywność lub główną akcję, zielony zdrowie, bursztynowy uwagę, czerwony potwierdzoną awarię.
- Zdrowe zera mają niski kontrast. Problemy o dużym wpływie muszą być widoczne bez szukania.
- Wszystkie moduły muszą mieć jeden logiczny nagłówek i jasny cel kliknięcia.
- Nie dublować tej samej liczby w kilku miejscach bez dodania nowego kontekstu.
- Linki z alertów powinny zachowywać filtr i prowadzić do stanu gotowego do działania.
- Użytkownik klawiatury musi przechodzić najpierw przez stan ogólny, kolejkę decyzji i główne działanie, a dopiero później przez analitykę.

## 5. Potrzebne dane i kontrakty

Obecny `DashboardSummary` wystarcza do prostych liczników, ale nie do ekranu decyzji. Dodać projekcję `DashboardAttentionItem`:

```ts
interface DashboardAttentionItem {
  id: string;
  kind: string;
  severity: "info" | "warning" | "critical";
  title: string;
  reason: string;
  affectedCount: number;
  ownerLabel: string | null;
  firstObservedAt: string | null;
  lastObservedAt: string;
  freshness: "fresh" | "stale" | "unknown";
  action: { label: string; href: string };
}
```

Dodatkowo dashboard potrzebuje:

- zbiorczego `overallHealth` z jawnym powodem;
- `observedAt` dla całej projekcji;
- health checks z epistemicznym stanem (`healthy`, `degraded`, `failed`, `unknown`);
- zmian okres-do-okresu dla KPI;
- wieku najstarszego blokera i grupowania blockerów według przyczyny;
- danych o ostatnim sygnale agentów;
- rozróżnienia `no runs` od `0% success`.

Logika priorytetu powinna być deterministyczna i serwerowa, aby kolejność problemów była spójna między dashboardem, Inboxem i supervision.

## 6. Responsywność

- **≥1400 px:** kolejka uwagi 2/3 + health 1/3; niżej tabela pracy + trend.
- **1024–1399 px:** health przechodzi pod kolejkę; KPI pozostają w 2–3 kolumnach.
- **<768 px:** jednozdaniowy status, jedna główna akcja, lista alertów; tabele przechodzą w zwarte wiersze, a analityka jest niżej.
- Nie ukrywać krytycznych alertów na mobile. Ukrywać szczegóły pomocnicze, nie decyzję ani jej powód.

## 7. Dostępność

- Stan nie może być komunikowany wyłącznie kolorem; używać ikony i tekstu.
- `aria-live="polite"` dla zmiany ogólnego statusu i świeżości, bez ogłaszania każdego ticka auto-refresh.
- Widoczny focus ring i minimum 44 px wysokości dla głównych działań na touch.
- Tabela pracy musi mieć poprawne nagłówki, a sortowanie czytelne dla screen readera.
- Wykres musi mieć tekstowe podsumowanie i dostępne etykiety danych.
- Kontrast tekstu pomocniczego i bursztynowych stanów sprawdzić w obu motywach.

## 8. Kolejność wdrożenia

1. Dodać serwerową projekcję stanu ogólnego, health checks i attention items.
2. Skompaktować nagłówek oraz stabilny `Agent availability`.
3. Zbudować `NeedsAttentionPanel` i `SystemHealthPanel`.
4. Uzupełnić KPI o trendy i opis stanu.
5. Zastąpić karty runów tabelą `LiveAndRecentWork`.
6. Połączyć wykres throughput + success i poprawić semantykę dni bez wykonań.
7. Zdegradować puste portfolio i chronologiczny activity feed do sekcji drugorzędnych.
8. Dodać nowe komponenty do `/design-guide` i indeksu komponentów.

## 9. Kryteria akceptacji

- W pierwszym viewportcie widać stan ogólny, świeżość, top 3 problemy, system health, KPI oraz bieżącą pracę.
- `81 blocked issues` ma większą wagę niż zdrowe zera i prowadzi do przefiltrowanej listy.
- Każdy problem ma powód, wpływ, wiek, właściciela i następne działanie.
- Stabilne `Agents ON` nie zajmuje pełnej szerokości.
- Brak wykonań nie jest prezentowany jako `0% success`.
- Stary lub brakujący dowód nie może wyglądać jak zdrowy stan.
- Widok działa klawiaturą, przy zoomie 200% i na szerokości mobilnej bez utraty krytycznych informacji.
- Nowe komponenty używają wspólnych powierzchni Paperclipa i są pokazane w `/design-guide`.

## 10. Materiały wizualne

- [`01-dispatch-center.png`](../../docs/dashboard-redesign-options/01-dispatch-center.png)
- [`02-exception-first.png`](../../docs/dashboard-redesign-options/02-exception-first.png)
- [`03-mission-control.png`](../../docs/dashboard-redesign-options/03-mission-control.png)

Rekomendowany punkt wyjścia: wariant 1, uzupełniony o jednozdaniową diagnozę z wariantu 3. Daje najlepszy balans między szybką reakcją, obserwowalnością i gęstością zgodną z Paperclipem.
