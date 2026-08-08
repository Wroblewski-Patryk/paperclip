# Paperclip Autonomy Evolution — Iteracja 3

## Executive Summary

Iteracja 3 zmieniła Paperclip z systemu, który głównie widzi kolejkę, w system, który potrafi wyjaśnić następną legalną akcję i oddzielić wykonalność od wartości. Zmiana jest potwierdzona w aktywnym runtime `127.0.0.1:3200`: 114 otwartych nierutynowych zadań otrzymało deterministyczną projekcję Next Legal Action, dawny agregat `60 blocked_unknown` został rozłożony na 59 znanych zależności i 1 konflikt stanu, a bieżące ograniczenie organizacji zostało rozpoznane jako `dependency` z 61 elementami.

Najważniejszym wynikiem nie jest liczba nowych klas, lecz zawężenie pola legalnego działania. Spośród 11 zadań `READY_FOR_EXECUTION` tylko jedno ma jednocześnie `valueState=valuable_now` i `constraintEffect=helps_current_constraint`. Shadow scheduler wskazał `LUC-1972` z wysoką pewnością, ale nie wykonał dispatchu. To poprawny fail-closed rezultat: system ma wiarygodnego kandydata, lecz nie ma jeszcze obserwacji postcondition i niezależnej oceny false-positive/false-negative potrzebnej do limited-auto.

Paperclip posiada teraz natywny, audytowalny pas `Observe → Reconcile → Verify`, wykrywa trzy konflikty Task↔Outcome, nie zamyka ich automatycznie i traktuje brak pokrycia sensora jako `UNKNOWN`, a nie `healthy`. Telemetria ekonomiczna rozróżnia `COST=0` od `COST_UNKNOWN`: accepted outcomes przy łącznym reported cost równym zero tworzą lukę sensoryczną zamiast fałszywego KPI koszt/outcome.

Konserwatywna dojrzałość pozostaje **5,8/10**. Runtime udowodnił nową epistemikę, reconciliation i shadow selection, ale nie udowodnił jeszcze bezpiecznego autonomicznego dispatchu ani zamknięcia realnego outcome. Podnoszenie wyniku za sam kod byłoby sprzeczne z mandatem.

## Technical Summary

- Dodano company-scoped endpoint `GET /api/companies/:companyId/next-legal-actions` oraz wspólny kontrakt typów dla klas działania, eligibility, epistemic state, dowodów, constraint effect i shadow decision.
- Projekcja jest pochodna od kanonicznych tabel issues, agents, dependencies, holds, approvals, thread interactions, runs, deliveries i outcomes. Nie powstał drugi backlog ani równoległy registry stanu.
- Readiness zależności respektuje stan blokera oraz typed ProductOutcome. Zakończony task bez zaakceptowanego wyniku nie jest traktowany jako gotowa zależność.
- Accepted outcome połączony z nieterminalnym taskiem daje `RECONCILIATION_REQUIRED`; brak wystarczającego evidence daje konflikt/eskalację, nigdy automatyczne zamknięcie.
- Cykl supervision przechowuje rozkład Next Legal Actions, blocked reasons, current constraint, liveness, shadow dispatch i strukturalny internal control lane z idempotency key, timeoutem, retry policy, concurrency protection i audit ref.
- Wymagane sensory homeostasis mają jawne identyfikatory. Brak sensora daje `unknown`; stan `critical` ma pierwszeństwo, gdy istnieje rzeczywista awaria.
- Orphan lock i cost telemetry mają natywne fingerprinty oraz aliasy porównawcze dla niezależnego external assurance.

## Queue Epistemology

Snapshot: aktywny runtime, cykl `native_watchdog:2026-08-08T18:40`, 114 otwartych nierutynowych issues.

| State | Count | Meaning | Confidence |
|---|---:|---|---|
| WAITING_FOR_DEPENDENCY | 61 | co najmniej jeden blocker lub jego typed outcome nie jest gotowy | high dla zarejestrowanych relacji |
| WAITING_FOR_DECISION | 37 | istnieje pending structured review interaction; to decision path, nie anonimowy brak review | high |
| READY_FOR_EXECUTION | 11 | owner, zależności i policy gate są lokalnie spełnione | high lokalnie; tylko 1 valuable now |
| RECONCILIATION_REQUIRED | 3 | task jest nieterminalny, lecz połączony outcome został zaakceptowany | high |
| HELD_BY_POLICY | 1 | aktywny issue-tree hold blokuje wykonanie | high |
| WAITING_FOR_OWNER | 1 | przypisany owner nie jest dostępny | high |
| INVALID_STATE / epistemic unknown | 0 | brak niewyjaśnionych blockerów w tym snapshotcie | high dla aktualnego odczytu |

