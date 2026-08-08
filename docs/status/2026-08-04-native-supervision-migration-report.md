# Raport migracji natywnego nadzoru Paperclipa

Data dowodów: 2026-08-04  
Instancja: LuckySparrow Software House, `http://127.0.0.1:3200`, PostgreSQL `54329`  
Company ID: `ae26bb8b-8f5f-4a85-b341-78d4e1985975`

## Ocena wykonawcza

Natywny rdzeń został uruchomiony i cztery automatyzacje Codex przestawiono na read-only owner
assurance. Nie ma drugiego backlogu ani drugiego systemu naprawczego. Nie ogłaszam jednak pełnego
zakończenia pierwszego etapu: live Daily wykrył dwa rzeczywiste problemy, pełna macierz kontroli z
briefu nie jest jeszcze zaimplementowana, brak szeregu czasowego dla spadku kosztu na outcome, a
staged migration istniejących 39 agentów do nowych klas uprawnień wymaga dalszej obserwacji.

Stan: **rdzeń aktywny, shadow/assurance aktywne, akceptacja całego etapu warunkowa**.

### Aktualizacja po remediacji 2026-08-04

Oba findingi opisane w pierwotnym odczycie zostały naprawione i zamknięte przez verified safeguard
oraz passed observation window:

- `orphan_task`: `LUC-2453` anulowano jako zakończoną fixturę, a `LUC-2472` przeszło ścieżkę
  AIA → COO i zakończyło się zaakceptowanym wynikiem `LUC-2523`. Live count zadań wykonywalnych bez
  właściciela wynosi 0. API odrzuca nowe ownerless `todo`/`in_progress` kodem 422; nieprzypisana
  propozycja ma pozostać w `backlog`.
- `review_bottleneck`: wszystkie 14 starych spraw mają aktywny `request_confirmation` albo
  `ask_user_questions`, czyli oczekują na właściciela, a nie na brakującego reviewera. Detektor
  liczy teraz tylko stare `in_review` bez pending decision path; live count wynosi 0. Dodatkowy gate
  odrzuca ponowne pozostawienie przez agenta sprawy w `in_review`, gdy poprzednia ścieżka decyzji
  została już zużyta.

Dwa duplikaty delegacji (`LUC-2521`, `LUC-2522`) zostały anulowane, a `LUC-2523` pozostaje
kanonicznym, zakończonym wynikiem COO. Duplikaty powstały przez nałożenie automatycznego wake po
assignment z dodatkowym ręcznym invoke; procedura operatora nie wykonuje obu triggerów naraz.

## 1. Co przeniesiono do Paperclipa

- PostgreSQL jest source of truth dla findingów, nawrotów, root causes, safeguards, cykli,
  interwencji, evidence, observation windows i porównań shadow.
- Natywny scheduler uruchamia restart-safe Watchdog, Daily Integrity i Weekly Meta.
- Watchdog i Daily wykonują kontrole deterministyczne bez LLM.
- Finding wymagający diagnozy może uruchomić Doctor event-driven dopiero po admission.
- Każdy run przy claimie otrzymuje trwałe `admissionDecisionId`.
- Assignment jest ograniczony do bezpośredniego dziecka albo admitted ProductDelivery fast path.
- Wprowadzono raportowanie w górę, work proposals, bounded context builder oraz sześć klas
  uprawnień.
- Closure root cause jest atomowo blokowane bez verified safeguard i passed observation window.

JSON pozostał wyłącznie jako zgodnościowa ścieżka rollbacku. Natywny zapis nie wykonuje dual-write.

## 2. Co nadal wykonują zewnętrzne automatyzacje

Automatyzacje odczytują natywny snapshot, wykonują ograniczone niezależne kontrole, zapisują tylko
shadow comparison i powiadamiają Patryka przy failed run lub trwałym krytycznym external-only
sygnale. Nie mutują boardu, agentów, routines, admission, deploymentu, kodu ani registry.

- `paperclip-watchdog`: co 6 godzin, owner assurance runtime/metryk.
- `paperclip-operational-doctor`: raz dziennie, falsyfikacja natywnego Doctor; bez napraw.
- `paperclip-daily-integrity-audit`: raz dziennie, niezależne sprawdzenie integralności.
- `paperclip-weekly-meta-architecture-review`: raz w tygodniu, maksymalnie trzy rekomendacje.

