# AUTONOMY EVOLUTION REPORT — ITERACJA 4

**System:** LuckySparrow Paperclip, company `ae26bb8b-8f5f-4a85-b341-78d4e1985975`  
**Okno końcowej obserwacji:** 2026-08-08 19:10–19:11 UTC  
**Kanoniczny runtime:** `http://127.0.0.1:3200`, embedded PostgreSQL `54329`  
**Główny runtime proof:** supervision cycle `4e14e7c5-6306-4e34-a1dd-d5ef9019dc8c`  
**Decision Record:** `e4302b3c-bd03-4122-82f7-9d06eb0e688b`  
**Zakres:** Iteracja 4, bez ponownego szerokiego audytu

## A. Executive state

Paperclip otrzymał pierwszą trwałą warstwę decyzji autonomicznej i uruchomił ją w natywnej pętli `Observe → Reconcile → Decide → Act → Verify`. Wynik nie jest jeszcze Autonomous Canary Delivery Loop: jest wiarygodnym, runtime-udowodnionym **Autonomous Canary Decision Loop** z poprawnym fail-close przed wykonaniem.

Najważniejszy rezultat to nie dispatch. System prawidłowo odmówił dispatchu LUC-1972 mimo `READY_FOR_EXECUTION`, ponieważ:

- linked goal ma status `achieved`;
- issue source był stary o około 139,5 h;
- zakres jest wieloetapowy i ma risk `medium`;
- execution cost coverage jest `UNKNOWN`;
- Decision confidence wyniósł `0.46`;
- envelope dla `dispatch_existing_issue` pozostaje `SHADOW`.

Kontrolowany POST dispatch zwrócił `409` z `autonomy_envelope_not_authorized`; nie powstał żaden `autonomy_execution` ani heartbeat run. Trzy istniejące konflikty Task↔Outcome zamknięto indywidualnie z typed completion evidence. W świeżym watchdogu `task_outcome_reconciliation=0` i finding został zreconciliowany.

Ocena końcowa: **Iteracja 4 zbudowała warstwę decyzji, ale świadomie nie udowodniła jeszcze wykonania canary ani jakości outcome.**

## B. Current constraint

Current constraint pozostaje `dependency`:

| Pole | Runtime value |
|---|---:|
| WAITING_FOR_DEPENDENCY | 61 |
| Blocked issues sklasyfikowane jako dependency | 59 |
| Wszystkie zapisane dependency edges | 262 |
| Open non-terminal issues | 129 |
| Constraint owner | COO / Softwarehouse Operations Director `0ec1a36b-0fe5-46ed-9c31-3b32201c8327` |
| Evidence refresh SLO | 5 min |
| Acknowledge SLO | 15 min |
| Resolution target | 24 h |

Constraint ma first-class rekord `e25ac034-b288-4d53-8caf-e867bd29ccd8`, affected issue set, evidence, proposed response `smallest_safe_unblock`, `doNotIncreaseWip=true` i resolution criteria. Owner odpowiada za redukcję constraintu i przepływ, nie za osobiste rozwiązanie wszystkich 61 zależności.

## C. Decision architecture

Wdrożono pięć company-scoped struktur:

1. `operational_constraints` — constraint, owner, evidence, affected issues, response, SLO i resolution criteria.
2. `autonomy_envelopes` — per-action-class scope, stage, risk, budget, concurrency, allowed actions, rollback i graduation.
3. `autonomy_decisions` — candidate set, selected action, rejected alternatives, state digest, evidence TTL, invalidation, Expected Outcome Contract i późniejszy wynik.
4. `autonomy_decision_evaluations` — attached oracle/evaluator verdict bez drugiego backlogu.
5. `autonomy_executions` — idempotent dispatch/execution/outcome/cost postconditions.

Decision vector nie jest jednym score:

| Layer | LUC-1972 |
|---|---|
| Eligibility | `eligible` — owner/dependencies/policy przechodzą |
| Constraint relevance | `helps` — unblock value 1 względem dependency constraint |
| Organizational value | `low` — linked goal już `achieved` |
| Risk | `medium` — delegacja i wieloplatformowy evidence scope |
| Cost | coverage `UNKNOWN`, owner-history estimate 0 cents nie jest wiarygodnym execution cost |
| Opportunity cost | `low` — brak drugiego valuable-now candidate |
| Confidence | `0.46` — goal achieved, source age i cost unknown obniżają pewność |