### Blocked Reason Distribution

| Reason | Before | After | Interpretation |
|---|---:|---:|---|
| dependency | nieznane w agregacie | 59 | znane relacje blokujące |
| conflicting_state | nieznane w agregacie | 1 | konflikt Task↔Outcome/state wymagający reconciliation |
| unknown | 60 w `blocked_unknown` | 0 | obecny snapshot nie zawiera epistemicznie niewyjaśnionego blockera |

Redukcja `unknown` nie oznacza usunięcia blokad. Oznacza, że blokady stały się klasyfikowalne i mogą otrzymać właściwego ownera oraz legalną następną akcję.

## Next Legal Actions

| Action class | Eligibility | Required action | Primary guard |
|---|---|---|---|
| READY_FOR_EXECUTION | eligible | ACT | owner available, dependencies ready, no hold/approval conflict |
| READY_FOR_REVIEW | eligible | REVIEW | review evidence ready and decision lane available |
| WAITING_FOR_DEPENDENCY | ineligible | WAIT | blocker/outcome readiness |
| WAITING_FOR_OWNER | ineligible | ASSIGN | owner availability |
| WAITING_FOR_EVIDENCE | ineligible/unknown | PROVIDE_EVIDENCE | typed evidence completeness |
| WAITING_FOR_DECISION | ineligible | DECIDE | structured pending interaction |
| HELD_BY_POLICY | ineligible | HOLD | issue-tree hold or governed approval |
| BLOCKED_BY_CONFLICT | ineligible | RECONCILE | cycle or contradictory cross-state facts |
| OUTCOME_ALREADY_SATISFIED | ineligible | VERIFY | accepted outcome with compatible task state |
| RECONCILIATION_REQUIRED | ineligible | RECONCILE | accepted outcome with nonterminal task |
| INVALID_STATE | unknown | ESCALATE | insufficient typed explanation |
| TERMINAL | ineligible | NONE | terminal issue state |

Priority nie jest jednym score. Projekcja zachowuje declared priority, goal link, unblock value, age, constraint effect i listę powodów. Dzięki temu system może powiedzieć „runnable, ale nie valuable now” bez arbitralnej matematyki.

## Current Constraint and Liveness

| Measure | Runtime value | Meaning |
|---|---:|---|
| Current constraint | dependency: 61 | największa koncentracja otwartej kolejki |
| Formally READY_FOR_EXECUTION | 11 | lokalnie legalne do wykonania |
| Eligible valuable work | 1 | pomaga bieżącemu constraintowi |
| Held | 1 | jawnie zatrzymane polityką |
| Unexplained idle | 1 | istnieje bezpieczny kandydat, lecz scheduler pozostaje w shadow |
| Dispatch attempts | 0 | brak mutacji wykonawczej |
| Accepted dispatches | 0 | brak postcondition do oceny |
| Scheduler no-op reason | SHADOW_CANDIDATE_EXISTS | kontrolowany no-op, nie cicha bezczynność |
| Execution scheduler active agents | 0 | nie ma aktywnego owner heartbeat; to źródło dispatch critical |
| Native supervision scheduler | active | cykl `18:40Z` zakończył się audytowalnym wynikiem |

Shadow candidate: `LUC-1972 — [Soar][Product-UX] Close NO-GO owner decision-support acceptance gaps for ac0dc341`. Ma high confidence, `unblockValue=1`, goal link i `helps_current_constraint:dependency`. Nie ma danych pozwalających policzyć false positives/false negatives, ponieważ nie wykonano dispatchu i external oracle nie ocenił wyboru kandydata.

## Cross-State Reconciliation