Break-glass wymaga jawnej decyzji właściciela. Awaria core lub krytyczny external-only utrzymany
przez dwa cykle kończy się informacją do Patryka, nie automatyczną równoległą naprawą.

## 3. Nowe natywne routines i services

- `supervision-registry`: transakcyjny lifecycle, dedupe, retention, recovery i snapshot.
- `native-supervision-engine`: bucketed scheduler, expired-cycle recovery, Watchdog/Daily/Weekly.
- `run-context-builder`: minimalny, source-attributed packet z token/file budget.
- istniejący active-run output-silence watchdog zapisuje teraz natywne findingi i nawroty.
- event-driven Doctor: finding → admission → jedna zmiana → jeden test → rollback requirement.

Live Watchdog wykonał trzy kolejne cykle z wynikiem 3/3, bez findingów i z `llmCalls: 0`.
Live Daily wykonał 10 kontroli: 8 pass, 2 fail, 2 findingi, `llmCalls: 0`. Weekly pracował
wyłącznie na agregatach i zwrócił jeden priorytet przy limicie trzech.

Ograniczenie: nowa warstwa nie obejmuje jeszcze całej listy kontroli z briefu. W szczególności
część health/deadlock/fan-out/evidence/documentation/permission checks nadal istnieje w innych
serwisach lub audytach, ale nie jest jeszcze skonsolidowana jako strukturalny wynik jednego cyklu.
Nowy Watchdog nie wdraża jeszcze wszystkich dozwolonych automatycznych reakcji, np. maintenance i
zatrzymania pojedynczej routine.

## 4. Modele bazy

Dodano company-scoped tabele:

- `supervision_findings`
- `supervision_root_causes`
- `supervision_interventions`
- `supervision_cycles`
- `native_safeguards`
- `supervision_recurrences`
- `supervision_observation_windows`
- `supervision_evidence_refs`
- `supervision_shadow_comparisons`

Modele mają versioning, indeksy, klucze deduplikacji, relacje, retention i archiwizację. Migracje
`0114`, `0115` i `0116` zostały zastosowane na kanonicznej bazie. Snapshot API deklaruje
`sourceOfTruth: postgresql` i nie jest zapisem sterującym.

Kontrolowany live proof utworzył i zamknął lifecycle:

- finding `7857af3e-61bb-4ad0-8dd5-c2b948af8142`
- root cause `f12b0521-5e3c-4fd9-990b-1337a79def3e`
- safeguard `8b545679-7132-4b36-b684-b8465f12e30f`
- observation window `67651b86-af79-4432-ac0d-27762caa0b3f`

Zamknięto dokładnie jeden kontrolowany finding; zapis jest retained do 2027-08-04.

## 5. Permission graph

Kanoniczne klasy to:

| Klasa | Przeznaczenie |
|---|---|
| `read_only` | AIA, PM, przyszły CEO level 1 |
| `project_write` | wykonawca we własnym projekcie/workspace |
| `review_test` | review i test, bez domyślnej naprawy |
| `integration` | zatwierdzona integracja |
| `deployment` | zatwierdzone deploymenty |
| `system_maintenance` | oddzielnie audytowane utrzymanie control plane |

Legacy values są czasowo normalizowanymi aliasami. Nowy Codex agent ma bypass domyślnie wyłączony;
bypass jest dopuszczalny tylko dla `system_maintenance` w local-trusted. Migracja istniejących
agentów jest celowo etapowa, nie wykonano masowego rewrite’u 39 konfiguracji.

## 6. Admission coverage

Enqueue zapisuje decyzję admission, a claim ponownie ocenia stan i aktualizuje
`heartbeat_runs.admission_decision_id` przed przejściem do running. Retry i starszy queued run mogą
nie mieć decyzji przed claimem, ale nie mogą bez niej wystartować. Doctor tworzy intervention tylko
z admission reference.

Nie jest jeszcze spełniona literalna wersja wymagania, aby każdy run miał osobne kolumny dla
`workProposalId` i `assignmentProposalId`; obecny durable link to admission oraz issue/delivery.
Manual board pozostaje objęty istniejącą władzą board i audytem, ale nie wprowadzono w tym etapie
nowego czasowego tokenu break-glass.

## 7. Hierarchy validation