Nie zapisano chain-of-thought. Zapisano warstwy, reason codes, evidence refs i expected postconditions.

## D. Candidate decision set

Queue miała 11 `READY_FOR_EXECUTION`, lecz po constraint-relative value filtering tylko jeden `valuable_now` candidate:

| Rank | Issue | Candidate state | Unblock | Decision | Powód |
|---:|---|---|---:|---|---|
| 1 | LUC-1972 / `e9c20331-9507-4f3b-ac25-4a7549349e89` | READY_FOR_EXECUTION | 1 | GATHER_EVIDENCE | achieved goal, 139,5 h source age, medium risk, UNKNOWN cost |

Nie było porównywalnego high-value alternative po constraint alignment. To nie czyni LUC-1972 automatycznie wartościowym; brak alternatywy nie usuwa negatywnych warstw organizational value/risk/confidence.

## E. Shadow evaluation

Native decision:

- mode: `SHADOW`;
- disposition: `GATHER_EVIDENCE`;
- reason: `EVIDENCE_OR_VALUE_REVALIDATION_REQUIRED`;
- confidence: `0.46`;
- risk: `medium`;
- evidence TTL: 5 min, odświeżany bez tworzenia sztucznego nowego sample;
- invalidation: issue/owner/dependency/policy/goal/priority/evidence/duplicate changes.

Attached Codex evaluation `b0373d6f-289e-436c-beb0-a4d881f88a0b` ma verdict `agree`. `actualOutcomeQuality=null`: oracle agreement nie zostało użyte jako dowód powodzenia.

## F. Autonomy envelope

Envelope `12515a11-e53a-4daf-b3cc-04af3164d0c7` dotyczy wyłącznie action class `dispatch_existing_issue`.

| Stage | Stan | Authority |
|---|---|---|
| SHADOW | **active** | persistent decision, zero dispatch |
| RECOMMEND | inactive | recommendation bez mutacji po spełnieniu shadow thresholds |
| LIMITED_AUTO | inactive | tylko low-risk existing local issue, max 1 run, max concurrency 1, rollback required |
| AUTO | inactive | nieudowodnione i nieprzyznane |

Graduation metrics: 2 distinct state digests, 1 evaluation, oracle agreement 1.0, mean confidence ~0.46, 0 unsafe, 0 verified outcomes. Minimum do `RECOMMEND` nie jest spełnione (`5` distinct samples, agreement ≥0.8, confidence ≥0.8). `LIMITED_AUTO` dodatkowo wymaga co najmniej 3 verified recommended outcomes i success rate ≥0.8. Unsafe verdict lub outcome success <0.8 downgraduje action class do `SHADOW`.

## G. Canary execution

**Nie wystąpił.** Jest to właściwy wynik gate, nie brak aktywności.

LUC-1972 nie został checkoutowany, obudzony ani uruchomiony. System nie użył nazwania issue w mandacie jako execution authority. Przed realnym canary potrzebne są co najmniej:

1. świeże owner confirmation, że praca pozostaje potrzebna mimo `goal=achieved`;
2. rozbicie/ograniczenie wieloetapowego zakresu do low-risk envelope;
3. wiarygodny predicted cost albo jawna board policy dla `UNKNOWN` cost;
4. próbki i outcome history wymagane przez graduation.

## H. Dispatch postcondition

Dwa dowody są rozdzielone:

- native control lane: `NOT_AUTHORIZED / EVIDENCE_OR_VALUE_REVALIDATION_REQUIRED`;
- kontrolowany endpoint probe: HTTP `409`, `{status:"FAILED", reason:"autonomy_envelope_not_authorized"}`.

`autonomy_executions=0`. Nie ma niejawnego `ACCEPTED`, `UNCERTAIN`, wake request ani run. Dla przyszłego authorized path zapis execution jest tworzony w `SERIALIZABLE` transaction po advisory lock, row lock i ponownym sprawdzeniu issue, owner, dependencies, dependency outcomes, holds, interactions, approvals, outcome conflict, concurrency, freshness, priority selection i budget.

## I. Execution postcondition

Nie dotyczy tego canary, ponieważ dispatch nie został zaakceptowany. System nie zamienił `dispatch failed/not authorized` na execution failure.