| Signal | Detected | Auto-resolved | Requires review | Remaining |
|---|---:|---:|---:|---:|
| Task nonterminal + accepted ProductOutcome | 3 | 0 | 3 | 3 |
| Evidence insufficient for safe task closure | covered by guard | 0 | all affected | unchanged |

System nie wybiera arbitralnie jednej maszyny stanów jako „prawdziwszej”. Accepted outcome jest silnym faktem biznesowym, ale task może wymagać oddzielnego udokumentowania, anulowania lub terminal reconciliation. Automatyczna mutacja byłaby możliwa dopiero po zdefiniowaniu evidence-backed transition rule i obserwacji jej skutków.

## Native Observe → Reconcile → Verify Lane

Cykl supervision ma własny, strukturalny pas wewnętrzny:

1. `Observe`: 12 deterministycznych checks, 0 LLM calls.
2. `Reconcile`: freshness reconciliation findings oraz 3 cross-state conflicts.
3. `Verify`: homeostasis coverage i verified intervention count.

Kontrakt operacyjny: owner `native_supervision`, scheduler trigger, 15-min timeout, retry `next_bounded_cycle`, idempotency `native_watchdog:<window>`, concurrency protection przez unikalność source/external cycle id oraz trwały `auditRef` do supervision cycle. Nie jest to nowa Routine; to wewnętrzny control lane, aby supervision nie konkurował sam ze sobą w kolejce produktowej.

Snapshot `18:40Z`: runtime health `healthy`; dispatch, evidence i supervision health `critical`. Dispatch health jawnie pokazuje missing sensor `review_bottleneck`, ale istniejący failed count powoduje `critical`, nie `unknown`. Gdy wymagany sensor jest nieobecny bez bardziej konkretnego failure, wynik jest `unknown`, nigdy false-green.

## Cost Telemetry Truth

Nowa reguła ekonomiczna jest fail-closed:

- accepted outcomes = 0: brak podstawy do KPI koszt/outcome;
- accepted outcomes > 0 i sum(reported cost) = 0: `COST_UNKNOWN`;
- dopiero accepted outcomes > 0 i wiarygodny dodatni reported cost: koszt może być interpretowany jako known.

Samo istnienie rekordu `cost_event` o wartości zero nie wystarcza. Regresja potwierdza przypadek accepted outcome + zero-valued event → `cost_telemetry` failed. Live cykl wykrył 4 accepted outcomes przy zerowym reported cost i utworzył high-severity finding `cost_telemetry_gap:<company>`. Dotyczy to łącznego raportowania tokenów, model calls, runtime, external API i compute; obecny ledger pokrywa tylko część tych składowych, więc KPI `cost per accepted outcome` pozostaje niedojrzały.

## Shadow Dispatch Evaluation

| Measure | Value | Evidence state |
|---|---:|---|
| Proposed candidates | 1 | observed |
| Deterministically rejected alternatives | 0 after constraint filter | observed |
| Executed dispatches | 0 | observed |
| Oracle accepted | not evaluated | unknown |
| False positives | not measurable | unknown |
| False negatives | not measurable | unknown |
| Limited-auto enabled | no | explicit decision |

Przejście do limited-auto wymaga serii shadow decisions z niezależną oceną, kontrolowanego observation window, mierzalnego dispatch postcondition, retry ceiling, rollback/hold path i braku nowych external-only critical gaps. Jedna poprawnie wyglądająca propozycja nie spełnia tego progu.

## External Assurance Parity

Końcowy snapshot `iteration3-final-shadow-20260808T184139790Z`, powiązany z native cycle `6020a7f6-002b-4b98-a152-14b63d4e079c`, ma status `aligned`. External fingerprints `evidence_completeness` i `cost_telemetry_zero_with_accepted_outcomes` zostały znormalizowane do native `evidence_completeness:<company>` i `cost_telemetry_gap:<company>`: matched 2/2, `onlyExternal=0`, `severityMismatch=0`. Native-only wynosi 21, ponieważ zewnętrzny oracle badał tylko dwie klasy; to nie jest utrata native coverage. Orphan execution lock jest zachowany jako natywna klasa i test regresyjny; w bieżącym runtime liczba orphan locks wynosi 0, więc nie jest sztucznie utrzymywana jako aktywne finding.

