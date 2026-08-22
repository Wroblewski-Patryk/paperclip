import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OrganizationalObservation, OrganizationalObservationKind } from "@paperclipai/shared";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Link } from "@/lib/router";
import { organizationalObservationsApi } from "../api/organizationalObservations";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { queryKeys } from "../lib/queryKeys";
import { cn } from "../lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";

const KINDS: OrganizationalObservationKind[] = ["outcome", "causal", "external_signal", "learning"];
const LABELS: Record<OrganizationalObservationKind, string> = {
  outcome: "Outcomes",
  causal: "Causes",
  external_signal: "External signals",
  learning: "Learning",
};
const TRANSITIONS: Record<OrganizationalObservationKind, Record<string, string[]>> = {
  outcome: { active: ["verified", "disputed", "archived"], verified: ["disputed", "archived"], disputed: ["active", "archived"] },
  causal: { proposed: ["accepted", "disputed", "archived"], accepted: ["disputed", "archived"], disputed: ["proposed", "archived"] },
  external_signal: { current: ["stale", "contradicted", "archived"], stale: ["current", "contradicted", "archived"], contradicted: ["current", "archived"] },
  learning: { proposed: ["validated", "rejected"], validated: ["promoted", "rejected"], rejected: ["proposed"] },
};
const POSITIVE_STATUSES = new Set(["verified", "accepted", "validated", "promoted", "current"]);
const ATTENTION_STATUSES = new Set(["disputed", "contradicted", "stale", "failure"]);
const CLOSED_STATUSES = new Set(["superseded", "archived", "rejected", "promoted"]);
type ObservationFilter = "all" | "attention" | "current";

function observationFreshUntil(item: OrganizationalObservation) {
  return item.validUntil
    ?? (item.freshnessWindowHours
      ? new Date(new Date(item.observedAt).getTime() + item.freshnessWindowHours * 3_600_000)
      : null);
}

function observationNeedsAttention(item: OrganizationalObservation) {
  if (CLOSED_STATUSES.has(item.status)) return false;
  if (ATTENTION_STATUSES.has(item.status)) return true;
  const freshUntil = observationFreshUntil(item);
  return Boolean(freshUntil && new Date(freshUntil).getTime() < Date.now());
}

