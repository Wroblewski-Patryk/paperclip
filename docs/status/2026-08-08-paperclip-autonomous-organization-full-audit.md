# Paperclip jako autonomiczna organizacja — pełny audyt stanu faktycznego

**Snapshot audytu:** 2026-08-08, Europe/Berlin  
**Instancja:** LuckySparrow, `http://127.0.0.1:3200`, PostgreSQL `54329`  
**Repo:** `codex/rolling-work-queue`, HEAD `e92e06c11e093f13fb421411448596e52646fa26`  
**Stan źródeł:** audyt obejmuje aktualny, brudny working tree; nowe mechanizmy supervision, quota i delivery są częściowo niezatwierdzonymi zmianami lokalnymi.  
**Cel:** materiał wejściowy dla kolejnej analizy GPT; nie jest planem wdrożeniowym ani zgodą na przebudowę.

## 1. Technical summary

Paperclip nie jest już tylko task managerem ani prostym frameworkiem multi-agentowym. Aktualny working tree zawiera realny control plane z atomowym checkoutem, trwałym runtime, admission, hierarchią delegacji, niezależnymi state machine dla task/delivery/outcome, budżetami, evidence gates, bounded context, persistent causal supervision i read-only projekcją do Roost. W kilku miejscach implementacja jest wyraźnie lepsza od pierwotnego opisu V1.

Najważniejszy pozytywny wynik to działająca, natywna pętla nadzoru: deterministyczny Watchdog, Daily Integrity, Weekly Meta, trwałe findings/root causes/safeguards/recurrences/observation windows, false-green prevention, event-driven Doctor po admission oraz ograniczone akcje dla orphan locks i ownerless executable work. Targeted verification w tym audycie zakończyło się wynikiem **44/44 testy pass w 10 plikach**.

Najważniejsze ograniczenie jest operacyjne, nie katalogowe. Live state pokazuje **21 findings** (2 critical, 17 high), w tym **240 historycznych issue `done` bez typed completion evidence**, **3 accepted outcomes bez pełnego typed predicate decision** i **5 klas luk widocznych w najnowszym external shadow, lecz niepokrytych natywnie**. Snapshot ma 3 root causes, 3 safeguards i 3 observation windows, ale **0 interventions**. Oznacza to, że Paperclip dobrze wykrywa odchylenia, lecz nie udowodnił jeszcze systematycznego domykania ich w działającej pętli przyczynowej.

Drugie ograniczenie to rozjazd między bogactwem mechanizmów a ich aktywnym użyciem. Instancja ma 37 zdefiniowanych rutyn, ale wszystkie są `paused` lub `archived`; część archiwalnych rekordów nadal ma `trigger.enabled=true`, choć status rutyny blokuje dispatch. Jednocześnie natywny supervision działa poza systemem routines jako timer serwera. To jest działające rozwiązanie, lecz utrudnia jeden spójny model sterowania i zwiększa ryzyko duplikacji.

Trzecie ograniczenie to „organizational learning backlog”: live API zwraca 128 organizational observations, w tym 105 learning candidates, lecz 113 wszystkich observations pozostaje `proposed`, a żadna learning observation nie ma statusu `promoted`. Pamięć istnieje, ale przejście lesson -> operating target -> verified safeguard nie jest jeszcze normalnym, domykanym torem organizacji.

**Overall Autonomy Maturity: 5.2/10.** Wynik nie jest średnią. Ograniczają go braki fundamentów zaufania: niepełne evidence/outcome truth, zależność od external-only assurance, brak pełnej promocji learningu i brak docelowego Roost world model. W bounded local delivery Paperclip jest bliżej 6.5–7/10; jako samodzielna organizacja zdolna utrzymać siebie i dowozić rzeczywiste outcomes bez Codexa — około 5.2/10.

## 2. Najważniejsze odkrycia

### Implementacja przewyższa opis w ośmiu obszarach

1. **Natywny causal supervision** jest znacznie dalej niż pierwotny V1, który deklarował automatic self-healing jako out-of-scope. PostgreSQL przechowuje findings, recurrences, root causes, safeguards, interventions, cycles, observation windows, evidence i shadow comparisons.
2. **Task, ProductDelivery i ProductOutcome są rozdzielone.** Commit, test lub zamknięcie taska nie mogą automatycznie wytworzyć product outcome. Typed predicates i `accepted_with_risk` ograniczają false success.
3. **Session runtime budget** obejmuje raw/uncached/cached/output tokens, reads, files, iterations, retries i elapsed time oraz może zatrzymać lokalny proces w trakcie wykonania.
4. **Context admission** fail-closed odrzuca prompt przekraczający token/file budget lub zawierający forbidden sources. Live findings potwierdzają realne odrzucenia 8,076/8,000, 8,668/8,000 i 14,091/14,000 tokenów.
5. **Rutyny są projektowane pod wielokrotne wykonanie:** idempotency key, dispatch fingerprint, transakcje, coalescing, reuse/skip policy, optimistic revision check i revision restore.
6. **Epistemic layer** ma source/provenance/confidence/freshness/supersession, low-trust quarantine i promotion workflow; to więcej niż zwykły log aktywności.
7. **Roost projection** korzysta z durable outbox, semantic digest, idempotency key, stale ordering, bounded retry, dead-letter state, pinned transport i fail-closed source state.
8. **Admission i delegation** ograniczają WIP, retry, expected value, hierarchy depth/fan-out oraz wymagają decision contract dla critical/protected work.

### Główna luka nie brzmi „brak mechanizmu”, tylko „brak domknięcia”

- Supervision wykrywa 21 problemów, lecz live snapshot nie pokazuje żadnej intervention.
- 105 learning observations nie przekłada się jeszcze na promowane operating targets.
- Native Watchdog od ośmiu kolejnych 10-minutowych cykli raportuje 4 failed checks i 0 native actions.
- External assurance nadal znajduje 4–6 `only-external` klas na cykl.
- `CompanySituation` rozpoznaje bottleneck `blocked_unknown` (60 elementów; najstarszy ok. 273 h), ale system nie ma jeszcze pełnego TOC loop prowadzącego do eliminacji ograniczenia.
- Cztery aktywne external Codex automations są poprawnie read-only, lecz nie mogą zostać wyłączone.

## 3. Zakres, źródła i metoda

Audyt łączy pięć klas dowodów:

1. kontrakty produktu i architektury: `doc/GOAL.md`, `doc/PRODUCT.md`, `doc/SPEC-implementation.md`, `docs/architecture.md`, `docs/softwarehouse-sdlc.md`, `docs/agent-policy-gates.md`, `docs/softwarehouse/18-roost-company-knowledge-plane.md`;
2. aktualny working tree: schematy DB, services, routes, validators, scheduler i recovery;
3. live API z 2026-08-08: health, companies, situation, agents, goals, projects, issues, routines, deliveries, organizational records/observations i supervision snapshot;
4. lokalne external Codex automations z `C:\Users\wrobl\.codex\automations`;
5. targeted tests uruchomione sekwencyjnie jednym workerem.

Statusy znaczą:

- `COMPLETE`: istnieje, jest egzekwowane i live evidence nie ujawnia istotnej luki;
- `PARTIAL`: istnieje i działa, ale pokrycie lub operacyjne domknięcie jest niepełne;
- `EMERGENT`: składniki istnieją, ale nie tworzą jeszcze stabilnej capability;
- `PLANNED`: kontrakt istnieje bez wystarczającego działania;
- `MISSING`: brak użytecznego odpowiednika;
- `DUPLICATED`: co najmniej dwa mechanizmy konkurują o tę samą funkcję;
- `MISPLACED`: funkcja istnieje w niewłaściwej warstwie.

Maturity 0–5 ocenia aktualne zachowanie, a nie liczbę plików: 0 brak, 1 dokument/eksperyment, 2 zalążek, 3 działająca część, 4 dojrzały mechanizm z dowodem, 5 zamknięta i utrzymywana capability.

## 4. Tabela zbiorcza capability