Finding `external_assurance_gap` utworzony przez wcześniejsze, niealigned porównanie pozostaje aktywny do następnego bounded reconciliation cycle. To oczekiwane opóźnienie freshness, nie bieżący external-only gap; następny cykl powinien go automatycznie rozwiązać na podstawie najnowszego aligned snapshotu.

External comparison pozostaje oracle o węższym pokryciu niż native supervision. `onlyNative` nie jest błędem parity, jeśli external run celowo bada tylko wybrane klasy. Retirement wymaga serii świeżych, aligned comparisons, nie pojedynczego snapshotu.

## Codex Intervention Debt

| Intervention class still requiring Codex | Why Paperclip cannot safely own it yet | Retirement evidence |
|---|---|---|
| Calibracja semantic priority | brak outcomes łączących wybór z wartością | longitudinal shadow/dispatch/outcome series |
| Włączenie limited-auto | brak oracle labels i postcondition history | bounded canary with zero unsafe dispatches |
| Cross-machine reconciliation policy | nie ma jednej uniwersalnej legalnej mutacji | typed per-conflict transition rules + review evidence |
| Ekonomiczny backfill | reported cost nie pokrywa wszystkich źródeł | source completeness checks and nonzero trusted ledger |
| External assurance retirement | brak wielodniowego aligned window | zero external-only critical/high across agreed window |
| Learning promotion backlog | 105 proposed lessons wymaga typed disposition | evidence thresholds and promotion/expiry reasons |

## External Assurance Debt

- Niezależny scheduler/oracle nadal jest potrzebny do oceny shadow selection, orphan-lock parity i cost/evidence truth.
- Alias parity musi pozostać wersjonowany; nazwa external check nie może tworzyć fałszywego `onlyExternal`, gdy capability native już istnieje.
- External findings muszą mieć freshness. Stary sygnał orphan lock nie powinien przetrwać po natywnym clean snapshot.
- Retirement nie może opierać się wyłącznie na `onlyExternal=0`; potrzebny jest czas obserwacji, zgodność severity i dowód działania natywnej pętli.

## Updated 25 Capability Matrix

Oceny podniesiono tylko tam, gdzie istnieje runtime evidence. Skala 0–5: 0 brak, 1 kontrakt/eksperyment, 2 zalążek, 3 działająca część, 4 dojrzały mechanizm z dowodem, 5 zamknięta i utrzymywana capability.

