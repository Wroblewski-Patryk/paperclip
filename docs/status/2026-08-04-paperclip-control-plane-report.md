# Paperclip — raport powdrożeniowy

Data: 2026-08-04  
Zakres: context admission, correction loop, bottleneck routing, native supervision, quota, Roost i produkcyjny ProductDelivery.

Legenda: `VERIFIED` — dowód testowy lub statyczny; `OBSERVED` — stan zaobserwowany live; `DOCUMENTED` — kontrakt/config; `INFERRED` — wniosek; `UNKNOWN` — brak danych; `NOT TESTED` — brak wymaganego testu.

## A. Executive summary

- **[VERIFIED]** Wdrożono hard context admission, source telemetry, issue-scoped quota hold, 12 persistowanych typów bottlenecków, stalled-ready dispatch i wspólny kontrakt 27 kontroli. Targetowane testy przeszły 12/12, a typecheck serwera jest zielony.
- **[OBSERVED]** Live flow wykonał `CHANGES_REQUIRED → korekta przez pierwotnego wykonawcę → niezależny re-review → ACCEPTED`, rozwiązał jeden owner bottleneck i zatrzymał run przy 315,92× limitu.
- **[OBSERVED]** Realna zmiana Roosta została wdrożona produkcyjnie pod SHA `893c8536e9243bc7af17e3e21a5f4104a368d63c`; publiczny health zwrócił ten commit.
- **[OBSERVED]** Protected readback zwrócił dokładny source snapshot, lecz również `projectionStatus=conflict` i `freshness.status=stale`. Warunek „ta sama wersja bez conflict” nie przeszedł.
- **[INFERRED]** Iteracja osiągnęła 7 z 8 warunków zakończenia w całości lub w wymaganym zakresie kontrolnym. Roost readback jest częściowy/negatywny i blokuje bezwarunkowe zamknięcie.

## B. Context

- **[DOCUMENTED]** Baseline z poprzedniego raportu: około 6,82 mln raw input tokens dla dwóch outcomes, około 3,41 mln/outcome.
- **[OBSERVED]** Pakiet kontrolny 46 320 tokenów był o około 82–92% mniejszy od świeżych runów 256k, 333k i 599k. Kolejne admitted packets miały 13 410/14 000 oraz 13 470/16 000 tokenów.
- **[VERIFIED]** Manifest zapisuje source, type, bytes, token estimate, reason, requirement, freshness, owner, hash/version, on-demand, included i reduction. Gate usuwa optional, używa referencji/syntezy, a następnie fail-closed z findingiem. Override jest systemowy i wygasa.
- **[VERIFIED]** Context tests: 4/4 — run pod limitem, optional reduction, fail-closed, expiry override i attribution per source.
- **[OBSERVED]** Co najmniej dwa review runy zostały hard-rejected. Błąd fallbacku z limitem 1 token został naprawiony.
- **[OBSERVED]** Mandatory `AGENTS.md` i bootstrap roli dominują w minimalnym pakiecie; pełny live ranking zbędnych źródeł z Daily Audit nie istnieje.
- **[OBSERVED]** Całe sesje nadal były kosztowne: implementacja około 1,08 mln raw, wcześniejszy reviewer około 1,37 mln, finalny reviewer 448 969. Gate ogranicza preloaded packet, nie łączny koszt sesji.
- **[NOT TESTED]** Brak live pomiaru realnego on-demand retrieval oraz post-fix live review z prawidłową klasyfikacją roli i limitem 12k.

## C. Correction loop

- **[OBSERVED]** Delivery `006c4a3c-6f17-4d7e-a423-3ec0069de2b8`; parent LUC-2527; implementation LUC-2528; review LUC-2529.
- **[OBSERVED]** CBE wykonała bazową zmianę (`86e489b1e0909ed41338a796357feea678173be0`). CRS zwrócił typed `CHANGES_REQUIRED` z powodu niedeterministycznych testów granic freshness i nie naprawiał kodu.
- **[OBSERVED]** Korekta wróciła do tej samej CBE. Po ograniczeniu sandboxa commit zapisano ręcznie jako `893c8536e9243bc7af17e3e21a5f4104a368d63c`; Roost API tests przeszły 8/8.
- **[OBSERVED]** Finalny CRS zaakceptował bazę i korektę w runie `48058477-782c-4de0-9427-1e09e476ff01`. Nie powstało równoległe delivery ani nie zmieniono wykluczonego pliku użytkownika.
- **[OBSERVED]** Ręczne odstępstwa: typed delivery transitions, anulowanie zawieszonego re-review, przywrócenie reviewera po błędzie limitu 1 token i ręczny commit korekty.
- **[UNKNOWN]** Brak jednego wiarygodnego mianownika tokenów/outcome po rozdzieleniu cache, retry i pracy kontrolnej.