Kontrakt dla przyszłych prób osobno zapisuje run status, issue terminal state i stall/liveness. Obecna implementacja reconciliation obsługuje terminal run/task, ale task-class-specific stall windows pozostają luką.

## J. Outcome verification

Nie powstał nowy Outcome i nie ma claimu sukcesu. Expected Outcome Contract został zapisany przed potencjalnym wykonaniem i wymaga:

- accepted dispatch z idempotency evidence;
- terminal run albo typed blocker;
- accepted ProductOutcome albo jawne nonachievement;
- niezależnego verification confidence;
- kosztu sklasyfikowanego jako KNOWN_ZERO/NONZERO/PARTIAL/UNKNOWN.

Runtime nadal ma 4 accepted outcomes, z czego tylko 1 ma typed acceptance predicates. Watchdog prawidłowo zgłasza `outcome_predicates=3` zamiast green.

## K. Predicted vs actual impact

| Dimension | Predicted | Actual | Calibration state |
|---|---|---|---|
| Unblock value | 1 | n/a — no execution | no sample |
| Cost | UNKNOWN; weak owner mean 0 cents | n/a | no sample |
| Risk | medium | 0 incidents because no dispatch | safety result, nie delivery result |
| Outcome | bounded owner run + evidence + outcome/blocker | n/a | no sample |
| Constraint count | 61 | 61 | no causal claim |

Nie wolno interpretować braku incydentu po niedispatchowaniu jako potwierdzenia trafności predicted outcome.

## L. Dependency graph state

Aktualny NLA nie wykrył dependency cycle (`organizational_dependency_cycle=0`). Największe jawne unblock nodes:

| Blocker | Status | Open downstream |
|---|---|---:|
| LUC-1900 | in_review | 5 |
| LUC-1910 | blocked | 3 |
| LUC-1779 | in_review | 2 |
| LUC-1977 | blocked | 2 |
| LUC-2055 | in_review | 2 |

Najstarsze aktywne dependency paths:

| Target ← blocker | Age (h) | States |
|---|---:|---|
| LUC-1511 ← LUC-1729 | 461,1 | blocked ← blocked |
| LUC-1716 ← LUC-1779 | 400,6 | blocked ← in_review |
| LUC-1729 ← LUC-1779 | 399,8 | blocked ← in_review |
| LUC-1833 ← LUC-1910 | 355,2 | blocked ← blocked |
| LUC-1895 ← LUC-1910 | 316,3 | blocked ← blocked |

Pierwsza operational response powinna koncentrować się na LUC-1900/LUC-1910/LUC-1779 i najstarszym chain LUC-1511↔LUC-1729, a nie na zwiększaniu upstream WIP.

## M. Reconciliation state

Trzy przypadki zostały zamknięte indywidualnie:

| Issue | Before | Outcome evidence | After | Reason |
|---|---|---|---|---|
| LUC-2514 | todo | accepted Paperclip hierarchy canary + independent LUC-2515 review | done | `outcome_accepted_delivery_ledger_complete` |
| LUC-2517 | todo | accepted Soar read-only hierarchy canary + governed assignment/review | done | `outcome_accepted_delivery_ledger_complete` |
| LUC-2527 | blocked | 10/10 predicates at exact deployed Roost SHA | done | `outcome_satisfied_by_linked_delivery` |

Każdy dostał własny comment i typed completionEvidence. LUC-2527 ma high-risk TEST/REVIEW/DOCS/SECURITY/DEPLOY/MONITORING evidence. LUC-2528 pozostawiono jako osobny record. Fresh watchdog: `task_outcome_reconciliation=0`, `crossStateConflicts=0`, 1 finding reconciled.

## N. Cost coverage

Historyczny Cost Coverage Ratio dla terminal heartbeat runs:

- terminal runs: 27 629;
- terminal runs z co najmniej jednym linked cost event: 21 260;
- ratio: **76,95%**;
- monetary sum: 0 cents;
- accepted outcomes: 4.

Stan: **PARTIAL**, nie `KNOWN_ZERO`. Samo istnienie 21 260 eventów z sumą 0 nie dowodzi zerowego kosztu organizacji; 23,05% terminal runs nie ma linked eventu, a provider/model billing semantics mogą być niepełne. Cost coverage pozostaje niezależne od outcome quality i blokuje cost-based autonomous optimization, nie zamyka dobrych outcome jako złych.