| # | Capability | Status | Maturity | Change | Runtime evidence / main gap | Priority |
|---:|---|---|---:|---:|---|---|
| 1 | Purpose, goals, constraints | PARTIAL | 3.3 | 0.0 | goal link jest częścią priority, ale brak pełnej strategii/targetów | P1 |
| 2 | Cybernetic control | PARTIAL | 3.9 | +0.2 | native Observe→Reconcile→Verify działa; brak realnego safe dispatch outcome | P0 |
| 3 | Observability | PARTIAL | 3.7 | +0.2 | jawne sensor coverage/UNKNOWN; coverage infrastruktury nadal niepełne | P0 |
| 4 | World model | PARTIAL/MISPLACED | 2.8 | 0.0 | operacyjny model bez pełnego Roost world state | P0 |
| 5 | Memory architecture | PARTIAL/DUPLICATED | 3.0 | 0.0 | brak unified retrieval/promotion/expiry | P1 |
| 6 | Causal memory | PARTIAL | 3.6 | 0.0 | reconciliation działa, lecz 0 nowych verified interventions | P0 |
| 7 | Planning | PARTIAL | 3.1 | +0.3 | dependency-aware NLA i valueState; brak strategic replanner | P1 |
| 8 | Organization & delegation | PARTIAL | 3.8 | 0.0 | owner availability jest typowana; brak ciągłej role quality | P1 |
| 9 | Quality system | PARTIAL | 3.6 | +0.1 | outcome/task guard i evidence checks; 246 evidence failures pozostaje | P0 |
| 10 | Epistemic system | PARTIAL | 4.0 | +0.5 | known/unknown/conflict, confidence i evidence refs działają w runtime | P0 |
| 11 | Risk & autonomy boundaries | PARTIAL | 3.9 | +0.1 | shadow-only gate poprawnie blokuje premature auto | P1 |
| 12 | Anti-Goodhart | PARTIAL | 3.5 | +0.3 | COST_UNKNOWN i cross-state truth; outcome sample nadal ubogi | P0 |
| 13 | Theory of Constraints | PARTIAL | 3.1 | +0.4 | current constraint=dependency i ranking subordinate-to-constraint | P1 |
| 14 | Multi-agent coordination | PARTIAL | 4.2 | +0.1 | dependency/cycle/owner readiness; brak global invariant proof | P1 |
| 15 | Idempotency | PARTIAL | 4.3 | +0.1 | internal lane ma trwały key i concurrency protection | P1 |
| 16 | Transactions/rollback/recovery | PARTIAL | 3.2 | 0.0 | projection jest read-only; nadal brak general saga | P1 |
| 17 | Resilience engineering | PARTIAL | 4.0 | +0.1 | timeout/retry/fail-closed lane; nierówne subsystem circuit breakers | P1 |
| 18 | Antifragility | PARTIAL | 3.4 | 0.0 | brak nowej zamkniętej intervention→learning pętli | P1 |
| 19 | Resource economics | PARTIAL | 3.6 | +0.1 | truth gate poprawiony, ale cost coverage nie pozwala optymalizować | P1 |
| 20 | Attention management | PARTIAL | 3.8 | +0.7 | 60 opaque blockers → 59 dependency + 1 conflict + 0 unknown | P1 |
| 21 | Event-driven architecture | PARTIAL/DUPLICATED | 3.5 | 0.0 | nadal timer/scheduler heavy | P1 |
| 22 | Homeostasis | PARTIAL | 3.7 | +0.5 | healthy/warning/critical/unknown z sensor coverage w live cycle | P1 |
| 23 | Meta-control | PARTIAL/DUPLICATED | 3.4 | +0.2 | external aliases/freshness i native lane; brak process retirement proof | P1 |
| 24 | Exploration vs exploitation | EMERGENT | 2.6 | +0.2 | shadow dispatch jest eksperymentem; brak oracle labels/canary execution | P2 |
| 25 | Institutional learning | PARTIAL | 2.9 | 0.0 | 105 proposed nadal bez masowej typed disposition | P0 |

## New Fundamental Capability Layers

Nie należy sztucznie wciskać wszystkich odkryć w stare 25.

| Proposed capability | Disposition | Why |
|---|---|---|
| Queue Epistemology & Next Legal Action | **new first-class capability** | Łączy legality, eligibility, evidence, dependency readiness i constraint-relative value. Planning opisuje „co zamierzamy”, a ta warstwa dowodzi „co wolno i warto zrobić teraz”. |
| Cross-State Reconciliation | **new first-class capability** | Nie jest zwykłą jakością danych. Utrzymuje spójność wielu maszyn stanu bez arbitralnego nadpisywania i wymaga osobnych legal transition rules. |
| Meta-Observability Contract Integrity | **sub-capability Observability + Homeostasis** | Jest fundamentalna, ale jej obiektem są sensory istniejących pętli; osobna top-level warstwa dublowałaby obserwowalność. Powinna mieć własne testy i score. |
| Scheduler Liveness & Dispatch Correctness | **sub-capability Cybernetic Control + ToC** | Liveness jest własnością control loop, a nie niezależnym systemem. Wymaga jednak osobnego SLO, no-op vocabulary i shadow oracle. |

## Remaining P0/P1 Gaps

### P0

1. Udowodnić dispatch closed loop na bounded canary: selection → wake/run → postcondition → independent verification → rollback/hold.
2. Domknąć 3 cross-state conflicts z typed evidence i bez manualnego zgadywania.
3. Zredukować 246 evidence failures lub jawnie sklasyfikować historyczny debt; nie traktować legacy done jako green.
4. Ustanowić wiarygodne cost coverage przed opublikowaniem cost/outcome.
5. Nadać 105 learning candidates typed dispositions i udowodnić kolejną bezpieczną promocję.
6. Utrzymać external assurance, dopóki seria comparison windows nie pokaże braku external-only critical/high.

### P1