function relativeDateLabel(value: Date | string | null) {
  if (!value) return null;
  const date = new Date(value);
  const deltaDays = Math.round((date.getTime() - Date.now()) / 86_400_000);
  if (deltaDays === 0) return "today";
  if (deltaDays === 1) return "tomorrow";
  if (deltaDays === -1) return "yesterday";
  if (deltaDays > 1 && deltaDays < 30) return `in ${deltaDays}d`;
  if (deltaDays < -1 && deltaDays > -30) return `${Math.abs(deltaDays)}d ago`;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function ObservationCard({
  item,
  pending,
  onTransition,
}: {
  item: OrganizationalObservation;
  pending: boolean;
  onTransition: (item: OrganizationalObservation, status: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const staleAt = observationFreshUntil(item);
  const longSummary = item.summary.length > 280;
  const attention = observationNeedsAttention(item);

  return (
    <article className={cn("paperclip-surface operational-record-enter min-w-0 overflow-hidden transition-[border-color,background-color,transform] duration-200 motion-safe:hover:-translate-y-px hover:bg-accent/[0.025]", attention && "border-amber-500/30")}>
      <div className={cn("h-0.5 w-full bg-transparent", attention && "bg-amber-500/70", POSITIVE_STATUSES.has(item.status) && !attention && "bg-emerald-500/45")} />
      <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium">{item.title}</h3>
          <p className={cn("mt-1 break-words whitespace-pre-wrap text-sm leading-6 text-muted-foreground", !expanded && longSummary && "line-clamp-4")}>{item.summary}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={cn(
            "rounded-full border bg-background/60 px-2 py-0.5 text-xs font-medium",
            POSITIVE_STATUSES.has(item.status) && "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
            ATTENTION_STATUSES.has(item.status) && "border-amber-500/30 text-amber-600 dark:text-amber-400",
          )}>{item.status}</span>
          {longSummary ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-label={expanded ? "Collapse observation evidence" : "Expand observation evidence"}
              title={expanded ? "Collapse evidence" : "Expand evidence"}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span>Source: {item.sourceClass}</span>
        <span>Observed {new Date(item.observedAt).toLocaleString()}</span>
        {staleAt ? <span>Fresh until {new Date(staleAt).toLocaleString()}</span> : null}
        {item.outcomeLayer ? <span>{item.outcomeLayer}: {item.outcomeResult}</span> : null}
        {item.causalRole ? <span>{item.causalRole.replaceAll("_", " ")}</span> : null}
        {item.externalCategory ? <span>{item.externalCategory}</span> : null}
      </div>

      {(item.issueId || item.projectId || item.provenance.length > 0) ? (
        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-3 border-t border-border pt-3 text-xs">
          {item.issueId ? <Link to={`/issues/${item.issueId}`} className="inline-flex items-center gap-1 text-primary hover:underline">Issue <ExternalLink className="h-3 w-3" /></Link> : null}
          {item.projectId ? <Link to={`/projects/${item.projectId}/overview`} className="inline-flex items-center gap-1 text-primary hover:underline">Project <ExternalLink className="h-3 w-3" /></Link> : null}
          {item.provenance.slice(0, 3).map((source, index) => (
            <span key={`${source.kind}-${source.ref}-${index}`} className="min-w-0 max-w-full truncate font-mono text-[11px] text-muted-foreground" title={source.ref}>{source.kind}: {source.ref}</span>
          ))}
        </div>
      ) : null}

      {(TRANSITIONS[item.kind][item.status] ?? []).length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
          {(TRANSITIONS[item.kind][item.status] ?? []).map((status) => (
            <Button key={status} size="sm" variant="outline" disabled={pending} onClick={() => onTransition(item, status)}>
              {POSITIVE_STATUSES.has(status) ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}
              {status}
            </Button>
          ))}
        </div>
      ) : null}
      </div>
    </article>
  );
}

export function OrganizationalLearning() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<OrganizationalObservationKind>("outcome");
  const autoSelectedCompanyRef = useRef<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [sourceClass, setSourceClass] = useState("operator_observation");
  const [sourceRef, setSourceRef] = useState("");
  const [variant, setVariant] = useState("output");
  const [result, setResult] = useState("neutral");
  const [freshness, setFreshness] = useState("24");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ObservationFilter>("all");

  useEffect(() => setBreadcrumbs([{ label: "Evidence & learning" }]), [setBreadcrumbs]);

  const query = useQuery({
    queryKey: queryKeys.organizationalObservations.list(selectedCompanyId ?? ""),
    queryFn: () => organizationalObservationsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });
  const records = useMemo(() => query.data ?? [], [query.data]);
  const kindRecords = useMemo(() => records.filter((item) => item.kind === kind), [kind, records]);
  const visibleRecords = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return kindRecords
      .filter((item) => {
        if (filter === "attention" && !observationNeedsAttention(item)) return false;
        if (filter === "current" && !POSITIVE_STATUSES.has(item.status)) return false;
        if (!needle) return true;
        return [item.title, item.summary, item.sourceClass, item.status, ...item.provenance.map((source) => source.ref)]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((left, right) => {
        const attentionDelta = Number(observationNeedsAttention(right)) - Number(observationNeedsAttention(left));
        return attentionDelta || new Date(right.observedAt).getTime() - new Date(left.observedAt).getTime();
      });
  }, [filter, kindRecords, search]);
  const currentExternalSignals = records.filter((item) => item.kind === "external_signal" && item.status === "current").length;
  const validatedRecords = records.filter((item) => POSITIVE_STATUSES.has(item.status)).length;
  const promotedLearning = records.filter((item) => item.kind === "learning" && item.status === "promoted").length;
  const attentionRecords = records.filter(observationNeedsAttention);
  const latestObservation = records.reduce<Date | null>((latest, record) => {
    const value = new Date(record.observedAt);
    return !latest || value > latest ? value : latest;
  }, null);

  useEffect(() => {
    if (!query.isSuccess || autoSelectedCompanyRef.current === selectedCompanyId) return;
    autoSelectedCompanyRef.current = selectedCompanyId;
    if (records.some((item) => item.kind === kind)) return;
    const firstPopulatedKind = KINDS.find((candidate) => records.some((item) => item.kind === candidate));
    if (firstPopulatedKind) setKind(firstPopulatedKind);
  }, [kind, query.isSuccess, records, selectedCompanyId]);

  const create = useMutation({
    mutationFn: () => organizationalObservationsApi.create(selectedCompanyId!, {
      kind,
      title,
      summary,
      sourceClass,
      observedAt: new Date().toISOString(),
      provenance: [{ kind: kind === "external_signal" ? "external" : "other", ref: sourceRef }],
      ...(kind === "outcome" ? { outcomeLayer: variant, outcomeResult: result } : {}),
      ...(kind === "causal" ? { causalRole: variant } : {}),
      ...(kind === "external_signal" ? { externalCategory: variant, freshnessWindowHours: Number(freshness) } : {}),
    }),
    onSuccess: async () => {
      setTitle("");
      setSummary("");
      setSourceRef("");
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: ["organizational-observations", selectedCompanyId] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", selectedCompanyId] });
    },
  });
  const update = useMutation({
    mutationFn: ({ item, status }: { item: OrganizationalObservation; status: string }) => {
      if (item.kind === "learning" && status === "promoted") {
        const targetKind = window.prompt("Promotion target kind: procedure, skill, template, eval, routine, policy, or issue", "procedure");
        const ref = window.prompt("Target reference (path, id, or durable URI)");
        if (!targetKind || !ref) throw new Error("Promotion requires a durable target");
        return organizationalObservationsApi.update(item.id, { status, promotionTarget: { kind: targetKind, ref } });
      }
      return organizationalObservationsApi.update(item.id, { status });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organizational-observations", selectedCompanyId] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", selectedCompanyId] });
    },
  });

  if (!selectedCompanyId) return <EmptyState icon={Activity} message="Select a company to view evidence and learning." />;
  if (query.isLoading) return <PageSkeleton variant="list" />;

  const variantOptions = kind === "outcome"
    ? ["output", "acceptance", "outcome", "impact"]
    : kind === "causal"
      ? ["symptom", "contributing_cause", "root_cause", "prevention", "success_factor"]
      : kind === "external_signal"
        ? ["production", "customer", "business", "market", "regulatory"]
        : [];

  return (
    <div className="space-y-3">
      <header className="flex flex-col gap-3 border-b border-border pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">Evidence & learning</h1>
          <p className="mt-1 flex max-w-3xl items-start gap-2 text-sm text-muted-foreground" aria-live="polite">
            <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", attentionRecords.length > 0 ? "bg-amber-500" : records.length > 0 ? "bg-emerald-500" : "bg-muted-foreground")} />
            <span>{attentionRecords.length > 0 ? `${attentionRecords.length} ${attentionRecords.length === 1 ? "observation needs" : "observations need"} review or refreshed evidence.` : "Source-backed outcomes, causal findings, external reality and validated improvements."}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-start">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {latestObservation ? <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" />Observed {relativeDateLabel(latestObservation)}</span> : null}
            <span className="hidden h-4 w-px bg-border sm:block" />
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />{validatedRecords} validated/current</span>
          </div>
          <Button size="sm" onClick={() => setShowForm((value) => !value)}><Plus className="mr-1 h-4 w-4" />New observation</Button>
        </div>
      </header>

      <section className="paperclip-surface grid grid-cols-2 overflow-hidden md:grid-cols-4" aria-label="Evidence summary">
        <LearningMetric icon={Activity} label="All observations" value={records.length} />
        <LearningMetric icon={ShieldCheck} label="Validated/current" value={validatedRecords} />
        <LearningMetric icon={AlertTriangle} label="Needs attention" value={attentionRecords.length} tone={attentionRecords.length > 0 ? "attention" : "default"} />
        <LearningMetric icon={CheckCircle2} label="Promoted learning" value={promotedLearning} />
      </section>

      <nav className="paperclip-surface overflow-hidden" aria-label="Evidence record type">
      <div className="grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-4 md:divide-y-0" role="tablist">
        {KINDS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={kind === item}
            className={cn(
              "group flex min-w-0 items-center justify-between gap-2 px-4 py-3 text-left outline-none transition-[background-color,box-shadow] hover:bg-accent/40 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              kind === item && "bg-[var(--company-accent-subtle)]",
            )}
            onClick={() => {
              setKind(item);
              setSearch("");
              setFilter("all");
              setVariant(item === "outcome" ? "output" : item === "causal" ? "symptom" : item === "external_signal" ? "production" : "");
            }}
          >
            <span className="truncate text-xs font-medium text-muted-foreground">{LABELS[item]}</span>
            <span className="text-base font-semibold tabular-nums">{records.filter((record) => record.kind === item).length}</span>
          </button>
        ))}
      </div>
      <div className={cn("flex min-h-9 items-center gap-2 border-t border-border px-4 py-2 text-xs", attentionRecords.length > 0 ? "bg-amber-500/[0.04]" : "bg-muted/10")}>
        {attentionRecords.length > 0 ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" /> : <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <span className="min-w-0 flex-1 truncate text-muted-foreground">{attentionRecords.length > 0 ? `${attentionRecords.length} ${attentionRecords.length === 1 ? "record is" : "records are"} disputed, stale, contradicted, or past freshness.` : "Evidence is current and no observation requires attention."}</span>
        <span className="hidden shrink-0 font-medium text-muted-foreground sm:inline">{currentExternalSignals} current external</span>
      </div>
      </nav>

      {showForm ? (
        <form className="paperclip-surface space-y-3 p-4" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What was observed?" required />
          <Textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="State the evidence and its operational meaning without inventing causality" required />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input value={sourceClass} onChange={(event) => setSourceClass(event.target.value)} placeholder="Source class" required />
            <Input value={sourceRef} onChange={(event) => setSourceRef(event.target.value)} placeholder="Inspectable source reference" required />
            {variantOptions.length ? <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={variant} onChange={(event) => setVariant(event.target.value)}>{variantOptions.map((value) => <option key={value}>{value}</option>)}</select> : null}
          </div>
          {kind === "outcome" ? <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={result} onChange={(event) => setResult(event.target.value)}>{["success", "failure", "mixed", "neutral"].map((value) => <option key={value}>{value}</option>)}</select> : null}
          {kind === "external_signal" ? <Input type="number" min="1" max="8760" value={freshness} onChange={(event) => setFreshness(event.target.value)} placeholder="Freshness in hours" required /> : null}
          {create.error ? <p className="text-sm text-destructive">{create.error.message}</p> : null}
          <div className="flex gap-2">
            <Button size="sm" type="submit" disabled={create.isPending}>Create</Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      ) : null}

      {update.error ? <p className="text-sm text-destructive">{update.error.message}</p> : null}
      <section className="paperclip-surface overflow-hidden" aria-labelledby="learning-records-title">
        <header className="paperclip-surface-header flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="learning-records-title" className="text-sm font-semibold">{LABELS[kind]}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{visibleRecords.length} shown · attention first · newest next</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${LABELS[kind].toLowerCase()}`} className="h-8 pl-8" />
            </div>
            <div className="flex rounded-md border border-border bg-background p-0.5" role="group" aria-label="Filter evidence by state">
              {(["all", "attention", "current"] as const).map((value) => (
                <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={cn("rounded-sm px-2.5 py-1 text-xs capitalize text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring", filter === value && "bg-accent text-foreground")}>{value}</button>
              ))}
            </div>
          </div>
        </header>
        <div className="p-3">
      {visibleRecords.length === 0
        ? <EmptyState
            icon={Activity}
            title={kindRecords.length === 0 ? `No ${LABELS[kind].toLowerCase()} recorded` : "No observations match these filters"}
            message={kindRecords.length === 0 ? "Record an observation with its source so the company can learn from evidence instead of anecdotes." : "Adjust the search or state filter to return to the full evidence set."}
            examples={["Outcome", "Causal signal", "External evidence"]}
            action={kindRecords.length === 0 ? "Record observation" : "Clear filters"}
            onAction={() => {
              if (kindRecords.length === 0) setShowForm(true);
              else { setSearch(""); setFilter("all"); }
            }}
          />
        : <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">{visibleRecords.map((item) => <ObservationCard key={item.id} item={item} pending={update.isPending} onTransition={(record, status) => update.mutate({ item: record, status })} />)}</div>}
        </div>
      </section>
    </div>
  );
}

function LearningMetric({ icon: Icon, label, value, tone = "default" }: { icon: typeof Activity; label: string; value: number; tone?: "default" | "attention" }) {
  return (
    <div className={cn("border-r border-border px-4 py-3 last:border-r-0", tone === "attention" && "bg-amber-500/[0.035]")}>
      <div className={cn("flex items-center gap-1.5 text-[11px] text-muted-foreground", tone === "attention" && "text-amber-600 dark:text-amber-400")}><Icon className="h-3 w-3" aria-hidden />{label}</div>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