Backend egzekwuje direct-child assignment, projekt, delivery scope, maksymalną głębokość, fan-out,
pętle rodziców, ownera i acceptance criteria. Lateral assignment wykonawcy jest odrzucany. Fast path
jest dostępny tylko w admitted ProductDelivery, bez zmiany projektu, scope lub budżetu i z wymaganym
review.

## 8. Delegation i reporting flow

W dół płyną assignment proposal, scope, budżet, acceptance criteria, reviewer i delegation path.
W górę płyną `delegation_reports` z wynikiem, evidence, blockerem, kosztem, ryzykiem i outcome.
Agent-leaf korzysta z `work_proposal`, blockera lub eskalacji do rodzica. Test direct-parent/upward
reporting jest zielony.

## 9. Review i correction routing

Delivery posiada osobny review gate i niezależnego reviewera. `CHANGES_REQUIRED` wraca przez
rodzica do pierwotnego wykonawcy; reviewer nie otrzymuje domyślnego prawa do poprawiania kodu.
Emergency fix pozostaje wyjątkiem wymagającym jawnego grantu i późniejszego niezależnego review.

Live evidence potwierdza niezależne review w obu canary outcomes. Pełnej żywej pętli
`CHANGES_REQUIRED → correction → re-review` nie odtworzono ponownie w tym wdrożeniu; jest to
pozostały scenariusz obserwacyjny.

## 10. Context builder

Packet zawiera role/parent/children/permissions/reporting/escalation, project/repo/workspace/source
of truth oraz task/outcome/scope/criteria/budget/owner/reviewer/evidence/rollback/admission. Historia
jest domyślnie wyłączona, stale packet jest przebudowywany, źródła są wskazywane referencjami.
Przekroczenie token lub file budget kończy się fail-closed 422. Doctor dostaje limit 6000 tokenów i
8 plików.

## 11. Sandbox migration

Wdrożono klasy, aliasy migracyjne, nowe defaults per role i ograniczenie bypassu. To jest etap
infrastrukturalny. Nie wykonano jeszcze sekwencji controlled task dla każdej istniejącej roli ani
certyfikacji wszystkich kompetencji. Proces kompetencji i pełny lifecycle tworzenia/scalania/
archiwizacji agentów oraz routines pozostają kolejnym etapem, a nie ukrytą deklaracją ukończenia.

## 12. Wyniki testów i audytów

Targeted suites: **105 testów pass**:

- admission/assignment/quota: 78
- active-run watchdog: 14
- supervision registry: 4
- native supervision engine: 3
- context builder: 3
- permission classes: 2
- restart/recovery: 1 (56 pozostałych scenariuszy w pliku świadomie pominięto filtrem)

Dodatkowo:

- `pnpm -r typecheck`: pass; pierwsza próba przekroczyła 120 s, procesy potomne zostały dokładnie
  zidentyfikowane i zakończone, powtórzenie zakończyło się pass w 128,4 s.
- `pnpm build`: pass w 153,2 s; istniejące ostrzeżenia CSS/chunków bez błędów.
- workspace boundary audit: pass, 4 dozwolone singleton roots, 0 failures.
- runtime topology audit: pass, jedna usługa Paperclip na 3200, embedded PostgreSQL 54329,
  0 failures.

Pełnego `pnpm test:run` nie zaliczono w tym etapie; wcześniejsza próba szerokiego embedded-DB runu
przekroczyła 20 minut. Nie przedstawiam timeoutu jako pozytywnego testu.

Scenariusze objęte dowodami: runaway/retry/quota, stalled admitted work, direct-child/lateral
hierarchy, context fail-closed, restart dedupe/retry oraz dwa outcomes. Nie ma jeszcze nowego live
proof pełnej correction loop.

## 13. Dwa autonomiczne outcomes

1. Paperclip hierarchical canary — project `87c2482a-b8ca-4aa0-a2a5-c67cc33d703a`, delivery
   `958bd60d-d2c2-4bc2-a110-6ffd1f0e4170`, stage `outcome_accepted`, direct-child delegation,
   upward report, niezależne review i lokalny deployment/health evidence.
2. Soar hierarchical canary — project `cbf0e2d7-73ea-4448-8b0b-c6bdbf4cf63d`, delivery
   `8c797cd3-1bf3-40c3-8b2a-e17a51a91d48`, stage `outcome_accepted`, admitted proposal, upward
   report, niezależny reviewer i zero hierarchy violations.