| Capability | Status | Current mechanism | Maturity 0–5 | Main gap | Target owner | Priority |
|---|---|---|---:|---|---|---|
| 1. Purpose, goals, constraints | PARTIAL | goals, projects, issue ancestry, decision/completion contracts | 3.3 | brak pełnego Mission→Strategy→Objective→Program→Milestone modelu i targetów | Roost + Paperclip | P1 |
| 2. Cybernetic control | PARTIAL | native Watchdog/Daily/Weekly, findings, Doctor, observation windows | 3.7 | wykrycie znacznie silniejsze niż closed corrective action | Paperclip | P0 |
| 3. Observability | PARTIAL | runs/events/activity, CompanySituation, delivery/outcome, scripts, Roost outbox | 3.5 | niepełna produkcja/CI/deployment sensor fusion i external-only checks | Infrastructure + Paperclip | P0 |
| 4. World model | PARTIAL / MISPLACED | Paperclip operational model + limited Roost projection + files | 2.8 | Roost nie jest jeszcze pełnym wspólnym world state; część company knowledge żyje lokalnie | Roost | P0 |
| 5. Memory architecture | PARTIAL / DUPLICATED | issues/docs/runs, org records/observations, `.agents/state`, Roost | 3.0 | brak jednolitej retrieval/promotion/expiry polityki między magazynami | Roost + Paperclip | P1 |
| 6. Causal memory | PARTIAL | supervision lifecycle + causal observations + learning dispositions | 3.6 | 0 live interventions; niewiele closed causal loops | Paperclip, trwała lekcja w Roost | P0 |
| 7. Planning | PARTIAL | issue hierarchy, dependencies, plan docs, deliveries, proposals | 2.8 | brak strategicznego optimizer/replanner i value-based backlog pruning | Roost + Paperclip | P1 |
| 8. Organization & delegation | PARTIAL | strict org tree, assignment proposals, admission, reports, approvals | 3.8 | role quality/span-of-control nie są stale ewaluowane; CEO/exec IC risk | Paperclip | P1 |
| 9. Quality system | PARTIAL | typed completion evidence, SDLC gates, deliveries/outcomes, tests, review | 3.5 | 240 legacy done without evidence; broader gate service incomplete | Paperclip + Infrastructure | P0 |
| 10. Epistemic system | PARTIAL | provenance/confidence/freshness/supersession/quarantine | 3.5 | vocabulary nie jest uniwersalnie egzekwowane; wiele proposed claims | Roost + Paperclip | P1 |
| 11. Risk & autonomy boundaries | PARTIAL | permissions, admission, decision contract, approvals, execution classes | 3.8 | risk×uncertainty×impact nie jest jednym politycznym modelem; board override broad | Paperclip | P1 |
| 12. Anti-Goodhart | PARTIAL | separate outcomes, evidence predicates, cost/outcome, false-green guard | 3.2 | outcome data i cost telemetry są za rzadkie; task history dominuje | Paperclip + Roost | P0 |
| 13. Theory of Constraints | EMERGENT | CompanySituation bottleneck + supervision checks + WIP limits | 2.7 | brak exploit→subordinate→elevate→repeat lifecycle | Paperclip | P1 |
| 14. Multi-agent coordination | PARTIAL | atomic checkout, execution locks, leases, admission, dedupe, hierarchy | 4.1 | część lock/recovery paths jest złożona; brak formalnych global invariants | Paperclip + Infrastructure | P1 |
| 15. Idempotency | PARTIAL | routine fingerprints/keys, outbox keys, wakeup coalescing, origins | 4.2 | nie wszystkie scripts/API commands są ensure-state; historical duplicates istnieją | Paperclip + Infrastructure | P1 |
| 16. Transactions/rollback/recovery | PARTIAL | DB transactions, revision restore, explicit delivery rollback, recovery | 3.2 | brak ogólnego saga/compensation modelu dla agent actions | Paperclip + Infrastructure | P1 |
| 17. Resilience engineering | PARTIAL | retry/backoff/timeout/recovery/leases/hard-stops/fail-closed | 3.9 | circuit breakers i degraded mode są nierówne między subsystemami | Infrastructure + Paperclip | P1 |
| 18. Antifragility | PARTIAL | corrective completion, causal findings, safeguard + observation window | 3.4 | mało zakończonych pętli; learning promotion nie działa masowo | Paperclip + Roost | P1 |
| 19. Resource economics | PARTIAL | budgets, cost events, quotas, session budgets, model router | 3.5 | cost/outcome brak wiarygodnego szeregu; 0 spend nie dowodzi efektywności | Paperclip | P1 |
| 20. Attention management | PARTIAL | CompanySituation, attention signals, hierarchy reports, approvals | 3.1 | live 60 blocked_unknown i 40 review items; wyjątki nie są domykane | Paperclip + Roost UI | P1 |
| 21. Event-driven architecture | PARTIAL / DUPLICATED | assignment wakes, mentions, callbacks, routines, plugin events, polling timers | 3.5 | control nervous system nadal w dużej części timer/cron; dual scheduling surfaces | Paperclip + Infrastructure | P1 |
| 22. Homeostasis | PARTIAL | health states, budgets, quota states, watchdog and bounded remediation | 3.2 | brak wspólnego healthy/warning/critical contractu i full auto-remediation | Paperclip | P1 |
| 23. Meta-control | PARTIAL / DUPLICATED | Weekly Meta, learning loop, external meta review, eval/regression docs | 3.2 | procesy rzadko są automatycznie upraszczane/scalane/retired | Paperclip + Roost | P1 |
| 24. Exploration vs exploitation | EMERGENT | canaries, worktrees, accepted-with-risk, experiment-like deliveries | 2.4 | brak first-class experiment entity, hypothesis, exposure i promotion policy | Roost + Paperclip | P2 |
| 25. Institutional learning | PARTIAL | 105 learning observations, causal model, procedure/instruction targets | 2.9 | brak promotions; lesson backlog nie zmienia systemu w zamkniętej pętli | Roost + Paperclip | P0 |

## 5. Audyt szczegółowy — 25 obszarów

### 5.1 Purpose, goals i constraints

**Status:** PARTIAL.  
**Existing implementation:** `goals` mają hierarchy (`parentId`), levels `company|team|agent|task`, owner i lifecycle. Projekty mogą wskazywać goal przez `projects.goalId` i `project_goals`. Issues niosą `goalId`, `parentId`, project, priority, blockers, execution policy i completion evidence. Run context pobiera role/project/task/acceptance/budget/admission.  
**Evidence:** `packages/db/src/schema/goals.ts`, `project_goals.ts`, `projects.ts`, `issues.ts`; `server/src/services/issue-goal-fallback.ts`; ancestry/context w `server/src/routes/issues.ts` i `server/src/services/run-context-builder.ts`. Live: 13 goals (8 active), 9 projects, tylko 3 projekty z goal linkiem, 0 project target dates.  
**Current behaviour:** agent może dostać task ancestry, parent intent, project i fallback do project/default company goal. Critical/protected work ma decision contract, a closure może wymagać typed evidence.  
**Current limitations:** model nie rozróżnia first-class Strategy, Objective, Program i Milestone; Definition of Success/Failure zwykle żyje w description, decisionContract lub delivery predicates. Powiązanie do celu bywa fallbackiem, a nie dowodem strategicznej wartości. Brak target dates usuwa temporalną część desired state.  
**Existing evolution path:** rozwinąć istniejący goal/project/delivery graph i Roost goals/initiatives zamiast dodawać drugi planner.  
**Potential duplication:** repo plan docs, issue plan documents, Roost initiatives i Paperclip goals mogą opisywać tę samą intencję.  
**Recommended eventual ownership:** Roost przechowuje mission/strategy/objectives/programs/milestones i success criteria; Paperclip utrzymuje executable decomposition oraz trace links.  
**Confidence:** high.  
**Open questions:** który identyfikator Roost initiative/goal stanie się obowiązkowym root linkiem? Czy fallback company goal ma pozostać dopuszczalny dla runnable work?

### 5.2 Cybernetic control

**Status:** PARTIAL.  
**Existing implementation:** Observe = DB queries, health/runs/events/outcomes; Compare = 16 deterministic supervision checks i CompanySituation signals; Decide = admission, findings, approvals, decision contracts; Act = wakeups, owner routing, orphan-lock cleanup, Doctor dispatch; Observe again = recurrences i observation windows.  
**Evidence:** `server/src/services/native-supervision-engine.ts`, `native-control-contract.ts`, `supervision-registry.ts`; `packages/db/src/schema/supervision.ts`. Live: 500 returned cycles, w tym 497 Watchdog i 3 Daily; 21 findings; 59 recurrence rows.  
**Current behaviour:** scheduler odpytuje `runDue()` co minutę, cycle keys deduplikują Watchdog do okna 10-min, Daily do dnia, Weekly do tygodnia. Severe active findings blokują green.  
**Current limitations:** najnowsze cykle mają 4 failed checks, 3 linked findings i 0 native actions. Snapshot pokazuje 0 interventions. `native-control-contract.ts` definiuje 27 check IDs, ale engine dostarcza obserwacje tylko dla podzbioru; reszta pozostaje `not_configured`.  
**Existing evolution path:** wypełnić obecną matrix rzeczywistymi detectorami/actions i zamykać findings przez istniejący causal lifecycle.  
**Potential duplication:** native scheduler, legacy/internal routines, liczne scripts oraz 4 external automations.  
**Recommended eventual ownership:** Paperclip; deterministyczne probes w Infrastructure; external tylko assurance.  
**Confidence:** high.  
**Open questions:** dlaczego aktualne findings wymagające diagnozy nie wytworzyły intervention? Które `not_configured` checks są wymagane do retirement gate?