## O. Internal control lane health

Fresh cycle `4e14e7c5-6306-4e34-a1dd-d5ef9019dc8c`:

| Stage | Runtime result |
|---|---|
| Observe | completed, 12 checks |
| Reconcile | completed, 1 finding resolved, 0 cross-state conflicts |
| Decide | completed, SHADOW/GATHER_EVIDENCE, confidence 0.46 |
| Act | no_mutation / NOT_AUTHORIZED |
| Verify | completed; runtime healthy, dispatch/evidence/supervision critical |

`active_routines=0`, ale minimal control lane jest aktywny jako native scheduler, nie jako sztuczna routine. Cycle ma trwały key `native_watchdog:2026-08-08T19:10`, timeout 15 min i unique concurrency protection.

## P. External dependency

External Codex pozostaje assurance/evaluator, nie backlog owner. Latest external shadow gap check ma `0` i native check jest pass, ale to pojedyncza obserwacja, nie retirement proof. External retirement nadal wymaga serii okien bez external-only critical/high, severity mismatches i false-green.

Decision evaluation przez Codex była potrzebna jako pierwszy oracle label. Nie zastąpiła runtime Outcome ani nie zmieniła envelope stage.

## Q. Codex intervention debt

Ta iteracja nadal wymagała bezpośredniej pracy Codex do:

- zaprojektowania i wdrożenia schema/service/routes/tests/docs;
- nadania pierwszego oracle label;
- indywidualnego reconciliation trzech legacy cases;
- interpretacji, że achieved goal i stale evidence obniżają wartość LUC-1972.

Native runtime samodzielnie wykonał później projection → constraint → decision → no-op act → verify. Dług pozostaje wysoki dla code evolution, policy calibration, legacy evidence repair i pierwszej rekomendowanej/limited-auto outcome history.

## R. Learning

Najważniejsze poznawcze wyniki:

1. `READY_FOR_EXECUTION` nie oznacza `worth doing now`.
2. Brak alternatywy nie jest dowodem wartości wybranego candidate.
3. Goal status musi wpływać na decision, nie tylko na priority link.
4. Evidence freshness ma dotyczyć obserwacji i source update osobno; ten sam state digest może odświeżyć TTL bez tworzenia nowego graduation sample.
5. Negacyjne scope clauses (`no production`, `no credentials`) nie mogą sztucznie podnosić risk; risk parser został skorygowany.
6. Oracle agreement i Outcome success muszą pozostać odseparowane.
7. Reconciliation obniżyło evidence-free done debt z 246 do 240 i usunęło 3 konflikty, ale nie naprawiło 3 legacy untyped accepted outcomes.

## S. Failures / regressions

Nie wykryto regresji w targeted contract tests. Wyniki:

- `@paperclipai/shared typecheck` — pass;
- `@paperclipai/db typecheck` + migration numbering — pass;
- `@paperclipai/server typecheck` — pass;
- autonomy decision safety — 9/9;
- next legal action — 10/10;
- native control contract — 1/1;
- native supervision engine — 14/14;
- łącznie targeted tests — 34/34;
- migration `0119_sad_kitty_pryde` — applied live;
- workspace boundary audit — pass;
- strict runtime topology audit — pass (`3200`, `54329`, singleton roots).

Jeden zbiorczy test command przekroczył 124 s i nie jest liczony jako pass; wszystkie jego zestawy uruchomiono potem osobno. Nie uruchomiono pełnego repo-wide `pnpm test:run` ani build, ponieważ scope miał targeted evidence i host wymaga sekwencyjnej ochrony zasobów.

Runtime pozostaje czerwony w pięciu checkach: 21 active findings, 240 completion-evidence gaps, 3 untyped outcome predicates, 4 cost telemetry gaps i 11 runnable-dispatch gaps. `review_bottleneck` nadal jest brakującym sensorem skróconego dispatch-health contractu.

## T. Updated 25 capability matrix

Skala 0–5: 0 brak, 1 kontrakt, 2 zalążek, 3 działająca część, 4 mechanizm z runtime evidence, 5 zamknięta i utrzymywana capability. Wzrost przyznano tylko za live evidence Iteracji 4.

