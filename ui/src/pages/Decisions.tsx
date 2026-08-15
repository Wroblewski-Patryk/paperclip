import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AskUserQuestionsInteraction, DecisionCenterItem, DecisionCenterState } from "@paperclipai/shared";
import { AlertTriangle, ArrowLeft, ArrowRight, Ban, Bot, CalendarClock, CheckCircle2, ChevronRight, CircleHelp, FileClock, History, ListChecks, LockKeyhole, MessagesSquare, RotateCcw, Search, ShieldCheck, Target } from "lucide-react";
import { agentsApi } from "../api/agents";
import { approvalsApi } from "../api/approvals";
import { decisionsApi } from "../api/decisions";
import { issuesApi } from "../api/issues";
import { ApprovalCard } from "../components/ApprovalCard";
import { IssueThreadInteractionCard } from "../components/IssueThreadInteractionCard";
import { PageTabBar } from "../components/PageTabBar";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Tabs } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { queryKeys } from "../lib/queryKeys";
import { Link } from "../lib/router";
import { cn, formatDateTime } from "../lib/utils";

type VisibleTab = Exclude<DecisionCenterState, "preparing">;

const riskClasses: Record<DecisionCenterItem["risk"], string> = {
  low: "border-blue-500/40 bg-blue-500/10 text-blue-900 dark:text-blue-100",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  high: "border-orange-500/50 bg-orange-500/10 text-orange-900 dark:text-orange-100",
  critical: "border-destructive/50 bg-destructive/10 text-destructive",
};

const riskLabels: Record<DecisionCenterItem["risk"], string> = {
  low: "niskie",
  medium: "średnie",
  high: "wysokie",
  critical: "krytyczne",
};

const urgencyLabels: Record<DecisionCenterItem["urgency"], string> = {
  low: "niska",
  medium: "średnia",
  high: "wysoka",
  critical: "krytyczna",
};

const categoryLabels: Record<DecisionCenterItem["category"], string> = {
  confirmation: "Potwierdzenie",
  information_request: "Brakująca informacja",
  task_proposal: "Propozycja zakresu",
  formal_approval: "Formalna zgoda",
};

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function isOpenQuestionFact(value: string) {
  return /\b(brak (?:autorytatywnego|potwierdzenia|dowodu|dostępu|informacji)|niezweryfik|nie udało się|oczekuje na|pozostaje do|wymaga wyjaśnienia|unknown|missing|not verified)\b/iu.test(value);
}

function isSafetyFact(value: string) {
  return /^(ryzyko|ograniczenie|warunek bezpieczeństwa)|\b(fail[- ]closed|least[- ]privilege|read[- ]only|redacted|tylko do odczytu)\b/iu.test(value);
}

function stripRiskPrefix(value: string) {
  return value.replace(/^Ryzyko wskazane we wniosku:\s*/iu, "");
}

function decisionSummary(item: DecisionCenterItem) {
  const briefing = item.ownerBriefing;
  return briefing?.plainLanguageSummary
    ?? briefing?.contextFacts[0]
    ?? item.summary
    ?? item.issue?.title
    ?? item.title;
}