## D. Bottlenecki

- **[VERIFIED]** Persistowane klasy: admission, delegation, owner, executor, review, correction, integration, deployment, observation, reporting, context i quota bottleneck. Rekord zawiera ownera, start, stage, dependency, SLA, next action, escalation condition, evidence i resolvedAt.
- **[OBSERVED]** Finding `11a087f6-4350-439b-8fab-ab0021837bce` dla stalled-ready Roost delivery został routed do EDL, a po delegacji do CBE/CRS automatycznie przeszedł do `resolved/healthy` o 19:00:35Z.
- **[VERIFIED]** Watchdog nie wykonuje pracy produktowej i nie uznaje delivery z delegowanym executable child za nadal stalled.
- **[NOT TESTED]** Najnowszy embedded-Postgres test rekonsyliacji utknął przy `initdb` i został bezpiecznie przerwany. Wcześniejsze 5/5 testów engine pochodzi sprzed ostatniej poprawki.
- **[NOT TESTED]** Brak osobnego live proof dla review, correction i deployment bottleneck oraz pomiaru wpływu na WIP CTO/AIA/EDL/CINO.

## E. Natywny supervision

- **[VERIFIED]** Macierz zawiera dokładnie 27 wymaganych `check_id` i pola: `check_version`, status, severity, scope, evidence_refs, measured_value, threshold, finding_fingerprint, native_action, owner, next_check_at.
- **[VERIFIED]** Kontrakt konsoliduje wynik bez superwatchdoga. Brakujące implementacje zwracają jawnie `not_configured`.
- **[DOCUMENTED]** Watchdog pozostaje deterministyczny, Doctor event-driven, Daily deterministyczny, Weekly agregatowy, external assurance read-only.
- **[NOT TESTED]** Brak świeżego live cyklu całej macierzy po zmianie nazw. Database health, dead locks, fan-out, evidence completeness, documentation growth, outbox dead letters, accepted outcomes i cost/outcome nie mają pełnych natywnych pomiarów.
- **[UNKNOWN]** Brak serii zgodnych native-vs-external comparisons.

## F. Quota

- **[VERIFIED]** Progi: warning 70%, throttle 90%, hold 100%, emergency 200%. Testy warning/throttle/hold/emergency, agent-bypass i critical-closeout exception przeszły 7/7.
- **[OBSERVED]** Run `b1b059ba-7fa5-4b8c-8f2a-1f254f312b58` zatrzymał się przed adapterem przy 4 422 876 raw input tokens, limicie 14 000 i wykorzystaniu 315,92×. Inny agent nie ominął limitu.
- **[OBSERVED]** Finding `a77b00cf-1822-400e-9e9c-9236840b6598` utrwalił `quota_bottleneck`; zewnętrzny error code nadal jest ogólnym `adapter_failed`.
- **[VERIFIED]** Critical closeout exception wynika z etapu delivery i decision contract, nie z deklaracji caller’a.
- **[NOT TESTED]** Critical exception nie przeszedł live.
- **[NOT TESTED]** Brak zunifikowanego quota dla organization/project/delivery/agent/routine/supervision/model i jednostek uncached input/run count/time/accepted outcome.
- **[UNKNOWN]** Quota/outcome i control/product ratio nie są jeszcze policzalne rzetelnie.

## G. Roost

- **[OBSERVED]** Outbox event `0dfb1e7c-5242-4d5d-8784-57cc5ac536a7` był published z source snapshot `a80ac4ef8e288deb4a3186b836e162163495436e514fc0e35a1758635c4f2a11`; protected readback zwrócił dokładnie tę wersję.
- **[OBSERVED]** Ephemeral key miał tylko `product-map:projection:read`; read=200, write=403, sekret nie pojawił się w output, key i bindings usunięto.
- **[OBSERVED]** Duplicate: 200/duplicate bez zmiany stanu. Older/out-of-order z nowym idempotency key: 409/rejected.
- **[OBSERVED]** checkedAt 19:08:48Z, observedAt 19:06:39Z, lag około 128 s, TTL 900 s, LKG window 24 h; mimo wieku poniżej TTL status był `stale`.
- **[OBSERVED]** `projectionStatus=conflict`, choć source projection miało `conflictState=none`; konflikt pochodzi z lokalnego lifecycle Roosta. Kryterium „bez conflict” nie przeszło.
- **[OBSERVED]** Rekord został opublikowany po restarcie procesu Paperclip.
- **[NOT TESTED]** Brak izolowanego pending-during-restart recovery testu.

## H. Produkcyjny delivery