| # | Capability | Status | Maturity | Δ | Runtime evidence / main gap | Priority |
|---:|---|---|---:|---:|---|---|
| 1 | Purpose, goals, constraints | PARTIAL | 3.5 | +0.2 | achieved goal obniżył value i zablokował dispatch | P1 |
| 2 | Cybernetic control | PARTIAL | 4.1 | +0.2 | live Observe→Reconcile→Decide→Act→Verify; brak accepted execution | P0 |
| 3 | Observability | PARTIAL | 3.9 | +0.2 | decision refs, TTL, postconditions; sensor `review_bottleneck` missing | P0 |
| 4 | World model | PARTIAL/MISPLACED | 3.0 | +0.2 | constraint jest first-class; pełny Roost world state nadal brak | P0 |
| 5 | Memory architecture | PARTIAL/DUPLICATED | 3.1 | +0.1 | durable decisions/evals/executions; retrieval/promotion nadal rozproszone | P1 |
| 6 | Causal memory | PARTIAL | 3.7 | +0.1 | predicted/actual fields istnieją; 0 execution samples | P0 |
| 7 | Planning | PARTIAL | 3.5 | +0.4 | layered candidate decision działa; brak strategic replanner | P1 |
| 8 | Organization & delegation | PARTIAL | 3.9 | +0.1 | constraint ma COO owner i SLO; role quality nadal nieciągła | P1 |
| 9 | Quality system | PARTIAL | 3.9 | +0.3 | 3 conflicts zamknięte, fresh reconciliation=0; 240 legacy gaps | P0 |
| 10 | Epistemic system | PARTIAL | 4.3 | +0.3 | source age, observation TTL, confidence i attached oracle działają | P0 |
| 11 | Risk & autonomy boundaries | PARTIAL | 4.2 | +0.3 | envelope i HTTP 409 fail-close udowodnione | P1 |
| 12 | Anti-Goodhart | PARTIAL | 3.8 | +0.3 | high rank nie nadpisał value/risk; oracle ≠ outcome | P0 |
| 13 | Theory of Constraints | PARTIAL | 3.6 | +0.5 | first-class dependency record, owner, SLO, top unblock nodes | P1 |
| 14 | Multi-agent coordination | PARTIAL | 4.2 | 0.0 | graph/owner readiness działa; brak global invariant proof | P1 |
| 15 | Idempotency | PARTIAL | 4.4 | +0.1 | state digest, unique decision, execution key i cycle key | P1 |
| 16 | Transactions/rollback/recovery | PARTIAL | 3.6 | +0.4 | serializable recheck + advisory/row lock + rollback contract; no live execution | P1 |
| 17 | Resilience engineering | PARTIAL | 4.1 | +0.1 | decision invalidation/downgrade; task-class stall SLO brak | P1 |
| 18 | Antifragility | PARTIAL | 3.5 | +0.1 | learned risk-negation/freshness fixes; brak outcome-based closed loop | P1 |
| 19 | Resource economics | PARTIAL | 3.8 | +0.2 | 76,95% coverage policzone; sum=0 nadal niewiarygodna | P0 |
| 20 | Attention management | PARTIAL | 4.0 | +0.2 | 3 conflicts usunięte, current constraint i candidates rozdzielone | P1 |
| 21 | Event-driven architecture | PARTIAL/DUPLICATED | 3.5 | 0.0 | control lane nadal scheduler-based | P1 |
| 22 | Homeostasis | PARTIAL | 3.9 | +0.2 | live multi-stage lane, no-op act i honest critical dimensions | P1 |
| 23 | Meta-control | PARTIAL/DUPLICATED | 3.7 | +0.3 | per-class graduation/downgrade metrics; mało samples | P1 |
| 24 | Exploration vs exploitation | EMERGENT | 3.0 | +0.4 | shadow oracle + decision history; brak canary execution | P1 |
| 25 | Institutional learning | PARTIAL | 3.1 | +0.2 | attached eval i runtime lessons; masowy learning debt pozostaje | P0 |

## New capability layers — osobna ocena