function deferDate(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function Decisions() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<VisibleTab>("ready");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setBreadcrumbs([{ label: "Decisions" }]), [setBreadcrumbs]);

  const decisionQuery = useQuery({
    queryKey: queryKeys.decisions(selectedCompanyId ?? ""),
    queryFn: () => decisionsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
    refetchInterval: 30_000,
  });
  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId ?? ""),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });
  const agentMap = useMemo(
    () => new Map((agentsQuery.data ?? []).map((agent) => [agent.id, agent] as const)),
    [agentsQuery.data],
  );
  const items = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (decisionQuery.data?.items ?? []).filter((item) => {
      if (item.state !== tab) return false;
      if (!needle) return true;
      return [item.title, item.summary, item.issue?.identifier, item.issue?.title, item.ownerBriefing?.decision]
        .some((value) => value?.toLowerCase().includes(needle));
    });
  }, [decisionQuery.data?.items, search, tab]);
  const current = items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  const currentIndex = current ? items.findIndex((item) => item.id === current.id) : -1;

  useEffect(() => {
    setSelectedId(null);
    setNote("");
    setActionError(null);
  }, [tab]);
  useEffect(() => {
    setNote("");
    setActionError(null);
  }, [current?.id]);

  function invalidate(item?: DecisionCenterItem | null) {
    if (!selectedCompanyId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.decisions(selectedCompanyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.sidebarBadges(selectedCompanyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.companySituation(selectedCompanyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(selectedCompanyId) });
    if (item?.issue) {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.interactions(item.issue.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(item.issue.id) });
    }
  }

  const actionMutation = useMutation({
    mutationFn: async (action: () => Promise<unknown>) => action(),
    onSuccess: () => { setActionError(null); invalidate(current); },
    onError: (error) => setActionError(error instanceof Error ? error.message : "Nie udało się zapisać decyzji"),
  });
  const deferMutation = useMutation({
    mutationFn: ({ item, deferredUntil }: { item: DecisionCenterItem; deferredUntil: string }) =>
      decisionsApi.defer(item.companyId, item.sourceType, item.sourceId, { deferredUntil, note: note.trim() || null }),
    onSuccess: () => { setActionError(null); invalidate(current); },
    onError: (error) => setActionError(error instanceof Error ? error.message : "Nie udało się odłożyć decyzji"),
  });
  const clearDeferMutation = useMutation({
    mutationFn: (item: DecisionCenterItem) => decisionsApi.clearDefer(item.companyId, item.sourceType, item.sourceId),
    onSuccess: () => { setActionError(null); invalidate(current); },
    onError: (error) => setActionError(error instanceof Error ? error.message : "Nie udało się przywrócić decyzji"),
  });

  if (!selectedCompanyId) return <p className="text-sm text-muted-foreground">Najpierw wybierz firmę.</p>;
  if (decisionQuery.isLoading) return <div className="paperclip-surface h-72 animate-pulse" />;
  if (decisionQuery.error) return <p className="text-sm text-destructive">{decisionQuery.error.message}</p>;

  const counts = decisionQuery.data?.counts ?? { ready: 0, preparing: 0, deferred: 0, allOpen: 0 };
  const historyCount = (decisionQuery.data?.items ?? []).filter((item) => item.state === "resolved").length;

  function selectAt(index: number) {
    const item = items[index];
    if (!item) return;
    setSelectedId(item.id);
  }

  function selectFromList(itemId: string) {
    setSelectedId(itemId);
    if (typeof window.matchMedia === "function" && window.matchMedia("(max-width: 1023px)").matches) {
      window.requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Centrum decyzji</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Najpierw dostajesz sens sprawy, zakres i rekomendację. Dopiero potem odpowiadasz.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-sm border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Bot className="h-4 w-4 text-primary" />
          <span><strong className="font-medium text-foreground">AIA przygotowuje {counts.preparing}</strong> spraw poza Twoją kolejką</span>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as VisibleTab)}>
        <PageTabBar align="start" value={tab} onValueChange={(value) => setTab(value as VisibleTab)} items={[
          { value: "ready", label: `Do decyzji ${counts.ready}` },
          { value: "deferred", label: `Odłożone ${counts.deferred}` },
          { value: "resolved", label: `Historia ${historyCount}` },
        ]} />
      </Tabs>

      <div className="grid min-h-[620px] gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b border-border px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-sm"><ListChecks className="h-4 w-4" /> Lista decyzji</CardTitle>
              <span className="text-xs tabular-nums text-muted-foreground">{items.length}</span>
            </div>
            <div className="relative mt-3">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Szukaj decyzji…" className="pl-8" />
            </div>
          </CardHeader>
          <CardContent className="max-h-[720px] overflow-y-auto p-2">
            {items.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
                <CheckCircle2 className="mb-3 h-7 w-7 text-muted-foreground/40" />
                <p className="text-sm font-medium">Brak decyzji w tej sekcji</p>
                <p className="mt-1 text-xs text-muted-foreground">Sprawy techniczne pozostają po stronie Paperclipa.</p>
              </div>
            ) : items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectFromList(item.id)}
                aria-pressed={current?.id === item.id}
                className={cn(
                  "mb-1 w-full rounded-sm border px-3 py-3 text-left transition-colors",
                  current?.id === item.id ? "border-primary/50 bg-primary/10" : "border-transparent hover:border-border hover:bg-muted/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="line-clamp-2 text-sm font-medium leading-5">{item.ownerBriefing?.decision ?? item.title}</span>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                {item.issue?.title ? <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.issue.title}</p> : null}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{item.issue?.identifier ?? categoryLabels[item.category]}</span><span>·</span>
                  <span className={cn("rounded-sm border px-1.5 py-0.5", riskClasses[item.risk])}>{riskLabels[item.risk]}</span><span>·</span>
                  <span>{formatDateTime(item.createdAt)}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {!current ? (
          <div className="paperclip-empty-state flex min-h-96 flex-col items-center justify-center text-center">
            <ShieldCheck className="mb-3 h-9 w-9 text-muted-foreground/35" />
            <p className="text-sm font-medium">Nie masz teraz decyzji do podjęcia</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">AIA pokaże tutaj tylko kompletny, właścicielski pakiet decyzyjny.</p>
          </div>
        ) : (
          <div ref={detailRef} className="min-w-0 scroll-mt-4 space-y-4">
            <div className="paperclip-surface flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Decyzja {currentIndex + 1} z {items.length}</span>
                  <span>·</span>
                  <span>najpierw poznaj kontekst, potem odpowiedz</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${items.length > 0 ? ((currentIndex + 1) / items.length) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
                <Button variant="outline" size="sm" onClick={() => selectAt(currentIndex - 1)} disabled={currentIndex <= 0} aria-label="Poprzednia decyzja">
                  <ArrowLeft className="h-3.5 w-3.5" /> Poprzednia
                </Button>
                <Button variant="outline" size="sm" onClick={() => selectAt(currentIndex + 1)} disabled={currentIndex < 0 || currentIndex >= items.length - 1} aria-label="Następna decyzja">
                  Następna <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <Card className="gap-4 py-5">
              <CardHeader className="px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-primary">
                      <Bot className="h-4 w-4" /> Krok 1 · Wyjaśnienie decyzji
                      <span className="rounded-sm border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {categoryLabels[current.category]}
                      </span>
                      {current.state === "resolved" ? <span className="inline-flex items-center gap-1 text-muted-foreground"><History className="h-3.5 w-3.5" /> Historia</span> : null}
                    </div>
                    <CardTitle className="text-lg leading-7">{current.ownerBriefing?.decision ?? current.title}</CardTitle>
                    {current.issue ? <Link to={`/issues/${current.issue.id}`} className="mt-2 inline-flex text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Źródło: {current.issue.identifier} · {current.issue.title}</Link> : null}
                  </div>
                  <span className={cn("rounded-sm border px-2 py-1 text-[11px] font-medium uppercase tracking-wide", riskClasses[current.risk])}>
                    ryzyko {riskLabels[current.risk]} · pilność {urgencyLabels[current.urgency]}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 px-5">
                {current.state === "resolved" ? (
                  <div className="flex items-start gap-2 rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-950 dark:text-emerald-100">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span><strong>Zakończona sprawa.</strong> To zapis historyczny — nie wymaga ponownego działania.</span>
                  </div>
                ) : null}
                <DecisionSnapshot item={current} />
                {current.ownerBriefing ? <DecisionBriefing item={current} /> : (
                  <p className="text-sm text-muted-foreground">Historyczny wpis nie ma współczesnego briefu AIA.</p>
                )}
                {current.state === "ready" ? (
                  <div className="flex justify-end border-t border-border pt-4">
                    <Button onClick={() => answerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                      Przejdź do odpowiedzi <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {current.interaction ? (
              <div ref={answerRef} className="scroll-mt-4 space-y-2">
                <div className="flex items-center gap-2 px-1 text-sm font-medium"><MessagesSquare className="h-4 w-4" /> Krok 2 · {current.state === "resolved" ? "Zapisana odpowiedź" : "Twoja odpowiedź"}</div>
                <IssueThreadInteractionCard
                  interaction={current.interaction}
                  agentMap={agentMap}
                  onAcceptInteraction={current.state === "ready" ? async (interaction, selectedClientKeys) => {
                    await actionMutation.mutateAsync(() => issuesApi.acceptInteraction(interaction.issueId, interaction.id, { selectedClientKeys }));
                  } : undefined}
                  onRejectInteraction={current.state === "ready" ? async (interaction, reason) => {
                    await actionMutation.mutateAsync(() => issuesApi.rejectInteraction(interaction.issueId, interaction.id, reason));
                  } : undefined}
                  onSubmitInteractionAnswers={current.state === "ready" ? async (interaction: AskUserQuestionsInteraction, answers) => {
                    await actionMutation.mutateAsync(() => issuesApi.respondToInteraction(interaction.issueId, interaction.id, { answers }));
                  } : undefined}
                  onCancelInteraction={current.state === "ready" ? async (interaction: AskUserQuestionsInteraction) => {
                    await actionMutation.mutateAsync(() => issuesApi.cancelInteraction(interaction.issueId, interaction.id, note.trim() || undefined));
                  } : undefined}
                />
              </div>
            ) : current.approval ? (
              <div ref={answerRef} className="scroll-mt-4 space-y-2">
                <div className="flex items-center gap-2 px-1 text-sm font-medium"><MessagesSquare className="h-4 w-4" /> Krok 2 · {current.state === "resolved" ? "Zapisana odpowiedź" : "Twoja odpowiedź"}</div>
                <ApprovalCard
                  approval={current.approval}
                  requesterAgent={current.approval.requestedByAgentId ? agentMap.get(current.approval.requestedByAgentId) ?? null : null}
                  onApprove={() => actionMutation.mutate(() => approvalsApi.approve(current.approval!.id, note.trim() || undefined))}
                  onReject={() => actionMutation.mutate(() => approvalsApi.reject(current.approval!.id, note.trim() || undefined))}
                  detailLink={`/approvals/${current.approval.id}`}
                  isPending={actionMutation.isPending}
                  language="pl"
                  showPayload={false}
                />
              </div>
            ) : null}

            {current.state !== "resolved" ? (
              <Card className="gap-3 py-4">
                <CardContent className="space-y-3 px-5">
                  <div className="flex items-center gap-2 text-sm font-medium"><MessagesSquare className="h-4 w-4" /> Notatka do decyzji</div>
                  <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Opcjonalne uzasadnienie lub korekta. Nie wklejaj sekretów — podaj tylko alias referencji." className="min-h-20" />
                  <div className="flex flex-wrap items-center gap-2">
                    {current.state === "ready" ? <>
                      <Button variant="outline" size="sm" onClick={() => deferMutation.mutate({ item: current, deferredUntil: deferDate(1) })}><CalendarClock className="mr-1.5 h-3.5 w-3.5" /> Za godzinę</Button>
                      <Button variant="outline" size="sm" onClick={() => deferMutation.mutate({ item: current, deferredUntil: deferDate(24) })}>Jutro</Button>
                      <Button variant="outline" size="sm" onClick={() => deferMutation.mutate({ item: current, deferredUntil: deferDate(168) })}>Za 7 dni</Button>
                    </> : <Button variant="outline" size="sm" onClick={() => clearDeferMutation.mutate(current)}>Przywróć do decyzji</Button>}
                  </div>
                </CardContent>
              </Card>
            ) : null}
            {actionError ? <div className="flex items-center gap-2 rounded-sm border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"><AlertTriangle className="h-4 w-4" /> {actionError}</div> : null}
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionSnapshot({ item }: { item: DecisionCenterItem }) {
  const nextStep = item.ownerBriefing?.afterApproval[0] ?? item.recommendedAction;
  return (
    <section aria-label="Decyzja w skrócie" className="grid gap-3 md:grid-cols-3">
      <div className="rounded-sm border border-primary/35 bg-primary/10 p-4 md:col-span-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
          <CircleHelp className="h-4 w-4" /> W skrócie
        </h2>
        <p className="mt-2 text-base font-medium leading-7">{decisionSummary(item)}</p>
      </div>
      <div className="paperclip-inset p-3">
        <div className="text-xs font-medium text-muted-foreground">Dlaczego pyta Ciebie?</div>
        <p className="mt-1 text-sm leading-6">{item.whyOwner}</p>
      </div>
      <div className="paperclip-inset p-3">
        <div className="text-xs font-medium text-muted-foreground">Co masz zrobić?</div>
        <p className="mt-1 text-sm leading-6">{item.ownerBriefing?.decision ?? item.title}</p>
      </div>
      <div className="paperclip-inset p-3">
        <div className="text-xs font-medium text-muted-foreground">Co stanie się potem?</div>
        <p className="mt-1 text-sm leading-6">{nextStep ?? "Paperclip zapisze wynik i przekaże go właściwemu agentowi."}</p>
      </div>
    </section>
  );
}

function FactList({ items, tone = "default" }: { items: string[]; tone?: "default" | "warning" | "safe" }) {
  const dotClass = tone === "warning" ? "bg-amber-500" : tone === "safe" ? "bg-emerald-500" : "bg-primary";
  return (
    <ul className="mt-2 space-y-2">
      {items.map((fact) => (
        <li key={fact} className="flex gap-2 text-sm leading-6">
          <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", dotClass)} />
          <span>{fact}</span>
        </li>
      ))}
    </ul>
  );
}

function DecisionBriefing({ item }: { item: DecisionCenterItem }) {
  const briefing = item.ownerBriefing!;
  const summary = decisionSummary(item);
  const explicitOpenQuestions = briefing.openQuestions ?? [];
  const explicitSafety = briefing.safetyConstraints ?? [];
  const explicitScope = briefing.scope ?? [];
  const explicitOutOfScope = briefing.outOfScope ?? [];
  const remainingFacts = briefing.contextFacts.filter((fact) => fact !== summary);
  const inferredOpenQuestions = remainingFacts.filter(isOpenQuestionFact);
  const inferredSafety = remainingFacts.filter((fact) => isSafetyFact(fact) && !isOpenQuestionFact(fact)).map(stripRiskPrefix);
  const openQuestions = uniqueStrings([...explicitOpenQuestions, ...inferredOpenQuestions]);
  const safetyConstraints = uniqueStrings([...explicitSafety, ...inferredSafety]);
  const knownFacts = uniqueStrings(remainingFacts.filter((fact) => !openQuestions.includes(fact) && !isSafetyFact(fact)));
  const scope = uniqueStrings(explicitScope.filter((fact) => fact !== summary));
  const outOfScope = uniqueStrings(explicitOutOfScope);

  return <>
    <section className="rounded-sm border border-primary/35 bg-primary/10 p-4">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <ShieldCheck className="h-4 w-4" /> {briefing.preparedBy === "aia" ? "Rekomendacja AIA" : "Rekomendacja systemowa"}
      </h2>
      <p className="mt-2 text-sm font-medium leading-6">{briefing.recommendation}</p>
    </section>

    {(knownFacts.length > 0 || openQuestions.length > 0) ? (
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stan sprawy</h2>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          {knownFacts.length > 0 ? (
            <div className="paperclip-inset p-4">
              <h3 className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Co już wiemy</h3>
              <FactList items={knownFacts} tone="safe" />
            </div>
          ) : null}
          {openQuestions.length > 0 ? (
            <div className="rounded-sm border border-amber-500/40 bg-amber-500/10 p-4">
              <h3 className="flex items-center gap-2 text-sm font-medium"><FileClock className="h-4 w-4 text-amber-600" /> Czego nadal brakuje</h3>
              <FactList items={openQuestions} tone="warning" />
            </div>
          ) : null}
        </div>
      </section>
    ) : null}

    {(scope.length > 0 || outOfScope.length > 0 || safetyConstraints.length > 0) ? (
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zakres i granice</h2>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          {scope.length > 0 ? (
            <div className="paperclip-inset p-4">
              <h3 className="flex items-center gap-2 text-sm font-medium"><Target className="h-4 w-4 text-primary" /> Ta decyzja obejmuje</h3>
              <FactList items={scope} />
            </div>
          ) : null}
          {outOfScope.length > 0 ? (
            <div className="rounded-sm border border-destructive/35 bg-destructive/10 p-4">
              <h3 className="flex items-center gap-2 text-sm font-medium text-destructive"><Ban className="h-4 w-4" /> Ta decyzja nie obejmuje</h3>
              <FactList items={outOfScope} />
            </div>
          ) : null}
          {safetyConstraints.length > 0 ? (
            <div className="paperclip-inset p-4 md:col-span-2">
              <h3 className="flex items-center gap-2 text-sm font-medium"><LockKeyhole className="h-4 w-4 text-primary" /> Warunki bezpieczeństwa</h3>
              <FactList items={safetyConstraints} />
            </div>
          ) : null}
        </div>
      </section>
    ) : null}

    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Porównanie opcji</h2>
      <div className="mt-2 grid gap-2">{briefing.options.map((option, index) => (
        <div key={option.id} className="paperclip-inset p-3">
          <div className="text-sm font-medium">{index + 1}. {option.label}</div>
          {option.description ? <p className="mt-1 text-sm text-muted-foreground">{option.description}</p> : null}
          <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Korzyść</dt><dd className="mt-1 leading-5">{option.benefit}</dd></div>
            <div><dt className="text-muted-foreground">Koszt</dt><dd className="mt-1 leading-5">{option.cost}</dd></div>
            <div><dt className="text-muted-foreground">Ryzyko</dt><dd className="mt-1 leading-5">{option.risk}</dd></div>
          </dl>
        </div>
      ))}</div>
    </section>

    <div className="grid gap-3 md:grid-cols-2">
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Co stanie się po decyzji</h2>
        <FactList items={briefing.afterApproval} />
      </section>
      <section className="paperclip-inset p-4">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><RotateCcw className="h-4 w-4" /> Cofnięcie lub bezpieczne zatrzymanie</h2>
        <p className="mt-2 text-sm leading-6">{briefing.rollback}</p>
      </section>
    </div>
  </>;
}
