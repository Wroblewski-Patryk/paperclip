import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AskUserQuestionsInteraction,
  DecisionCenterItem,
  DecisionCenterState,
} from "@paperclipai/shared";
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, MessagesSquare } from "lucide-react";
import { agentsApi } from "../api/agents";
import { approvalsApi } from "../api/approvals";
import { decisionsApi } from "../api/decisions";
import { issuesApi } from "../api/issues";
import { ApprovalCard } from "../components/ApprovalCard";
import { IssueThreadInteractionCard } from "../components/IssueThreadInteractionCard";
import { PageTabBar } from "../components/PageTabBar";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { queryKeys } from "../lib/queryKeys";
import { Link } from "../lib/router";
import { cn, formatDateTime } from "../lib/utils";

type DecisionTab = DecisionCenterState;

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
  const [tab, setTab] = useState<DecisionTab>("ready");
  const [selectedIndex, setSelectedIndex] = useState(0);
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
  const items = useMemo(
    () => (decisionQuery.data?.items ?? []).filter((item) => item.state === tab),
    [decisionQuery.data?.items, tab],
  );
  const current = items[Math.min(selectedIndex, Math.max(0, items.length - 1))] ?? null;

  useEffect(() => {
    setSelectedIndex(0);
    setNote("");
    setActionError(null);
  }, [tab]);
  useEffect(() => {
    if (selectedIndex >= items.length) setSelectedIndex(Math.max(0, items.length - 1));
  }, [items.length, selectedIndex]);
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
    onSuccess: () => {
      setActionError(null);
      invalidate(current);
    },
    onError: (error) => setActionError(error instanceof Error ? error.message : "Decision action failed"),
  });
  const deferMutation = useMutation({
    mutationFn: ({ item, deferredUntil }: { item: DecisionCenterItem; deferredUntil: string }) =>
      decisionsApi.defer(item.companyId, item.sourceType, item.sourceId, { deferredUntil, note: note.trim() || null }),
    onSuccess: () => {
      setActionError(null);
      invalidate(current);
    },
    onError: (error) => setActionError(error instanceof Error ? error.message : "Could not defer decision"),
  });
  const clearDeferMutation = useMutation({
    mutationFn: (item: DecisionCenterItem) => decisionsApi.clearDefer(item.companyId, item.sourceType, item.sourceId),
    onSuccess: () => {
      setActionError(null);
      invalidate(current);
    },
    onError: (error) => setActionError(error instanceof Error ? error.message : "Could not restore decision"),
  });

  if (!selectedCompanyId) return <p className="text-sm text-muted-foreground">Select a company first.</p>;
  if (decisionQuery.isLoading) return <div className="paperclip-surface h-72 animate-pulse" />;
  if (decisionQuery.error) return <p className="text-sm text-destructive">{decisionQuery.error.message}</p>;

  const counts = decisionQuery.data?.counts ?? { ready: 0, needsInformation: 0, deferred: 0, allOpen: 0 };
  const historyCount = (decisionQuery.data?.items ?? []).filter((item) => item.state === "resolved").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Decisions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One governed owner decision at a time. Answers are recorded on their canonical issue or approval.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border px-2.5 py-1">{counts.ready} ready</span>
          <span className="rounded-full border border-border px-2.5 py-1">{counts.needsInformation} need context</span>
          <span className="rounded-full border border-border px-2.5 py-1">{counts.deferred} deferred</span>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as DecisionTab)}>
        <PageTabBar align="start" value={tab} onValueChange={(value) => setTab(value as DecisionTab)} items={[
          { value: "ready", label: `Ready ${counts.ready}` },
          { value: "needs_information", label: `Needs information ${counts.needsInformation}` },
          { value: "deferred", label: `Deferred ${counts.deferred}` },
          { value: "resolved", label: `History ${historyCount}` },
        ]} />
      </Tabs>

      {!current ? (
        <div className="paperclip-empty-state flex min-h-64 flex-col items-center justify-center text-center">
          <CheckCircle2 className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">Nothing in this decision state.</p>
          <p className="mt-1 text-xs text-muted-foreground">Paperclip will place the next eligible request here.</p>
        </div>
      ) : (
        <>
          <Card className="gap-4 py-5">
            <CardHeader className="gap-3 px-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-sm">Why this needs the owner</CardTitle>
                  <CardDescription className="mt-1 max-w-3xl leading-6">{current.whyOwner}</CardDescription>
                </div>
                <span className={cn("rounded-sm border px-2 py-1 text-[11px] font-medium uppercase tracking-wide", riskClasses[current.risk])}>
                  {current.risk} risk · {current.urgency} urgency
                </span>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 px-5 md:grid-cols-2">
              <div className="paperclip-inset p-3">
                <div className="text-xs text-muted-foreground">Paperclip recommendation</div>
                <div className="mt-1 text-sm">{current.recommendedAction ?? "Review the recorded outcome"}</div>
              </div>
              <div className="paperclip-inset p-3">
                <div className="text-xs text-muted-foreground">Context</div>
                <div className="mt-1 text-sm">
                  {current.issue ? `${current.issue.identifier ?? "Issue"} · ${current.issue.title}` : "Formal company approval"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Created {formatDateTime(current.createdAt)}</div>
              </div>
            </CardContent>
          </Card>

          {current.interaction ? (
            <IssueThreadInteractionCard
              interaction={current.interaction}
              agentMap={agentMap}
              onAcceptInteraction={current.state === "ready" ? async (interaction, selectedClientKeys) => {
                await actionMutation.mutateAsync(() =>
                  issuesApi.acceptInteraction(interaction.issueId, interaction.id, { selectedClientKeys }));
              } : undefined}
              onRejectInteraction={current.state === "ready" ? async (interaction, reason) => {
                await actionMutation.mutateAsync(() =>
                  issuesApi.rejectInteraction(interaction.issueId, interaction.id, reason));
              } : undefined}
              onSubmitInteractionAnswers={current.state === "ready" ? async (interaction: AskUserQuestionsInteraction, answers) => {
                await actionMutation.mutateAsync(() =>
                  issuesApi.respondToInteraction(interaction.issueId, interaction.id, { answers }));
              } : undefined}
              onCancelInteraction={current.state === "ready" ? async (interaction: AskUserQuestionsInteraction) => {
                await actionMutation.mutateAsync(() =>
                  issuesApi.cancelInteraction(interaction.issueId, interaction.id, note.trim() || undefined));
              } : undefined}
            />
          ) : current.approval ? (
            <div className="space-y-3">
              <ApprovalCard
                approval={current.approval}
                requesterAgent={current.approval.requestedByAgentId ? agentMap.get(current.approval.requestedByAgentId) ?? null : null}
                onApprove={() => actionMutation.mutate(() => approvalsApi.approve(current.approval!.id, note.trim() || undefined))}
                onReject={() => actionMutation.mutate(() => approvalsApi.reject(current.approval!.id, note.trim() || undefined))}
                detailLink={`/approvals/${current.approval.id}`}
                isPending={actionMutation.isPending}
              />
              {current.state !== "resolved" ? (
                <Button variant="outline" size="sm" onClick={() => actionMutation.mutate(() =>
                  approvalsApi.requestRevision(current.approval!.id, note.trim() || "Please revise this request and resubmit with current evidence."))}>
                  Request revision
                </Button>
              ) : null}
            </div>
          ) : null}

          {current.state !== "resolved" ? (
            <Card className="gap-3 py-4">
              <CardContent className="space-y-3 px-5">
                {current.state !== "needs_information" ? (
                  <>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MessagesSquare className="h-4 w-4" /> Decision note
                    </div>
                    <Textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Optional context for rejection, revision, cancellation, or deferral. Never paste a secret value; reference its alias."
                      className="min-h-20"
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Paperclip must add the missing context or route this technical question to the responsible agent before you can answer it.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {current.state === "ready" ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => deferMutation.mutate({ item: current, deferredUntil: deferDate(1) })}>
                        <CalendarClock className="mr-1.5 h-3.5 w-3.5" /> 1 hour
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deferMutation.mutate({ item: current, deferredUntil: deferDate(24) })}>Tomorrow</Button>
                      <Button variant="outline" size="sm" onClick={() => deferMutation.mutate({ item: current, deferredUntil: deferDate(168) })}>7 days</Button>
                    </>
                  ) : current.state === "deferred" ? (
                    <Button variant="outline" size="sm" onClick={() => clearDeferMutation.mutate(current)}>Return to ready</Button>
                  ) : current.issue ? (
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/issues/${current.issue.id}`}>Open issue and request clarification</Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {actionError ? (
            <div className="flex items-center gap-2 rounded-sm border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> {actionError}
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t border-border pt-3">
            <Button variant="ghost" size="sm" disabled={selectedIndex === 0} onClick={() => setSelectedIndex((value) => Math.max(0, value - 1))}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Previous
            </Button>
            <span className="text-xs text-muted-foreground">{selectedIndex + 1} of {items.length}</span>
            <Button variant="ghost" size="sm" disabled={selectedIndex >= items.length - 1} onClick={() => setSelectedIndex((value) => Math.min(items.length - 1, value + 1))}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