### 5.3 Observability

**Status:** PARTIAL.  
**Existing implementation:** health endpoint, heartbeat runs/events/logs, activity log, costs, issues/projects/agents, delivery/outcome evidence, runtime services, environment probes, Roost outbox, CompanySituation, supervision, generated architecture/status indexes i wiele bounded audit scripts.  
**Evidence:** `server/src/routes/health.ts`, `control-plane-instrumentation.ts`; `heartbeat_runs.ts`, `heartbeat_run_events.ts`, `activity_log.ts`, `product_deliveries.ts`, `product_outcomes.ts`; `server/src/services/company-situation.ts`, `run-log-store.ts`, `environment-probe.ts`. Live health `ok`, v0.3.1, local_trusted/private, ports 3200/54329.  
**Current behaviour:** system odpowiada wiarygodnie na „czy Paperclip działa?”, „czy task/run ma ownera?” i częściowo „czy deployment/outcome został zaakceptowany?”.  
**Current limitations:** CI/CD i produkcja produktów nie są jednym native sensor plane; wiele checks żyje w scripts/project repos/Roost. 5 external-only classes potwierdza luki coverage.  
**Existing evolution path:** rejestrować wszystkie sensor results jako source-attributed observations/findings, bez kopiowania provider truth.  
**Potential duplication:** status docs, architecture registries, live DB i external reports.  
**Recommended eventual ownership:** Infrastructure dla probes; Paperclip dla control state; Roost dla durable owner view.  
**Confidence:** high.  
**Open questions:** które produkcyjne sensory są teraz polling-only? Jaki jest canonical SLA/freshness per source?

### 5.4 World model / model organizacji

**Status:** PARTIAL / MISPLACED.  
**Existing implementation:** Paperclip ma firmy, agents/org tree, permissions, projects, goals, issues, routines, approvals, costs, knowledge records, observations i runtime. Roost ma zatwierdzony model departments, offerings, roles, processes, KPIs, resources i company knowledge; Paperclip publikuje ograniczony portfolio projection przez durable outbox.  
**Evidence:** `docs/softwarehouse/18-roost-company-knowledge-plane.md`; `server/src/services/roost-bridge-portfolio.ts`, `roost-product-map-outbox.ts`; schema inventory.  
**Current behaviour:** Paperclip jest mocnym operating truth. Roost otrzymuje read-only owner projection i udostępnia bounded read-only Company OS context wybranym agentom.  
**Current limitations:** pełny wspólny world state jeszcze nie istnieje. Company knowledge nadal jest rozproszone między DB Paperclip, `.agents/state`, `docs/softwarehouse`, product repos i hosted Roost. Projekcja Roost obejmuje portfolio/delivery, nie cały model organizacji.  
**Existing evolution path:** rozszerzać Roost API/MCP oraz stable references; nie przenosić departments/offerings/CRM/knowledge do Paperclip.  
**Potential duplication:** Paperclip organizational records i Roost decisions/knowledge; projects vs offerings; issues vs Roost work items.  
**Recommended eventual ownership:** Roost world model; Paperclip execution graph; product repos product truth; Infrastructure runtime truth.  
**Confidence:** high.  
**Open questions:** które Paperclip records mają zostać projekcjami Roost, a które pozostają execution-local? Jak realizować semantic conflict queue?

### 5.5 Memory architecture

**Status:** PARTIAL / DUPLICATED.  
**Existing implementation:** working memory = run context/session state; episodic = runs/events/comments/activity; semantic = organizational records/observations/docs/Roost; procedural = skills, routines, policies, instructions; organizational = Roost + docs/softwarehouse + `.agents/state`; lessons = learning observations/supervision.  
**Evidence:** `agent_task_sessions.ts`, `agent_runtime_state.ts`, `documents.ts`, `organizational_records.ts`, `organizational_observations.ts`, routines and skills; source-trust quarantine.  
**Current behaviour:** pamięć jest company-scoped, wersjonowana lub append-only w wielu krytycznych miejscach; supersession, expiry, freshness i promotion są dostępne.  
**Current limitations:** nie ma jednego retrieval policy ani automatic consolidation. 105 learning candidates i 0 promoted wskazuje write-heavy, promotion-light memory. `.agents/state` pozostaje manualnym, równoległym magazynem.  
**Existing evolution path:** Roost jako semantic/organizational memory, Paperclip jako episodic/execution memory, skills/routines jako procedural targets.  
**Potential duplication:** issue comments, docs, work products, org observations, project docs, state files i Roost.  
**Recommended eventual ownership:** jw.; Paperclip powinien przechowywać provenance link, nie kopię całej wiedzy.  
**Confidence:** high.  
**Open questions:** retention/decay per class? Kto zatwierdza semantic promotion i usuwa stale duplicates?

### 5.6 Causal memory i organizational learning

**Status:** PARTIAL.  
**Existing implementation:** `finding -> recurrence -> rootCause -> intervention -> safeguard -> observationWindow -> closure`; organizational observations mają `causalRole`, parent/supersedes, evidence i promotion target; issue completion wymaga learning disposition.  
**Evidence:** `packages/db/src/schema/supervision.ts`, `organizational_observations.ts`; `server/src/services/supervision-registry.ts`; `docs/softwarehouse-sdlc.md`. Live: 3 root causes, 3 safeguards, 3 windows, 59 recurrences, 0 interventions.  
**Current behaviour:** root cause nie może się zamknąć bez verified safeguard i passed observation window. Recurrence fingerprint ogranicza duplikaty.  
**Current limitations:** struktura jest mocna, ale użycie płytkie. Część learning observations to powtarzające się proposed records, nie causal proof. Brak live interventions przerywa oczekiwany łańcuch.  
**Existing evolution path:** wymagać intervention albo jawnego no-action/accepted-risk disposition; promować tylko po observation.  
**Potential duplication:** legacy learning-loop scripts i native supervision.  
**Recommended eventual ownership:** Paperclip dla operational causal loop; Roost dla zatwierdzonej trwałej lekcji/procedure.  
**Confidence:** high.  
**Open questions:** czy 0 interventions wynika z braku Doctor capacity, admission, czy błędu lifecycle?

### 5.7 Planning

**Status:** PARTIAL.  
**Existing implementation:** parent/child issues, blocker graph z cycle protection, plan documents, issue plan decompositions, projects/targets, assignment/work proposals, ProductDelivery tasks i next-legal-action scripts.  
**Evidence:** `issues.ts`, `issue_relations.ts`, `issue_plan_decompositions.ts`, `assignment_proposals.ts`, `work_proposals.ts`, `deliveries.ts`.  
**Current behaviour:** agent może rozbić pracę, zachować ownera parenta, użyć blockers i bezpiecznie delegować. WIP/admission ogranicza eksplozję wykonania.  
**Current limitations:** brak native portfolio optimizer, dynamic replan oparty na outcomes i milestone modelu. Wszystkie 500 issue w domyślnej liście mają priority `critical`, co niszczy informacyjną wartość priorytetu i może być śladem wcześniejszego task-count/urgency gaming.  
**Existing evolution path:** bazować na Roost initiatives/outcomes i ProductDelivery, dodając value/critical-path/replan do istniejących primitives.  
**Potential duplication:** repo plans vs issue plan document vs Roost initiative plan.  
**Recommended eventual ownership:** Roost strategic/portfolio planning; Paperclip executable/recovery planning.  
**Confidence:** medium-high; issue list jest limitowana do 500 rekordów.  
**Open questions:** czy wszystkie issue naprawdę są critical, czy to seed/config defect? Jaki jest backlog retirement policy?

### 5.8 Organizational structure i delegation