- **[OBSERVED]** Projekt: Roost. Problem: chroniony product-map readback nie pokazywał wieku i granic ważności. Dodano checkedAt, observedAt, ageMs, lagMs, ttlMs, lastKnownGoodWindowMs i status do API i dokumentacji.
- **[OBSERVED]** Hierarchia: EDL parent, CBE executor, CRS niezależny reviewer; review wymusiło deterministyczne testy granic.
- **[VERIFIED]** `npm run test:api:local`: server/web build, 33 migracje na disposable PostgreSQL, 8/8 testów.
- **[OBSERVED]** Exact integration/push/deploy SHA: `893c8536e9243bc7af17e3e21a5f4104a368d63c`. `HEAD → origin/main` przeszedł, publiczny health zwrócił `ok` i ten commit.
- **[OBSERVED]** Delivery przeszedł push_ready, deployed i observed_healthy; outcome zapisano jako achieved/accepted.
- **[INFERRED]** Acceptance było przedwczesne wobec konfliktowego readbacku. Zdrowy deploy nie dowodzi zdrowej projekcji biznesowej.
- **[OBSERVED]** Ręczne odstępstwa obejmowały transitions delivery/outcome, commit po sandbox failure, anulowanie re-review i recovery assignment.

## I. Automatyzacje zewnętrzne

- **[DOCUMENTED]** External Watchdog: co 6 h; Doctor: daily; Daily: daily; Weekly: weekly. Wszystkie pozostają read-only.
- **[NOT TESTED]** Brak porównywalnego kosztu i external-only findings względem nowej macierzy.
- **[INFERRED]** Nie należy jeszcze zmniejszać częstotliwości po jednym zielonym cyklu. Potrzebne są liczne zgodne porównania recall, kosztu, autonomy, hierarchy, outcome i freshness.
- **[INFERRED]** Docelowo Doctor może być event-driven, Daily codziennie/co drugi dzień, Weekly tygodniowy; Watchdog 1/day dopiero po trendzie.

## J. Pozostałe ryzyka

- **[OBSERVED]** Context gate ogranicza packet, ale sesje nadal kumulują bardzo duży raw input.
- **[NOT TESTED]** Brakuje live proof dla review/correction/deployment routing, critical quota exception, role-fix review i pending-event restartu.
- **[OBSERVED]** Outcome zaakceptowano mimo konfliktowego readbacku — evidence gate można ręcznie ominąć semantycznie.
- **[UNKNOWN]** Brak wielodniowego trendu tokenów/outcome, bottleneck SLA, external recall i Roost freshness.
- **[INFERRED]** Najbardziej prawdopodobna regresja to szeroki bootstrap lub ręczne board transitions, gdy admission/hierarchy zatrzyma run.
- **[NOT TESTED]** Po całym zestawie zmian nie uruchomiono repo-wide `pnpm -r typecheck`, `pnpm test:run` i `pnpm build`.

## K. Materiał do falsyfikacji

- **[INFERRED] Najsłabiej udowodnione twierdzenie:** pełna autonomia delivery. Deployment przeszedł, ale orchestration wymagała ręcznych korekt, a outcome zaakceptowano mimo conflict.
- **[INFERRED] Najbardziej prawdopodobny powrót starego zachowania:** szeroki role/bootstrap context przy nowej roli lub braku nativeContext.
- **[OBSERVED] Największy koszt:** długie sesje implementation/review i retry, nie sam task packet.
- **[INFERRED] Aktywność mylona z outcome:** `deployed + health=ok` wystarczyło do acceptance mimo konfliktu biznesowego.
- **[INFERRED] Element do usunięcia bez wartości:** okresowy external Doctor, jeśli po kilku cyklach nie wniesie external-only findings; wtedy pozostawić tylko event-driven.

Następne testy falsyfikujące:

1. **[INFERRED]** Zablokować acceptance, gdy protected-readback predicates nie przechodzą, i ponowić mutację Roost do stanu bez conflict.
2. **[INFERRED]** Rozszerzyć quota na wszystkie wymagane scope/jednostki i dodać dedykowany error code.
3. **[INFERRED]** Wykonać live review po role fix, live review/deployment bottleneck routing i izolowany pending publisher restart.
4. **[INFERRED]** Po stabilizacji wykonać pełny PR-ready check oraz kilkudniowe okno trendu.

## Weryfikacja raportu

- **[VERIFIED]** `vitest`: context admission 4/4, execution quota 7/7, native control contract 1/1.
- **[VERIFIED]** `pnpm --filter @paperclipai/server typecheck` przeszedł.
- **[VERIFIED]** Kanoniczny JSON raportu przeszedł walidację i renderowanie danych portable report buildera.
- **[NOT TESTED]** Finalny portable HTML nie został opublikowany: wspólny browser verifier wykrył poziomy overflow na 1440 px po kilku poprawkach. Nie wyłączono QA ani nie dostarczono pliku z błędem.