| Capability layer | Status | Maturity | Runtime evidence | Fundamental gap |
|---|---|---:|---|---|
| Queue Epistemology & NLA | FIRST-CLASS / PARTIAL | 4.2 | 111 classified open non-routine actions, 0 unknown eligibility, typed evidence/freshness | value model nadal płytki i nie ma owner intent sensor |
| Cross-State Reconciliation | FIRST-CLASS / PARTIAL | 4.0 | 3→0 live conflicts, individual evidence, finding resolved | brak general transition planner i automated reviewer verdict |
| Decision Architecture | FIRST-CLASS / EMERGENT | 3.3 | durable vector, constraint, expected outcome, oracle, live Decision Record | tylko 2 digests, 1 eval, 0 actual outcomes |
| Autonomy Envelope / Graduation | FIRST-CLASS / EMERGENT | 2.8 | per-class SHADOW envelope i fail-closed dispatch endpoint | LIMITED_AUTO/AUTO nieuruchomione; brak outcome history |

## New fundamental gaps revealed by Decision Architecture

1. **Intent freshness gap.** Technicznie legalny issue może być organizacyjnie martwy, jeśli linked goal jest achieved, lecz owner intent nie został ponownie potwierdzony. Potrzebny jest typed `intent_valid_until`/owner reconfirmation, nie heurystyka na goal statusie.
2. **Graduation evidence bootstrap gap.** Shadow daje oracle labels, ale nie actual outcomes; LIMITED_AUTO wymaga outcomes. Potrzebny jest bezpieczny, jawnie board-authorized recommended-canary bridge, który nie omija per-class thresholds.
3. **Decision sample independence gap.** Kolejne cykle tego samego stanu nie są niezależnymi próbkami. State digest dedupe to naprawia ilościowo, ale nadal potrzebna jest definicja niezależności sytuacji, evaluatorów i klas tasków.
4. **Counterfactual gap.** Gdy system wybiera no-op, nie obserwuje outcome alternatywy. Oracle agreement nie mierzy kosztu utraconej szansy; potrzebne są bounded retrospective labels bez udawania causal truth.
5. **Verification-owner independence gap.** `native_supervision` może obserwować run i outcome, ale nie zawsze jest niezależne od wykonawcy/sensora. Expected Outcome Contract powinien wymagać sensor-independence class.
6. **Execution-stall policy gap.** Dispatch acceptance i execution liveness są rozdzielone, lecz brak task-class-specific progress windows i `UNCERTAIN` escalation SLO.
7. **Constraint causality gap.** `helps_current_constraint` jest prediction. Bez execution nie ma actual unblock; nawet po wykonaniu spadek count może mieć inne przyczyny. Potrzebny jest evidence-backed causal attribution poziomu `supported/ambiguous/contradicted`.
8. **Cost semantics gap.** 76,95% linked-event coverage z sumą 0 ujawnia, że completeness i monetary correctness są dwiema różnymi osiami. Jeden Cost Coverage Ratio nie wystarczy bez biller/provider/model semantic coverage.
9. **Priority interrupt gap.** Recheck wykrywa zmianę wybranego candidate, ale nie ma jeszcze first-class interrupt queue z severity/expiry i preemption rules dla już zaakceptowanego execution.
10. **Reversible learning gap.** Envelope downgrade działa, ale nie istnieje jeszcze automatyczny rollback policy dla zmiany decision modelu po błędnej kalibracji; dziś rollback dotyczy execution, nie learned policy.

## Evidence and reproducibility

Primary implementation sources:

- `packages/db/src/schema/autonomy.ts`
- `packages/db/src/migrations/0119_sad_kitty_pryde.sql`
- `packages/shared/src/types/next-legal-action.ts`
- `server/src/services/autonomy-decision.ts`
- `server/src/services/next-legal-action.ts`
- `server/src/services/native-supervision-engine.ts`
- `server/src/routes/supervision.ts`
- `server/src/__tests__/autonomy-decision.test.ts`

Primary runtime sources:

- supervision cycle `4e14e7c5-6306-4e34-a1dd-d5ef9019dc8c`;
- decision `e4302b3c-bd03-4122-82f7-9d06eb0e688b`;
- evaluation `b0373d6f-289e-436c-beb0-a4d881f88a0b`;
- envelope `12515a11-e53a-4daf-b3cc-04af3164d0c7`;
- constraint `e25ac034-b288-4d53-8caf-e867bd29ccd8`;
- live API/DB snapshot observed 2026-08-08 19:10–19:11 UTC.

This report is a bounded snapshot, not a promise that queue, runs, costs or constraints remain unchanged after the observation window.