**Status:** PARTIAL.  
**Existing implementation:** strict manager tree, roles/titles/capabilities, permission classes, direct-child assignment, bounded depth 6/fan-out 8/agents-per-problem 4, assignment proposals, admission decisions, delegation reports, reviewer separation i approvals.  
**Evidence:** `agents.ts`, `assignment_proposals.ts`, `delegation_reports.ts`, `server/src/services/delegation-flow.ts`, `hierarchy-health.ts`, `agent-permissions.ts`. Live: 39 agents, 31 idle, 8 paused, 0 running/error.  
**Current behaviour:** lateral assignment jest odrzucany poza admitted delivery fast path; leaf agent eskaluje lub proponuje work; upward report przenosi result/evidence/blocker/cost/risk.  
**Current limitations:** runtime nie udowadnia stale jakości span of control, competency i executive work mix. Hierarchy może być formalnie poprawna, a nadal zarządczo przeciążona.  
**Existing evolution path:** hierarchy health + role evals + outcome attribution, bez nowego org engine.  
**Potential duplication:** departments opisane w Roost/docs vs agents/roles w Paperclip.  
**Recommended eventual ownership:** Roost departments/roles/responsibility; Paperclip execution authority/reporting graph.  
**Confidence:** high dla enforcement, medium dla zachowania CEO/directors.  
**Open questions:** jaki procent pracy CEO/exec to IC? Czy 8 paused agents to celowa capacity policy?

### 5.9 Quality system

**Status:** PARTIAL.  
**Existing implementation:** typed completion evidence, risk-dependent security/deploy/monitoring evidence, independent review, ProductDelivery transition gates, ProductOutcome predicates, SDLC/DoD, audits, Doctor/Watchdog, tests i work products.  
**Evidence:** `docs/softwarehouse-sdlc.md`, `docs/agent-policy-gates.md`, issue close route w `server/src/routes/issues.ts`, `server/src/services/deliveries.ts`. Live: 5 deliveries (4 outcome_accepted, 1 review_accepted), lecz finding wykrywa 240 legacy done bez typed evidence i 3 legacy accepted outcomes bez predicates.  
**Current behaviour:** nowe agent-authored completion fail-closed; board override wymaga co najmniej inspectable evidence. Outcome acceptance nie wynika automatycznie z taska.  
**Current limitations:** historyczny dług dowodowy jest duży; broader gate read model nadal nie pokrywa wszystkich transition surfaces. Board override pozostaje szeroki.  
**Existing evolution path:** backfill tylko tam, gdzie istnieje evidence; reszta unknown/revalidation. Ujednolicić istniejący gate service.  
**Potential duplication:** scripts audits, issue gate, delivery gate, external assurance.  
**Recommended eventual ownership:** Paperclip gate decisions; Infrastructure test/monitor probes; Roost acceptance/business outcome.  
**Confidence:** high.  
**Open questions:** które 240 rekordów to historyczne pre-gate work, a które rzeczywiste false completion?

### 5.10 Epistemic system

**Status:** PARTIAL.  
**Existing implementation:** assumption/commitment/decision lifecycle, confidence, evidence, sourceClass, provenance, observedAt, validUntil, freshnessWindow, supersession, contradicted/disputed/stale/unknown states, low-trust quarantine i source-attributed situation signals.  
**Evidence:** `organizational_records.ts`, `organizational_observations.ts`, `source-trust.ts`, `company-situation.ts`; ProductDelivery uses explicit `unknown`.  
**Current behaviour:** system potrafi fail-closed zachować `unknown`, nie inventuje deadline/outcome i oddziela inference od current source facts w CompanySituation.  
**Current limitations:** nie wszystkie issues/comments/work products wymagają epistemic labels. Live records to 17 decisions i 0 assumptions/commitments; model istnieje, lecz jest używany wąsko.  
**Existing evolution path:** używać obecnych record kinds i source trust jako wspólnej envelope, a semantic claims promować do Roost.  
**Potential duplication:** free-form prose nadal omija typed model.  
**Recommended eventual ownership:** Roost semantic truth; Paperclip runtime observation and uncertainty gates.  
**Confidence:** high.  
**Open questions:** które decyzje powinny wymagać minimum confidence/evidence/freshness?

### 5.11 Risk, uncertainty i autonomy boundaries

**Status:** PARTIAL.  
**Existing implementation:** permission classes, scopes, admission, maintenance states, WIP/retry/expected-value gates, critical/protected decision contract, irreversible keyword detection, approvals, accepted risk, budget stops i sandbox rules.  
**Evidence:** `admission-control.ts`, `issue-decision-contract.ts`, `agent-permissions.ts`, `authorization.ts`, `docs/agent-policy-gates.md`.  
**Current behaviour:** low-value large work jest odrzucane; critical/protected runnable work wymaga disposition `do_now` i resource limit; accepted risk jest jawne.  
**Current limitations:** nie ma jednego first-class `risk × uncertainty × impact` score. Keyword matcher może mieć false positives/negatives. Board może szeroko nadpisywać. Autonomy level L0–L4 jest kontraktem dokumentacyjnym, nie uniwersalnym runtime state.  
**Existing evolution path:** rozszerzyć decision/admission contracts i permission classes, nie dodawać osobnego governor.  
**Potential duplication:** autonomy governor scripts vs native admission vs approvals.  
**Recommended eventual ownership:** Paperclip.  
**Confidence:** high.  
**Open questions:** czy autonomy level powinien być per agent, action class czy resource?

### 5.12 Goodhart / incentive architecture

**Status:** PARTIAL.  
**Existing implementation:** task/delivery/outcome separation, evidence predicates, false-green guard, cost-per-accepted-outcome, expected value, WIP, dedupe i external reward-hacking checks.  
**Evidence:** `product_deliveries.ts`, `product_outcomes.ts`, native supervision, Weekly aggregate.  
**Current behaviour:** zamknięcie taska nie tworzy wyniku; accepted outcome potrzebuje niezależnego evidence. To jest mocna ochrona przed activity=outcome.  
**Current limitations:** tylko 5 deliveries, koszty praktycznie 0, 3 legacy outcomes są niepełne. Default list pokazuje 500 critical issues. Przy tak małej bazie outcomes system nadal łatwo optymalizuje ticket flow zamiast real value.  
**Existing evolution path:** zwiększyć outcome coverage i cost attribution; używać Roost KPI/business truth.  
**Potential duplication:** external reward-hacking audit dubluje część native checks, ale nadal znajduje only-external.  
**Recommended eventual ownership:** Paperclip mechanism design; Roost real-world KPI/outcome.  
**Confidence:** high.  
**Open questions:** jakie outcome predicates są uniwersalne, a jakie offering-specific?

### 5.13 Theory of Constraints

**Status:** EMERGENT.  
**Existing implementation:** CompanySituation klasyfikuje flow stages i wskazuje bottleneck; supervision wykrywa review/deployment/context/WIP/orphan/cost constraints; admission subordinates work do limits.  
**Evidence:** `company-situation.ts`, `native-supervision-engine.ts`, `hierarchy-health.ts`. Live bottleneck: `blocked_unknown`, 60, oldest ~273 h; review 40, oldest ~447 h.  
**Current behaviour:** constraint detection działa. Stalled ready work może być routed do ownera.  
**Current limitations:** nie ma durable lifecycle `detect -> exploit -> subordinate -> elevate -> repeat`; bottleneck może pozostać tylko attention signal.  
**Existing evolution path:** dodać lifecycle fields/actions do istniejących findings/attention signals.  
**Potential duplication:** queue expeditors, blocked triage scripts, CompanySituation i supervision.  
**Recommended eventual ownership:** Paperclip; Roost owner-facing strategic decision.  
**Confidence:** high.  
**Open questions:** kto ma authority do elevating constraint i jak mierzyć improvement?

### 5.14 Multi-agent coordination / distributed systems

**Status:** PARTIAL, blisko dojrzałego.  
**Existing implementation:** atomic checkout, single assignee, checkout/execution locks, agent start lock, DB wakeup queue, leases, optimistic routine revisions, idempotency keys, hierarchy constraints, recovery sweeps i company scoping.  
**Evidence:** issue checkout contract; `heartbeat.ts`, `agent-start-lock.ts`, `environment_leases.ts`, `routines.ts`, recovery service.  
**Current behaviour:** konflikt checkout zwraca 409; stale/orphan state jest reconciled; duplicate work jest ograniczane na wielu warstwach.  
**Current limitations:** recovery service jest bardzo duży i ma wiele splatających się ścieżek; formalny invariant set nie jest jednym executable spec. In-memory start lock timeout może kontynuować po 120 s, opierając bezpieczeństwo na dalszych DB gates.  
**Existing evolution path:** utrzymać DB jako authority, wyodrębnić invariants i chaos/restart tests.  
**Potential duplication:** locki issue/run/workspace/environment plus script janitors.  
**Recommended eventual ownership:** Paperclip + Infrastructure.  
**Confidence:** high.  
**Open questions:** które race classes nie mają jeszcze deterministic regression?