Są to dwa różne projekty bez zewnętrznego „Teachera”. Canary były jednak read-only/local control
plane proof; nie należy ich mylić z nowym wdrożeniem funkcji produktu Soar. Osobno istnieje wcześniejszy
Soar production canary `fa972393…`.

## 14. Quota i koszt per outcome

Weekly odczytał 3 accepted outcomes, `cost_cents: 0` i `costPerAcceptedOutcomeCents: 0`.
Quota testy pokrywają warning, throttle i hard hold bez bypassu. Brakuje historycznego szeregu z
dodatnimi kosztami, więc nie można uczciwie dowieść trendu „quota per outcome spada”. Obecny wynik
jest punktem bazowym, nie trendem.

## 15. Nawroty

Każde wystąpienie ma osobny recurrence row, a finding zachowuje occurrence/recurrence count.
Pierwszy live Daily utworzył po jednym wystąpieniu `orphan_task` i `review_bottleneck`; nie ma jeszcze
drugiego cyklu Daily, więc recurrence count obu wynosi 0. Stabilne fingerprinty umożliwią porównanie
w następnym dniu bez duplikowania findingów.

## 16. Różnice native/external findings

Shadow comparison `06990d79-ce98-4b1e-b888-0028f5451504` ma status `attention_required`:

- matched: `review_bottleneck`
- only native: `orphan_task`
- only external: `external:owner-metric-integrity-check`
- severity mismatches: 0

Porównanie nie utworzyło external backlogu ani nowego findingu. External-only wymaga kolejnego
niezależnego cyklu i dopiero trwały krytyczny sygnał ma eskalować do Patryka.

## 17. Automatyzacje przechodzące do shadow/owner assurance

Wszystkie cztery pozostają aktywne, ale już jako assurance:

- Watchdog: 00:10, 06:10, 12:10, 18:10
- Operational Doctor assurance: 13:40 codziennie
- Daily Integrity assurance: 09:20 codziennie
- Weekly Meta assurance: niedziela 21:20

Każda ma `notificationPolicy: failed_runs_only`, primary-core declaration i zakaz mutacji. Faza
audit-only lub częściowe wyłączenie może nastąpić dopiero po okresie obserwacji recurrence, kosztu i
native/external coverage.

## 18. Co wymaga decyzji Patryka

1. **Dwa realne findingi:** wskazać właściciela dla 2 orphan tasks oraz zdecydować o priorytecie
   rozładowania 14 stale review items. System celowo nie przypisał ich samowolnie.
2. **Zakres akceptacji:** zatwierdzić shadow jako stan przejściowy, ale nie pełne zamknięcie etapu,
   dopóki przynajmniej drugi Daily nie pokaże nawrotów/ustąpienia.
3. **Admission provenance:** zdecydować, czy V2 ma dodać do każdego runu bezpośrednie
   `workProposalId` i `assignmentProposalId`, ponad obecny admission/issue/delivery link.
4. **Pełna macierz Watchdoga:** zatwierdzić drugi bounded delivery konsolidujący brakujące checks i
   bezpieczne reakcje circuit-breaker/maintenance/routine-stop.
5. **Permission rollout:** wybrać pierwszą istniejącą rolę do live migracji i observation window;
   rekomendowane PM/AIA → `read_only`.
6. **Koszt:** ustalić mierzalne źródło kosztu i minimalny okres trendu; przy samych zerach nie da się
   udowodnić spadku kosztu na outcome.
7. **Assurance cadence:** utrzymać proponowane częstotliwości przez co najmniej dwa tygodnie, a
   potem zdecydować o audit-only lub częściowym wyłączeniu.

## Rollback i następny gate

Rollback pozostaje etapowy i odwracalny: wyłączyć native scheduler, zachować tabele/evidence,
przywrócić poprzednią częstotliwość automatyzacji, a zgodnościowy JSON reader wykorzystać tylko do
odzysku. Nie cofać migracji danych i nie włączać dual-write.

Następny gate akceptacyjny powinien wymagać: rozwiązania albo jawnego accepted risk dla obu live
findingów, drugiego Daily, nowej live correction loop, kontrolowanej migracji jednej roli,
poszerzenia strukturalnej macierzy watchdog checks oraz mierzalnego trendu koszt/outcome.