1. Dodać pełny sensor `review_bottleneck` do skróconego watchdog contractu albo jawnie usunąć go z wymaganej listy.
2. Zbudować owned decision paths dla 37 `WAITING_FOR_DECISION` i zmierzyć czas do rozstrzygnięcia.
3. Rozwinąć dependency constraint w exploit→subordinate→elevate→repeat z ownerem i SLO.
4. Dodać durable history shadow decisions i oracle labels, nie tylko latest snapshot.
5. Uzupełnić orphan lock parity o regularny external clean signal, zamiast polegać na braku finding.
6. Ujednolicić sensory tokens/model calls/runtime/external API/compute w cost coverage contract.

## Autonomy Maturity

**5,8/10 — bez zmiany wyniku ogólnego.**

Wzrosła jakość modelu sytuacji: queue epistemology, Next Legal Action, cross-state reconciliation, liveness i meta-observability mają runtime evidence. Nie wzrosła jednak zdolność organizacji do samodzielnej zmiany świata: dispatch pozostał shadow, accepted dispatches wynoszą 0, konflikty reconciliation pozostają otwarte, a cost telemetry jest epistemicznie niepełna. To uzasadnia poprawę kilku capability sub-scores, ale nie overall maturity.

Próg do następnej oceny powinien być behawioralny: co najmniej jeden bounded dispatch wybrany przez tę projekcję, zakończony legalnym postcondition, niezależnie zweryfikowany, bez nowego P0 finding i z poprawnym outcome/cost evidence.

## Verification and Robustness

- `next-legal-action.test.ts`: 10/10 pass, w tym dependency readiness, state/outcome reconciliation, deadlock cycle, priority bez score, UNKNOWN sensor, shadow selection i embedded-Postgres integration.
- `native-supervision-engine.test.ts`: 14/14 pass, w tym false-green guard, finding freshness, control loop, dispatch constraints i accepted outcome + zero cost event → telemetry gap.
- `supervision-registry-service.test.ts`: 5/5 pass, w tym external alias parity dla orphan lock i cost telemetry.
- `company-situation-service.test.ts`: 4/4 pass.
- `@paperclipai/shared typecheck`: pass.
- `@paperclipai/server typecheck`: pass.
- `softwarehouse:runtime-topology-audit`: pass dla strict `3200`/`54329`; Docker inventory unavailable było ostrzeżeniem, nie dowodem awarii.
- Live health i company-scoped endpoint: pass.

Nie uruchomiono repo-wide build/test po wszystkich istniejących, niezwiązanych zmianach w dirty worktree. Zastosowano najmniejsze wystarczające, sekwencyjne pakiety zgodne z Windows resource safety. Nie uruchomiono browser suites, ponieważ zmiana nie dodaje UI.

## Recommended Next Steps

1. Przez ustalone observation window zapisywać każdy shadow decision razem z oracle verdict i rzeczywistym późniejszym wyborem operatora.
2. Jeśli false-positive/false-negative pozostaną w limicie, uruchomić jeden low-risk canary dispatch z hard stop, one-shot idempotency key i verify postcondition.
3. Zamknąć trzy `RECONCILIATION_REQUIRED` przez typed per-case resolution evidence; dopiero potem rozważać automatyczną klasę reconciliation.
4. Zbudować cost coverage ratio per source i blokować cost/outcome KPI, gdy którykolwiek obowiązkowy kanał jest unknown.
5. Utrzymać 25-capability matrix dla porównywalności, ale od następnej iteracji raportować dodatkowo dwie nowe capability: Queue Epistemology/NLA oraz Cross-State Reconciliation.

## Further Questions for the Next Architectural Analysis

1. Jaki minimalny observation window i próg oracle agreement powinien otworzyć limited-auto?
2. Czy reconciliation Task↔Outcome ma preferować terminal `done`, `cancelled`, czy osobny stan `outcome_satisfied`, i jakie evidence jest wymagane dla każdej ścieżki?
3. Czy `WAITING_FOR_DECISION` powinno mieć osobne klasy `READY_FOR_REVIEW` i `WAITING_FOR_EXTERNAL_DECISION` według rodzaju interaction?
4. Które cost sources są obowiązkowe dla stanu `known`, a które tylko informacyjne?
5. Czy dependency constraint ma otrzymać first-class owner/SLO, czy pozostać pochodną CompanySituation?
6. Jak przechowywać oracle verdicts tak, aby nie tworzyć drugiego backlogu ani reward-hacking targetu?