### 5.15 Idempotency

**Status:** PARTIAL, wysoka dojrzałość.  
**Existing implementation:** routine `idempotencyKey`, dispatch fingerprint, concurrency policy, issue origin fingerprint, wakeup keys, outbox idempotency digest, supervision fingerprints/cycle keys i semantic dedupe scripts.  
**Evidence:** `routines.ts`, `issues.ts`, `roost_product_map_outbox.ts`, `supervision.ts`.  
**Current behaviour:** wielokrotne routine fire może reuse/coalesce/skip; Roost retry nie duplikuje snapshotu; findings aktualizują recurrence zamiast mnożyć identities.  
**Current limitations:** nie wszystkie operator scripts są deklaratywnym `ensure desired state`; wcześniejsze duplicate delegations pokazały konflikt auto-wake + manual invoke. Indeksy routine idempotency są nie wszędzie unique, więc część gwarancji opiera się na transakcji/logice.  
**Existing evolution path:** konwertować mutujące scripts do ensure/reconcile z stable keys.  
**Potential duplication:** scripts i runtime APIs realizują te same ensure operations.  
**Recommended eventual ownership:** Infrastructure primitives + Paperclip semantics.  
**Confidence:** high.  
**Open questions:** które commands nadal nie mają dry-run/idempotency key?

### 5.16 Transactions / rollback / recovery

**Status:** PARTIAL.  
**Existing implementation:** DB transactions dla routines/admission/approvals, revision history i restore, explicit delivery `rolled_back`, migration policy, git rollback plan w decision contracts, stale-run recovery i startup replay.  
**Evidence:** `routines.ts`, `admission-control.ts`, `deliveries.ts`, recovery service; SDLC.  
**Current behaviour:** config/routine rollback jest concrete; partial run failure ma recovery/retry/escalation.  
**Current limitations:** nie ma ogólnego transaction/saga modelu dla wielosystemowych działań agentów. Rollback plan bywa tekstem, a nie executable compensator. DB migrations nie mają automatycznego rollbacku.  
**Existing evolution path:** do ProductDelivery/Intervention dołączyć typed compensation/verification actions.  
**Potential duplication:** repo rollback, deploy rollback i issue status rollback są niezależne.  
**Recommended eventual ownership:** Paperclip orchestruje; Infrastructure wykonuje compensations.  
**Confidence:** high.  
**Open questions:** które action classes wymagają mandatory executable rollback?

### 5.17 Resilience engineering

**Status:** PARTIAL.  
**Existing implementation:** retry classification, backoff, retry ceilings, timeouts, cancellation, orphan reaping, scheduled retries, leases, fail-closed admission, provider quota handling, plugin concurrency/timeout i outbox dead state.  
**Evidence:** `heartbeat.ts`, `recovery/service.ts`, `plugin-job-scheduler.ts`, `roost-product-map-publisher.ts`.  
**Current behaviour:** system zakłada awarie i odzyskuje stan po restarcie.  
**Current limitations:** circuit breaker/degraded mode nie są jednolite; native matrix nadal ma `runtime_health`, `database_health`, `dead_locks`, `outbox_dead_letters` bez pełnego zasilania. Test run emitował PostgreSQL 57P02 crash warnings, mimo 44/44 pass — harness pozostaje kruchy.  
**Existing evolution path:** podłączyć obecne subsystem health do control matrix i dodać failure-injection.  
**Potential duplication:** watchdogs w runtime i scripts.  
**Recommended eventual ownership:** Infrastructure + Paperclip policy.  
**Confidence:** high.  
**Open questions:** jakie są formalne SLO i blast-radius boundaries per subsystem?

### 5.18 Antifragility

**Status:** PARTIAL.  
**Existing implementation:** incident/finding, root cause, intervention, safeguard, regression requirement, observation window i learning promotion. Corrective completion rozróżnia one-off/systemic.  
**Evidence:** supervision schema/service, issue completion learning disposition, agent improvement flywheel docs.  
**Current behaviour:** systemic correction nie może się zamknąć samym passing testem.  
**Current limitations:** system ma strukturę antifragile, ale brak masowego proof. 0 interventions i 0 promoted learning oznacza, że większość awarii nie poprawiła jeszcze instytucji w mierzalny sposób.  
**Existing evolution path:** mandatory causal disposition dla repeated/high severity i automated promotion candidate after passed window.  
**Potential duplication:** external Doctor assurance vs internal Doctor; learning scripts vs observations.  
**Recommended eventual ownership:** Paperclip loop, Roost institutionalization.  
**Confidence:** high.  
**Open questions:** jaki minimalny recurrence threshold tworzy systemic learning?

### 5.19 Resource economics

**Status:** PARTIAL.  
**Existing implementation:** company/agent budgets, cost events, budget incidents, WIP/retry budgets, context/session quotas, model economics catalog i model router z quota-pressure fallbacks.  
**Evidence:** `budgets.ts`, `costs.ts`, `session-runtime-budget.ts`, `execution-quota.ts`, `model-router.ts`, `model-economics.ts`.  
**Current behaviour:** hard stops działają, context i session limits fail-closed, model router może użyć tańszej lane przy presji.  
**Current limitations:** live company pokazuje budget 500 cents i spend 0; Weekly cost/outcome 0 nie jest dowodem efektywności. Brak pełnego cost attribution do accepted outcomes. Limity session są dziś core-controlled bez dedykowanego audited board surface.  
**Existing evolution path:** istniejący cost event + outcome link + board policy UI.  
**Potential duplication:** adapter telemetry i cost events mogą dryfować.  
**Recommended eventual ownership:** Paperclip.  
**Confidence:** high.  
**Open questions:** czy zero kosztu oznacza brak ingestu, subscription model czy faktyczne zero?

### 5.20 Attention management

**Status:** PARTIAL.  
**Existing implementation:** CompanySituation attention signals, dashboard aggregates, pending approvals, delegation reports, escalation paths, inbox/read states i Weekly max-three priorities.  
**Evidence:** `company-situation.ts`, `dashboard.ts`, `delegation-flow.ts`, `sidebar-badges.ts`.  
**Current behaviour:** zarząd może dostać agregaty, deviations i decisions zamiast wszystkich logów.  
**Current limitations:** 60 blocked_unknown i 40 review pokazują, że agregacja nie gwarantuje decision ownership. External automations nadal raportują ownerowi. Raw task/issue volume pozostaje wysoki.  
**Existing evolution path:** dodać SLA/owner/disposition do attention signals i używać Roost owner cockpit.  
**Potential duplication:** Dashboard, CompanySituation, Softwarehouse status, external summaries.  
**Recommended eventual ownership:** Paperclip exceptions; Roost owner-facing aggregation.  
**Confidence:** high.  
**Open questions:** jaka jest maksymalna liczba aktywnych owner attention items i kto je deduplikuje?

### 5.21 Event-driven architecture

**Status:** PARTIAL / DUPLICATED.  
**Existing implementation:** assignment/mention/comment wakes, webhook/API routine triggers, callbacks, plugin event bus, run completion handoffs, finding→Doctor oraz cron/timer reconcilers.  
**Evidence:** `heartbeat.ts`, `routines.ts`, `plugin-event-bus.ts`, `issue-assignment-wakeup.ts`, native engine.  
**Current behaviour:** istotne work events mogą natychmiast wake agent; cron pełni również rolę reconciler/watchdog.  
**Current limitations:** native supervision jest timerem co minutę, heartbeat/recovery/routines używają wspólnego periodic tick, a liczne scripts i zewnętrzne automations mają własne cadence. Production/CI events nie są pełnym nervous system.  
**Existing evolution path:** emitować typed events do jednego internal bus/outbox, pozostawić cron jako reconciler.  
**Potential duplication:** native timer, archived routines z enabled triggerami, external heartbeat automations.  
**Recommended eventual ownership:** Paperclip event orchestration; Infrastructure event transport.  
**Confidence:** high.  
**Open questions:** które events są durable, a które tylko in-memory?

### 5.22 Homeostasis

