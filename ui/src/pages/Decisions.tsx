import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AskUserQuestionsInteraction, DecisionCenterItem, DecisionCenterState } from "@paperclipai/shared";
import { AlertTriangle, Bot, CalendarClock, CheckCircle2, ChevronRight, ListChecks, MessagesSquare, RotateCcw, Search, ShieldCheck } from "lucide-react";
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Centrum decyzji</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Tylko decyzje wymagające Twoich uprawnień. AIA zbiera kontekst, porównuje opcje i przekazuje odpowiedź właściwym agentom.
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
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "mb-1 w-full rounded-sm border px-3 py-3 text-left transition-colors",
                  current?.id === item.id ? "border-primary/50 bg-primary/10" : "border-transparent hover:border-border hover:bg-muted/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="line-clamp-2 text-sm font-medium leading-5">{item.ownerBriefing?.decision ?? item.title}</span>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{item.issue?.identifier ?? "Formal approval"}</span><span>·</span>
                  <span className={cn("rounded-sm border px-1.5 py-0.5", riskClasses[item.risk])}>{item.risk}</span><span>·</span>
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
          <div className="min-w-0 space-y-4">
            <Card className="gap-4 py-5">
              <CardHeader className="px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary">
                      <Bot className="h-4 w-4" /> {current.ownerBriefing?.preparedBy === "aia" ? "Brief decyzyjny AIA" : "Formalny pakiet decyzyjny"}
                    </div>
                    <CardTitle className="text-lg leading-7">{current.ownerBriefing?.decision ?? current.title}</CardTitle>
                    {current.issue ? <Link to={`/issues/${current.issue.id}`} className="mt-2 inline-flex text-xs text-muted-foreground hover:text-foreground">{current.issue.identifier} · {current.issue.title}</Link> : null}
                  </div>
                  <span className={cn("rounded-sm border px-2 py-1 text-[11px] font-medium uppercase tracking-wide", riskClasses[current.risk])}>
                    {current.risk} risk · {current.urgency} urgency
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 px-5">
                {current.ownerBriefing ? <DecisionBriefing item={current} /> : (
                  <p className="text-sm text-muted-foreground">Historyczny wpis nie ma współczesnego briefu AIA.</p>
                )}
              </CardContent>
            </Card>

            {current.interaction ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1 text-sm font-medium"><MessagesSquare className="h-4 w-4" /> Twoja odpowiedź</div>
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
              <ApprovalCard
                approval={current.approval}
                requesterAgent={current.approval.requestedByAgentId ? agentMap.get(current.approval.requestedByAgentId) ?? null : null}
                onApprove={() => actionMutation.mutate(() => approvalsApi.approve(current.approval!.id, note.trim() || undefined))}
                onReject={() => actionMutation.mutate(() => approvalsApi.reject(current.approval!.id, note.trim() || undefined))}
                detailLink={`/approvals/${current.approval.id}`}
                isPending={actionMutation.isPending}
              />
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

function DecisionBriefing({ item }: { item: DecisionCenterItem }) {
  const briefing = item.ownerBriefing!;
  return <>
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kontekst</h2>
      <ul className="mt-2 space-y-2">{briefing.contextFacts.map((fact) => <li key={fact} className="flex gap-2 text-sm leading-6"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{fact}</li>)}</ul>
    </section>
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Opcje</h2>
      <div className="mt-2 grid gap-2">{briefing.options.map((option, index) => (
        <div key={option.id} className="paperclip-inset p-3">
          <div className="text-sm font-medium">{index + 1}. {option.label}</div>
          {option.description ? <p className="mt-1 text-sm text-muted-foreground">{option.description}</p> : null}
          <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Korzyść</dt><dd className="mt-0.5">{option.benefit}</dd></div>
            <div><dt className="text-muted-foreground">Koszt</dt><dd className="mt-0.5">{option.cost}</dd></div>
            <div><dt className="text-muted-foreground">Ryzyko</dt><dd className="mt-0.5">{option.risk}</dd></div>
          </dl>
        </div>
      ))}</div>
    </section>
    <div className="grid gap-3 md:grid-cols-2">
      <section className="rounded-sm border border-primary/30 bg-primary/10 p-4">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
          <ShieldCheck className="h-4 w-4" /> {briefing.preparedBy === "aia" ? "Rekomendacja AIA" : "Rekomendacja systemowa"}
        </h2>
        <p className="mt-2 text-sm leading-6">{briefing.recommendation}</p>
      </section>
      <section className="paperclip-inset p-4">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><RotateCcw className="h-4 w-4" /> Ryzyko i cofnięcie</h2>
        <p className="mt-2 text-sm leading-6">{briefing.rollback}</p>
      </section>
    </div>
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Co stanie się po decyzji</h2>
      <ul className="mt-2 space-y-2">{briefing.afterApproval.map((step) => <li key={step} className="flex gap-2 text-sm leading-6"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />{step}</li>)}</ul>
    </section>
  </>;
}