**Status:** PARTIAL.  
**Existing implementation:** health status, agent states, quota `normal|warning|throttle|hold|emergency`, session `healthy|warning|throttle|near_limit|stopped`, supervision severity, budget thresholds i bounded remediation.  
**Evidence:** `execution-quota.ts`, `session-runtime-budget.ts`, native supervision, budgets.  
**Current behaviour:** przekroczenia prowadzą do hold/pause/stop, stale locks mogą być czyszczone, ownerless work routed.  
**Current limitations:** brak jednego company health state i shared threshold registry. Latest watchdog pozostaje failed przez wiele cykli bez action.  
**Existing evolution path:** składać subsystem states do CompanySituation/supervision i przypisywać każdemu deviation action/owner/SLA.  
**Potential duplication:** różne state vocabularies.  
**Recommended eventual ownership:** Paperclip; probes w Infrastructure.  
**Confidence:** high.  
**Open questions:** które failures pozwalają degraded mode, a które wymagają global hold?

### 5.23 Meta-control

**Status:** PARTIAL / DUPLICATED.  
**Existing implementation:** Weekly Meta aggregate, organizational learning loop, eval/regression gates, routine revisions/restore, supervision shadow comparison i external weekly architecture review.  
**Evidence:** native engine, organizational observations, routine revisions, external automation TOML.  
**Current behaviour:** proces może być oceniony, finding może wskazać missing capability i regression target.  
**Current limitations:** brak first-class process effectiveness metrics i automatic retirement/merge. 37 non-active routines z historycznymi enabled triggers pokazuje zalegający process inventory.  
**Existing evolution path:** procedural records w Roost + routine/process performance w Paperclip; promote/retire po observation.  
**Potential duplication:** native Weekly i external Weekly Meta.  
**Recommended eventual ownership:** Paperclip mierzy; Roost przechowuje process/procedure; board zatwierdza ryzykowne zmiany.  
**Confidence:** high.  
**Open questions:** jaki jest canonical process ID łączący routine, SOP, findings i metrics?

### 5.24 Exploration vs exploitation

**Status:** EMERGENT.  
**Existing implementation:** isolated execution workspaces/worktrees, canary deliveries, accepted_with_risk, proposal/admission i observation windows.  
**Evidence:** execution workspaces, ProductDelivery canaries, supervision windows.  
**Current behaviour:** bounded experiment można przeprowadzić bez utożsamiania go z production outcome.  
**Current limitations:** brak experiment entity z hypothesis, variant, exposure, metric, stop rule i promotion/rejection. Canaries są modelowane jako deliveries.  
**Existing evolution path:** Roost Experiment/Decision jako durable semantic object, Paperclip bounded execution i evidence.  
**Potential duplication:** ad hoc canary issue/delivery vs future experiment system.  
**Recommended eventual ownership:** Roost hypothesis/learning; Paperclip execution.  
**Confidence:** medium-high.  
**Open questions:** które eksperymenty mogą być autonomiczne i jaki jest max risk/exposure?

### 5.25 Institutional learning

**Status:** PARTIAL.  
**Existing implementation:** task corrective disposition, recurrence, causal findings, learning candidates, promotion targets `procedure|instruction|skill|routine|policy|other`, eval/regression docs oraz organizational memory.  
**Evidence:** organizational observation validators/service, supervision schema, learning scripts. Live: 105 learning observations; none promoted; 113 all observations proposed.  
**Current behaviour:** system potrafi nazwać lekcję i docelowy mechanizm instytucjonalny.  
**Current limitations:** task failure→lesson działa częściej niż lesson→process change→regression→verified improvement. Brak promotions jest krytycznym sygnałem.  
**Existing evolution path:** użyć istniejącego promotion workflow i safeguard windows; Roost przechowuje zatwierdzoną procedure/policy.  
**Potential duplication:** `.agents/state` journal, learning issues, observations i external meta review.  
**Recommended eventual ownership:** Paperclip wykrywa/egzekwuje; Roost instytucjonalizuje.  
**Confidence:** high.  
**Open questions:** dlaczego żaden learning nie został promoted i jaki agent/board gate jest ownerem promocji?

## 6. Trzy warstwy automatyzacji

### A. Bezpośrednie działania Codexa nad Paperclipem

| Obecne działanie bezpośrednie | Dlaczego Paperclip jeszcze tego nie wykonuje sam | Docelowa lokacja | Czy powinno pozostać manualne? |
|---|---|---|---|
| Audyt architektury i falsyfikacja raportów | native matrix ma niepokryte checks i nie ocenia całej architektury semantycznie | Paperclip Weekly Meta + Roost knowledge; external assurance przejściowo | tylko okresowy independent audit |
| Zmiany kodu, schematu i migracji Paperclipa | self-modification nie ma jeszcze bezpiecznego governed delivery lane z niezależnym review i rollback proof | Paperclip execution nad własnym repo | high-risk approval powinien pozostać human-owned |
| Uruchamianie targeted testów i interpretacja harness failures | test runner jest narzędziem Infrastructure, a diagnoza nie zawsze jest deterministyczna | Infrastructure probe + Paperclip finding/Doctor | manual break-glass tylko dla nieznanej awarii |
| Runtime topology i DB safety checks | część probes żyje w scripts, nie w control matrix | Infrastructure probes + Paperclip supervision | nie |
| Roost deploy/protected readback i defect repair | cross-system production authority jest celowo gated; Paperclip ma tylko bounded projection | Paperclip governed ProductDelivery + Infrastructure + Roost API | approval dla production mutation tak |
| Strojenie polityk, limitów, agentów i routines | brak audited owner configuration dla części session/native limits | Paperclip board policy surface; trwała polityka w Roost | decyzja granic pozostaje board-owned |
| Utrzymanie external automations | są nadal assurance dla luk native coverage | Paperclip supervision po okresie obserwacji | tylko do retirement gate |
| Pisanie raportów dla ownera/GPT | CompanySituation/Weekly nie składa jeszcze pełnego evidence-backed architecture report | Roost owner cockpit + Paperclip report generator | strategiczna interpretacja może pozostać okresowa |

### B. Wewnętrzne rutyny i control loops Paperclipa

| Mechanizm | Trigger | Owner | Input | Output/effect | Retry/idempotency/failure | Source of truth |
|---|---|---|---|---|---|---|
| Heartbeat timer + startup recovery | server timer `heartbeatSchedulerIntervalMs` i startup | Paperclip runtime | agents, wakes, runs, issues | enqueue/resume/reap/reconcile | bounded retry, persisted queue, locks, activity | PostgreSQL |
| Native Watchdog | `runDue` co minutę; 10-min cycle key | native supervision | DB runtime/control facts | checks, findings, limited recovery | cycle dedupe, recurrence, false-green guard | PostgreSQL supervision |
| Daily Integrity | `runDue`; daily key | native supervision | expanded deterministic checks + last-24h economics | findings, daily metrics | daily dedupe; Doctor admission | PostgreSQL supervision |
| Weekly Meta | `runDue`; weekly key | native supervision | aggregates only | max 3 priorities, cost/outcome | weekly dedupe; no direct reorg | PostgreSQL supervision |
| Operational Doctor | event-driven finding requiring diagnosis | Doctor agent after admission | finding + bounded 6k-token/8-file context | at most one reversible change + one regression | retry budget 1, rollback and observation required | finding/intervention/admission |
| Orphan lock recovery | Watchdog + heartbeat recovery | system | stale issue lock + terminal/missing run | clear exact lock, activity | deterministic company-scoped update | issues/runs/activity |
| Orphan task routing | Watchdog | hierarchy owner | executable unassigned issue | admitted assignment + wake | idempotency key per issue/owner | issues/admission/wakes |
| Stalled ready dispatch | Watchdog | delivery owner | admitted/implementing stale delivery | route owner-only task | stable fingerprint, admission, SLA | deliveries/findings |
| Routine scheduler | heartbeat timer | routine owner/assignee | active routine + enabled trigger | create/reuse/coalesce issue and wake | transaction, key, fingerprint, revision, failureReason | routines/runs/issues |
| Active-run silence watchdog | startup + periodic recovery | heartbeat runtime | run events/output timestamps | review/recovery evidence | dedupe and escalation | runs/events/findings |
| Budget/quota/session governor | before claim/invoke and during local execution | system/board policy | cost, tokens, time, reads, retries | warn/throttle/hold/stop/pause | hard stop, explicit recovery | budgets/costs/run state |
| ProductDelivery/Outcome gate | API transition | owner/reviewer/board | typed evidence/predicates/SHA | independent stage/acceptance | fail-closed, explicit rollback | delivery/outcome ledger |
| Roost Product Map publisher | server outbox timer | Infrastructure integration | versioned Paperclip projection | read-only Roost envelope | semantic digest, stale refusal, backoff, dead state | outbox + Roost ingest |
| Backup/log retention/plugin jobs | server timers/plugin scheduler | Infrastructure | DB/log/jobs config | backup, retention, plugin execution | concurrency limit, timeout, failure records | instance settings/DB |

**Live routine inventory caveat:** API zwraca 37 routine records: 24 `archived`, 13 `paused`, 0 `active`. 18 triggers mają `enabled=true`, ale należą do archived/paused routines i nie powinny zostać fired. Ważne historyczne rodziny to autonomy governor, known-state drift sweep, learning loop, longevity doctor/snapshot, continuation watchdog, source-control closure, no-stall expeditor i daily project status. W obecnym stanie są historycznym inventory, nie działającym nervous system.

### C. Zewnętrzne automatyzacje

| Automatyzacja | Cadence | Co robi | Dlaczego nadal zewnętrzna | Co ją zastąpi | Retirement state |
|---|---|---|---|---|---|
| Paperclip Watchdog | 00:10, 06:10, 12:10, 18:10 | read-only runtime/admission/WIP/lock/recovery assurance + shadow comparison | native coverage nie obejmuje wszystkich independent checks | pełna native matrix + 14 clean days | nie można wyłączyć |
| Operational Doctor | codziennie 13:40 | falsyfikuje root cause, admission, bounded intervention, test/rollback/window | live snapshot ma 0 interventions; Doctor loop nie ma wystarczającego proof | działający intervention lifecycle + regression evidence | nie można wyłączyć |
| Daily Integrity Audit | codziennie 09:20 | reward hacking, false-green, cost/outcome, recurrence, safeguards | nadal wykrywa 6 only-external i severity mismatch | native daily parity i telemetry coverage | nie można wyłączyć |
| Weekly Meta-Architecture Review | niedziela 21:20 | koszt/outcome, role/routine overlap, AIA bottleneck, retirement candidates | native Weekly jest aggregate i nie dowodzi process retirement | meta-control z process metrics/promotion/retirement | nie można wyłączyć |

Wszystkie cztery są prawidłowo ograniczone: `notification_policy=failed_runs_only`, brak napraw i brak drugiego backlogu; zapisują tylko shadow comparisons. To jest dobra architektura przejściowa, nie niekontrolowana duplikacja.

## 7. Granica Paperclip ↔ Roost ↔ Infrastructure

| Capability/data | Paperclip | Roost | Infrastructure | External supervisor |
|---|---|---|---|---|
| Mission/strategy/objectives | wykonawcze refs i admission | **canonical owner** | — | falsyfikacja okresowa |
| Departments/roles/offerings/clients/resources | execution projection | **canonical owner** | — | — |
| Issues, assignment, checkout, runs, budgets | **canonical owner** | accepted aggregate/reference | runtime primitives | assurance tylko |
| ProductDelivery execution evidence | **canonical control ledger** | owner/business projection | CI/deploy/monitor probes | independent validation |
| ProductOutcome/business KPI | evidence candidate/acceptance gate | **canonical durable business truth** | source probes | assurance |
| Organizational semantic memory | temporary/execution-linked | **canonical owner** | storage | — |
| Operational causal findings | **canonical owner** | promoted lesson/procedure | probes/regressions | read-only comparison |
| Product architecture/code/tests | reference only | index/relationship | repo/CI/deploy | audit |
| Health/logs/metrics | consume/decide | aggregate owner view | **probe owner** | independent check |
| Routines/process execution | **canonical owner** | procedure definition | scheduler/process | assurance |
| Secrets/provider credentials | scoped refs/policy | resource metadata, not secret copy | secret provider | never |

Najważniejsza zasada: Roost nie powinien przejąć checkout/run/budget authority, a Paperclip nie powinien stać się CRM, document suite, portfolio/Offering DB ani głównym semantic knowledge store.

## 8. Architecture Gap Map

### P0 — blokuje wiarygodną autonomię

1. **Domknięcie truth/evidence debt.** 240 legacy done bez typed completion evidence i 3 accepted outcomes bez typed predicates uniemożliwiają traktowanie historycznej zieleni jako wiarygodnej.
2. **Native assurance parity.** Najnowszy shadow ma 5 only-external; dopóki external-only critical/high classes istnieją, zewnętrzny nadzór jest konieczny.
3. **Working causal action loop.** 21 findings przy 0 interventions i osiem kolejnych Watchdog cycles z 4 failed/0 actions pokazują brak udowodnionego Compare→Decide→Act→Verify dla bieżących odchyleń.
4. **Institutional learning promotion.** 105 learning records bez żadnego promoted target oznacza, że organizacja zapisuje lekcje szybciej, niż zmienia proces.
5. **Roost world model V1.** Obecna read-only portfolio/Company OS lane nie jest jeszcze wspólnym operational world state dla ownera i Paperclipa.
6. **Outcome/cost anti-Goodhart evidence.** Mała liczba deliveries, legacy acceptance i zerowy koszt nie pozwalają mierzyć realnej efektywności autonomii.

### P1 — poważnie ogranicza autonomię

1. Uzupełnić native control matrix (`runtime_health`, DB/deadlocks, fan-out, permission drift, sandbox bypass, outbox dead letters, context, cost/outcome i inne `not_configured`).
2. Połączyć detectowany bottleneck z trwałym TOC lifecycle i owner/SLA.
3. Uporządkować routine inventory: 0 active, 18 enabled triggers pod inactive records, legacy duplicates.
4. Ustalić jednoznaczny goal/initiative trace i target dates; ograniczyć fallback.
5. Naprawić znaczenie priority — 500 zwróconych issues ma `critical`.
6. Zbudować audited board policy surface dla session/runtime limits i autonomy levels.
7. Ujednolicić event bus/outbox; timer pozostawić głównie jako reconciler.
8. Uzupełnić circuit-breaker/degraded-mode/SLO contract per subsystem.
9. Ograniczyć 60 `blocked_unknown` i 40 review queue przez owned decision paths.
10. Zmniejszyć kruchość embedded-Postgres test harness; PASS z 57P02 nie powinien być normalnym sygnałem.

### P2 — zwiększy dojrzałość

1. First-class experiment/hypothesis/exposure/promotion model.
2. Formalny process effectiveness i routine retirement model.
3. Executable compensations/saga dla cross-system actions.
4. Competency/span-of-control/executive-IC metrics.
5. Unified epistemic envelope dla important issue/document claims.
6. Longitudinal autonomy and cost-per-outcome scorecard.

### P3 — docelowa optymalizacja

1. Zaawansowane semantic graph/RDF/BPMN interchanges po ustabilizowaniu Roost modelu.
2. Automatyczne model portfolio optimization na dużej próbce outcomes.
3. Redukcja częstotliwości reconcilers po osiągnięciu pełnego event coverage.
4. Dynamiczna reorganizacja struktur dopiero po dojrzałych role/outcome metrics.

## 9. Automation Retirement Map

| Existing external/manual mechanism | Why it exists | Internal capability that would replace it | Target layer | Preconditions | Can retire now? |
|---|---|---|---|---|---|
| Codex Watchdog automation | independent runtime/control coverage | complete native control matrix + durable alerts | Paperclip + Infrastructure | 14 clean daily windows, 0 external-only critical, no orphan/evidence gaps | No |
| Codex Operational Doctor assurance | falsyfikuje diagnosis/intervention | admitted Doctor with intervention+test+rollback+window | Paperclip | live intervention proof for every class, no false closure | No |
| Codex Daily Integrity | anti-Goodhart i evidence truth | native Daily with outcome/cost/safeguard parity | Paperclip + Roost KPI | fresh typed predicates, cost telemetry, 0 false-green | No |
| Codex Weekly Meta review | wykrywa architecture/process drift | process metrics, promotion/retirement, bounded Weekly | Paperclip + Roost | recurring causes absorbed, routine inventory clean | No |
| Codex direct code repair | Paperclip nie ma self-maintenance delivery lane o wystarczającym trust | governed self-delivery + independent review/deploy monitor | Paperclip + Infrastructure | scoped worktree, review, rollback, exact SHA deploy, owner gate | No |
| Codex runtime/DB diagnosis | niepełne native sensor coverage | native probes + finding + bounded Doctor | Infrastructure + Paperclip | full matrix, failure isolation, regression | Partially |
| Codex Roost production verification | protected cross-system authority | governed connector and typed protected readback | Paperclip + Roost + Infrastructure | least privilege, event audit, rollback, owner approval | Partially |
| Manual architecture decisions | semantic/risk authority należy do ownera | Roost decision record + proposals/evidence | Roost/Board | reliable evidence and alternatives; no self-grant | Should not fully retire |
| Manual autonomy boundary changes | agents nie mogą grantować sobie authority | audited board policy surface | Paperclip/Board | change audit, eval, rollback, observation | Should not retire |
| Manual GPT architecture audit | independent challenge model | mature external assurance or periodic human audit | External/Board | internal metrics cannot self-certify all governance | Reduce, not eliminate |

Minimalny retirement gate powinien zachować warunek z obecnego raportu runtime: 14 kolejnych daily windows z zero external-only critical, zero false-green, pełną cost/session telemetry, brak orphan locks, brak evidence-free completion, świeże typed predicates dla każdego accepted real delivery oraz native regression dla każdej historycznej klasy zewnętrznej interwencji.

## 10. Autonomy Scorecard

| Dimension | Score 0–10 | Rationale |
|---|---:|---|
| Goal alignment | 6.0 | ancestry i fallback działają, lecz brakuje strategicznego graphu i targetów |
| Observability | 6.5 | szeroki sensor set i live projections; nadal external-only gaps |
| World model | 4.5 | mocny operating model, niedojrzały wspólny Roost world state |
| Memory | 5.5 | wiele klas pamięci, ale rozproszenie i brak promotion discipline |
| Causal learning | 6.0 | bardzo dobra struktura, słaby live intervention proof |
| Planning | 4.5 | dobra dekompozycja, słabe strategic/replanning/value pruning |
| Delegation | 6.8 | direct-child, admission, reports, reviewer separation i bounds |
| Quality assurance | 5.8 | mocne nowe gates, duży legacy evidence debt |
| Epistemic reliability | 6.2 | provenance/freshness/unknown/quarantine istnieją, użycie nierówne |
| Risk management | 6.7 | permission/admission/decision contracts, brak unified risk model |
| Anti-Goodhart protection | 5.8 | separation outcome/task jest świetna, próbka outcomes i koszt słabe |
| Coordination | 7.6 | checkout/locks/leases/dedupe/recovery są jednym z najmocniejszych obszarów |
| Resilience | 7.0 | szerokie retry/recovery/fail-closed, niepełne circuit/degraded contract |
| Resource efficiency | 6.2 | session/context/model routing mocne, economics data niewiarygodne |
| Event-driven operation | 5.8 | wiele event wakes, ale timer/cron pozostaje centralny |
| Self-healing | 5.4 | bounded actions istnieją, aktualne failed cycles nie generują actions |
| Meta-learning | 5.0 | Weekly/shadow/evals istnieją, process retirement nie działa systemowo |
| Institutional learning | 4.6 | 105 candidates, 0 promoted — najważniejszy maturity limiter |

**Overall Autonomy Maturity: 5.2/10.**

System posiada wystarczające fundamenty do ograniczonej autonomii lokalnej z kontrolą człowieka. Nie posiada jeszcze wystarczających dowodów, by samodzielnie certyfikować własną poprawność, wyniki biznesowe i zdolność do uczenia się bez zewnętrznego nadzoru. Cap wyniku wynika z P0, a nie ze średniej scorecard.

## 11. Rekomendowany kierunek — bez wdrażania teraz

Najbezpieczniejsza ewolucja nie polega na dodawaniu nowych wielkich subsystemów. Powinna iść w tej kolejności:

1. **Domknąć istniejący supervision lifecycle**, zanim powstanie kolejny watchdog lub planner.
2. **Absorbować external-only checks** do obecnej native matrix; nie tworzyć drugiego findings registry.
3. **Promować istniejące learning observations** do procedure/instruction/skill/routine/policy i wymagać regression + observation; nie dodawać kolejnego memory store.
4. **Rozszerzać Roost jako world/knowledge model** przez stable refs/API/MCP; nie kopiować jego encji do Paperclipa.
5. **Oprzeć priorytety i planning na ProductOutcome/ProductDelivery**, nie na liczbie issues.
6. **Wygaszać legacy routines/scripts dopiero po coverage proof**, zachowując cron jako reconciler.
7. **Utrzymać external automations read-only**, aż 14-dniowy gate zostanie faktycznie spełniony.

## 12. Ograniczenia, uncertainty i robustness checks

- Audyt obejmuje brudny working tree. Część ocenionych capabilities nie jest jeszcze zatwierdzona w HEAD ani PR-ready.
- Live list issue jest limitowana; exact 500-row priority/status sample nie jest pełnym licznikiem całej historii. `CompanySituation` ma własne agregaty i podał 115 open work, podczas gdy zwrócona lista 500 pokazała 53 nonterminal. To wskazuje różne population/filter/limit semantics i wymaga osobnego data-quality wyjaśnienia.
- Supervision snapshot zwraca maksymalnie 500 cycles; 497 Watchdog może wypierać część starszych Daily/Weekly. Kod Weekly istnieje, ale bieżący snapshot nie wystarcza do pełnej historii cadence.
- `0 interventions` oznacza brak rekordów w aktualnym snapshotcie, nie dowodzi, że żadna manualna lub historyczna naprawa nigdy nie nastąpiła.
- Testy 44/44 przeszły, ale log zawierał ostrzeżenia PostgreSQL 57P02. Po suite kanoniczny health pozostał `ok`, jedyny master PostgreSQL słuchał na 54329, a wszystkie 20 children należały do tego mastera; nie znaleziono testowego listenera.
- Nie uruchamiano pełnego `pnpm test:run`, repo-wide typecheck ani build, ponieważ zadanie było read-only audytem, a targeted proof był proporcjonalny do zakresu.
- Nie wykonywano mutujących routines, supervision cycles, Doctor dispatch, shadow comparison POST ani zmian boardu.

## 13. Further questions dla następnej analizy GPT

1. Czy `native-control-contract.ts` powinien być canonical control catalog, skoro większość check IDs pozostaje niezasilona przez engine?
2. Dlaczego findings w `admission_pending` nie tworzą interventions — brak Doctor, admission denial, brak ownera czy zamierzona separacja?
3. Czy 37 inactive routines ma zostać zarchiwizowanym audit trail, czy część powinna zostać scalona z native schedulerem?
4. Jak wyjaśnić rozjazd 115 open w CompanySituation vs 53 nonterminal w 500-row issue listing?
5. Czy all-critical priority to świadoma polityka Softwarehouse, czy degradacja sygnału priorytetu?
6. Które 5 latest external-only fingerprints są rzeczywiście brakującymi detectorami, a które różnicą taxonomy/severity?
7. Jaki powinien być obowiązkowy Roost reference contract dla goal/initiative/offering/process?
8. Kto jest accountable ownerem learning promotion i jaki SLA obowiązuje po `validated`?
9. Jak dużo z 240 completion-evidence debt można revalidować, a ile powinno pozostać `unknown`?
10. Jak odróżnić koszt zero z braku ingestu od kosztu zero wynikającego z subscription/local execution?
11. Które actions wymagają typed executable compensation zamiast tekstowego rollback planu?
12. Jak mierzyć executive attention i CEO/director IC ratio bez tworzenia vanity metric?

## 14. Verification record

Uruchomiono:

```text
node node_modules/vitest/vitest.mjs run
  server/src/__tests__/native-supervision-engine.test.ts
  server/src/__tests__/supervision-registry-service.test.ts
  server/src/__tests__/session-runtime-budget.test.ts
  server/src/__tests__/context-admission.test.ts
  server/src/__tests__/admission-control-service.test.ts
  server/src/__tests__/company-situation-service.test.ts
  server/src/__tests__/organizational-record-service.test.ts
  server/src/__tests__/organizational-observation-service.test.ts
  server/src/services/issue-decision-contract.test.ts
  server/src/services/routine-dispatch-policy.test.ts
  --maxWorkers=1 --minWorkers=1
```

Wynik: **10 test files passed; 44 tests passed; exit 0; 344.83 s.**

Sprawdzono po testach:

- `GET /api/health`: `status=ok`, version `0.3.1`;
- Paperclip listener: `127.0.0.1:3200`;
- canonical PostgreSQL master: PID 2044, port `54329`, data dir `.paperclip/runtime/home/instances/default/db`;
- brak dodatkowego PostgreSQL listenera po suite;
- git working tree pozostał brudny tak jak przed audytem; audyt dodał wyłącznie ten raport.

