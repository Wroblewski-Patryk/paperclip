import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Agent, OrganizationalRecord, OrganizationalRecordKind } from "@paperclipai/shared";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  FileText,
  GitCommitHorizontal,
  Lightbulb,
  Link2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  UserRound,
} from "lucide-react";
import { Link } from "@/lib/router";
import { agentsApi } from "../api/agents";
import { organizationalRecordsApi } from "../api/organizationalRecords";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { StatusBadge } from "../components/StatusBadge";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { queryKeys } from "../lib/queryKeys";
import { cn } from "../lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const KINDS: OrganizationalRecordKind[] = ["assumption", "commitment", "decision"];

const KIND_META: Record<OrganizationalRecordKind, {
  label: string;
  singular: string;
  detail: string;
  emptyDescription: string;
  examples: string[];
  icon: LucideIcon;
  activeClass: string;
  iconClass: string;
}> = {
  assumption: {
    label: "Assumptions",
    singular: "assumption",
    detail: "premises",
    emptyDescription: "Capture a premise that future agents should verify instead of silently inheriting.",
    examples: ["Customer preference", "Technical constraint", "Market premise"],
    icon: Lightbulb,
    activeClass: "bg-sky-500/[0.045] hover:bg-sky-500/[0.085]",
    iconClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  commitment: {
    label: "Commitments",
    singular: "commitment",
    detail: "promises",
    emptyDescription: "Record promises with an owner and review point so delivery obligations stay visible.",
    examples: ["Delivery promise", "Review deadline", "Owner obligation"],
    icon: ShieldCheck,
    activeClass: "bg-violet-500/[0.045] hover:bg-violet-500/[0.085]",
    iconClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  decision: {
    label: "Decisions",
    singular: "decision",
    detail: "choices",
    emptyDescription: "Record a durable choice together with its rationale, consequences, and evidence.",
    examples: ["Architecture choice", "Priority decision", "Policy exception"],
    icon: GitCommitHorizontal,
    activeClass: "bg-emerald-500/[0.045] hover:bg-emerald-500/[0.085]",
    iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
};

const NEXT_STATUSES: Record<OrganizationalRecordKind, Record<string, string[]>> = {
  assumption: {
    proposed: ["active", "validated", "contradicted", "expired", "superseded"],
    active: ["validated", "contradicted", "expired", "superseded"],
    contradicted: ["active", "superseded"],
    expired: ["active", "superseded"],
    validated: ["superseded"],
  },
  commitment: {
    proposed: ["active", "cancelled", "superseded"],
    active: ["fulfilled", "breached", "renegotiated", "cancelled", "superseded"],
    breached: ["renegotiated", "superseded"],
    fulfilled: ["superseded"],
    renegotiated: ["superseded"],
    cancelled: ["superseded"],
  },
  decision: {
    proposed: ["accepted", "rejected", "superseded"],
    accepted: ["reversed", "superseded"],
    rejected: ["superseded"],
    reversed: ["superseded"],
  },
};

const POSITIVE_STATUSES = new Set(["active", "accepted", "validated", "fulfilled"]);
const ATTENTION_STATUSES = new Set(["contradicted", "breached", "reversed", "expired"]);
const CLOSED_STATUSES = new Set(["superseded", "rejected", "cancelled", "fulfilled"]);

function toIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function dateLabel(value: Date | string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
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

function recordNeedsAttention(record: OrganizationalRecord) {
  if (ATTENTION_STATUSES.has(record.status)) return true;
  if (CLOSED_STATUSES.has(record.status)) return false;
  const now = Date.now();
  return [record.reviewAt, record.dueAt, record.expiresAt]
    .filter(Boolean)
    .some((value) => new Date(value!).getTime() <= now);
}

function evidenceHref(ref: string) {
  if (/^https?:\/\//i.test(ref)) return ref;
  if (ref.startsWith("/")) return ref;
  if (/^[A-Z][A-Z0-9]+-\d+$/.test(ref)) return `/issues/${ref}`;
  return null;
}

function DetailBlock({ label, children }: { label: string; children: string }) {
  return (
    <div className="paperclip-inset min-w-0 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-5">{children}</p>
    </div>
  );
}

function RecordCard({
  record,
  owner,
  onTransition,
  pending,
}: {
  record: OrganizationalRecord;
  owner: Agent | null;
  onTransition: (record: OrganizationalRecord, status: string) => void;
  pending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = KIND_META[record.kind];
  const Icon = meta.icon;
  const transitions = NEXT_STATUSES[record.kind][record.status] ?? [];
  const attention = recordNeedsAttention(record);
  const hasDetails = Boolean(
    record.rationale
    || record.consequences
    || record.resolution
    || record.evidence.length
    || record.issueId
    || record.projectId
    || record.goalId
    || transitions.length,
  );

  const dates = [
    record.dueAt ? { label: "Due", value: record.dueAt } : null,
    record.reviewAt ? { label: "Review", value: record.reviewAt } : null,
    record.expiresAt ? { label: "Expires", value: record.expiresAt } : null,
  ].filter((value): value is { label: string; value: Date } => Boolean(value));

  return (
    <article className={cn("paperclip-surface min-w-0 overflow-hidden", expanded && "xl:col-span-2", attention && "border-amber-500/30")}>
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", meta.iconClass)}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold leading-5">{record.title}</h3>
                {attention ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3" aria-hidden />Needs attention
                  </span>
                ) : null}
              </div>
              <p className={cn("mt-1 whitespace-pre-wrap text-sm leading-5 text-muted-foreground", !expanded && "line-clamp-3")}>{record.statement}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <StatusBadge status={record.status} />
              {hasDetails ? (
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-label={expanded ? `Collapse ${record.title}` : `Expand ${record.title}`}
                  onClick={() => setExpanded((value) => !value)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {owner ? (
              <Link to={`/agents/${owner.urlKey ?? owner.id}`} className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline">
                <UserRound className="h-3.5 w-3.5" aria-hidden />{owner.name}
              </Link>
            ) : record.ownerUserId ? (
              <span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" aria-hidden />Board-owned</span>
            ) : null}
            {record.confidence !== null ? <span className="tabular-nums">Confidence {record.confidence}%</span> : null}
            {dates.map(({ label, value }) => (
              <span key={label} className="inline-flex items-center gap-1.5" title={`${label} ${dateLabel(value)}`}>
                <Clock3 className="h-3.5 w-3.5" aria-hidden />{label} {relativeDateLabel(value)}
              </span>
            ))}
            <span>Updated {relativeDateLabel(record.updatedAt)}</span>
          </div>
        </div>
      </div>

      {expanded ? (
        <div className="space-y-3 border-t border-border bg-muted/[0.08] px-4 py-3.5">
          {(record.rationale || record.consequences || record.resolution) ? (
            <div className="grid gap-2 lg:grid-cols-3">
              {record.rationale ? <DetailBlock label="Rationale">{record.rationale}</DetailBlock> : null}
              {record.consequences ? <DetailBlock label="Consequences">{record.consequences}</DetailBlock> : null}
              {record.resolution ? <DetailBlock label="Resolution">{record.resolution}</DetailBlock> : null}
            </div>
          ) : null}

          {(record.issueId || record.projectId || record.goalId) ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Linked context</span>
              {record.issueId ? <Badge variant="outline" asChild><Link to={`/issues/${record.issueId}`}><FileText />Issue</Link></Badge> : null}
              {record.projectId ? <Badge variant="outline" asChild><Link to={`/projects/${record.projectId}/overview`}><Target />Project</Link></Badge> : null}
              {record.goalId ? <Badge variant="outline" asChild><Link to={`/goals/${record.goalId}`}><Target />Goal</Link></Badge> : null}
            </div>
          ) : null}

          {record.evidence.length > 0 ? (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Link2 className="h-3.5 w-3.5" aria-hidden />Evidence · {record.evidence.length}
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                {record.evidence.map((item, index) => {
                  const href = evidenceHref(item.ref);
                  const content = (
                    <>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-foreground">{item.label || item.ref}</span>
                        <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">{item.kind} · {item.ref}</span>
                      </span>
                      {href ? <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden /> : null}
                    </>
                  );
                  const className = "paperclip-inset flex min-w-0 items-center gap-2 px-3 py-2 transition-colors hover:bg-accent/30";
                  if (!href) return <div key={`${item.kind}-${item.ref}-${index}`} className={className}>{content}</div>;
                  if (/^https?:\/\//i.test(href)) return <a key={`${item.kind}-${item.ref}-${index}`} href={href} target="_blank" rel="noreferrer" className={className}>{content}</a>;
                  return <Link key={`${item.kind}-${item.ref}-${index}`} to={href} className={className}>{content}</Link>;
                })}
              </div>
            </div>
          ) : null}

          {transitions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <span className="mr-1 text-xs text-muted-foreground">Move to</span>
              {transitions.map((status) => (
                <Button key={status} size="xs" variant="outline" disabled={pending} onClick={() => onTransition(record, status)}>
                  {POSITIVE_STATUSES.has(status) ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}
                  {status.replaceAll("_", " ")}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function OrganizationalMemory() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<OrganizationalRecordKind>("assumption");
  const autoSelectedCompanyRef = useRef<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [rationale, setRationale] = useState("");
  const [consequences, setConsequences] = useState("");
  const [confidence, setConfidence] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [reviewAt, setReviewAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  useEffect(() => setBreadcrumbs([{ label: "Organizational memory" }]), [setBreadcrumbs]);

  const recordsQuery = useQuery({
    queryKey: queryKeys.organizationalRecords.list(selectedCompanyId ?? ""),
    queryFn: () => organizationalRecordsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });
  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId ?? ""),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });
  const records = useMemo(() => recordsQuery.data ?? [], [recordsQuery.data]);
  const ownerMap = useMemo(() => new Map((agentsQuery.data ?? []).map((agent) => [agent.id, agent])), [agentsQuery.data]);
  const counts = useMemo(() => Object.fromEntries(KINDS.map((item) => [item, records.filter((record) => record.kind === item).length])) as Record<OrganizationalRecordKind, number>, [records]);
  const attentionRecords = useMemo(() => records.filter(recordNeedsAttention), [records]);
  const evidenceBackedCount = useMemo(() => records.filter((record) => record.evidence.length > 0).length, [records]);
  const visibleRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return records.filter((record) => {
      if (record.kind !== kind) return false;
      if (!normalizedSearch) return true;
      return [record.title, record.statement, record.rationale, record.consequences, record.resolution]
        .some((value) => value?.toLocaleLowerCase().includes(normalizedSearch));
    });
  }, [kind, records, search]);

  useEffect(() => {
    if (!recordsQuery.isSuccess || autoSelectedCompanyRef.current === selectedCompanyId) return;
    autoSelectedCompanyRef.current = selectedCompanyId;
    const firstPopulatedKind = KINDS.find((candidate) => records.some((record) => record.kind === candidate));
    if (firstPopulatedKind) setKind(firstPopulatedKind);
  }, [records, recordsQuery.isSuccess, selectedCompanyId]);

  const create = useMutation({
    mutationFn: () => organizationalRecordsApi.create(selectedCompanyId!, {
      kind,
      title,
      statement,
      rationale: rationale || null,
      consequences: consequences || null,
      confidence: kind === "assumption" && confidence ? Number(confidence) : null,
      dueAt: kind === "commitment" ? toIso(dueAt) : null,
      reviewAt: toIso(reviewAt),
      expiresAt: kind === "assumption" ? toIso(expiresAt) : null,
    }),
    onSuccess: async () => {
      setTitle("");
      setStatement("");
      setRationale("");
      setConsequences("");
      setConfidence("");
      setDueAt("");
      setReviewAt("");
      setExpiresAt("");
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: ["organizational-records", selectedCompanyId] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", selectedCompanyId] });
    },
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => organizationalRecordsApi.update(id, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organizational-records", selectedCompanyId] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", selectedCompanyId] });
    },
  });

  if (!selectedCompanyId) return <EmptyState icon={BrainCircuit} message="Select a company to view organizational memory." />;
  if (recordsQuery.isLoading) return <PageSkeleton variant="list" />;

  const emptyKinds = KINDS.filter((item) => counts[item] === 0);
  const signalAttention = attentionRecords.length > 0;
  const coveragePercent = records.length > 0 ? Math.round((evidenceBackedCount / records.length) * 100) : 0;
  const latestUpdate = records.reduce<Date | null>((latest, record) => {
    const value = new Date(record.updatedAt);
    return !latest || value > latest ? value : latest;
  }, null);
  const activeMeta = KIND_META[kind];

  return (
    <div className="space-y-3">
      <header className="flex flex-col gap-3 border-b border-border pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">Organizational memory</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", signalAttention ? "bg-amber-500" : records.length > 0 ? "bg-emerald-500" : "bg-muted-foreground")} />
            <span>{records.length > 0 ? `${records.length} durable ${records.length === 1 ? "record keeps" : "records keep"} autonomous work aligned.` : "No durable organizational context has been recorded yet."}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {latestUpdate ? <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" />Updated {relativeDateLabel(latestUpdate)}</span> : null}
            <span className="hidden h-4 w-px bg-border sm:block" />
            <span className="inline-flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" />{coveragePercent}% evidence-backed</span>
          </div>
          <Button size="sm" onClick={() => setShowForm((value) => !value)}><Plus className="mr-1 h-4 w-4" />New record</Button>
        </div>
      </header>

      <nav className="paperclip-surface overflow-hidden" aria-label="Organizational memory categories">
        <div className="grid grid-cols-3 divide-x divide-border">
          {KINDS.map((item) => {
            const meta = KIND_META[item];
            const Icon = meta.icon;
            const selected = item === kind;
            return (
              <button
                key={item}
                type="button"
                aria-pressed={selected}
                onClick={() => { setKind(item); setSearch(""); }}
                className={cn(
                  "group flex min-w-0 items-center gap-2 px-2 py-3 text-left outline-none transition-[background-color,box-shadow,transform] hover:bg-accent/40 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-3 sm:px-4",
                  selected && meta.activeClass,
                )}
              >
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/40 text-muted-foreground transition-transform group-hover:scale-105 sm:h-9 sm:w-9", selected && meta.iconClass)}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-muted-foreground">{meta.label}</span>
                  <span className="block text-base font-semibold tabular-nums">{counts[item]} <span className="hidden text-xs font-normal text-muted-foreground sm:inline">{meta.detail}</span></span>
                </span>
              </button>
            );
          })}
        </div>
        <div className={cn("flex min-h-9 items-center gap-2 border-t border-border px-4 py-2 text-xs", signalAttention ? "bg-amber-500/[0.04]" : "bg-muted/10")}>
          {signalAttention ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" /> : <BrainCircuit className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          <span className="hidden font-medium sm:inline">{signalAttention ? "Attention signal" : "Coverage signal"}</span>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            {signalAttention
              ? `${attentionRecords.length} ${attentionRecords.length === 1 ? "record needs" : "records need"} review or resolution.`
              : emptyKinds.length > 0
                ? `${emptyKinds.map((item) => KIND_META[item].label).join(" and ")} ${emptyKinds.length === 1 ? "is" : "are"} still empty.`
                : "All memory categories contain durable context."}
          </span>
          {signalAttention ? <span className="shrink-0 font-medium text-amber-600 dark:text-amber-400">Review highlighted records</span> : null}
        </div>
      </nav>

      {showForm ? (
        <form className="paperclip-surface overflow-hidden" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
          <div className="paperclip-surface-header flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">New {activeMeta.singular}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Capture the durable context, not just the event that produced it.</p>
            </div>
            <Button size="xs" variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
          <div className="space-y-3 p-4">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${activeMeta.singular} title`} required maxLength={300} />
            <Textarea value={statement} onChange={(event) => setStatement(event.target.value)} placeholder="State the premise, promise, or decision precisely" required />
            <div className="grid gap-3 lg:grid-cols-2">
              <Textarea value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="Rationale and evidence context (optional)" />
              <Textarea value={consequences} onChange={(event) => setConsequences(event.target.value)} placeholder="Consequences for future work (optional)" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {kind === "assumption" ? <Input type="number" min="0" max="100" value={confidence} onChange={(event) => setConfidence(event.target.value)} placeholder="Confidence %" /> : null}
              {kind === "commitment" ? <label className="text-xs text-muted-foreground">Due<Input className="mt-1" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label> : null}
              <label className="text-xs text-muted-foreground">Review<Input className="mt-1" type="datetime-local" value={reviewAt} onChange={(event) => setReviewAt(event.target.value)} /></label>
              {kind === "assumption" ? <label className="text-xs text-muted-foreground">Expires<Input className="mt-1" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label> : null}
            </div>
            {create.error ? <p className="text-sm text-destructive">{create.error.message}</p> : null}
            <Button size="sm" type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : `Create ${activeMeta.singular}`}</Button>
          </div>
        </form>
      ) : null}

      {recordsQuery.error ? <p className="text-sm text-destructive">{recordsQuery.error.message}</p> : null}
      {update.error ? <p className="text-sm text-destructive">{update.error.message}</p> : null}

      <section className="paperclip-surface overflow-hidden" aria-labelledby="memory-records-title">
        <header className="paperclip-surface-header flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="memory-records-title" className="text-sm font-semibold">{activeMeta.label}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{counts[kind]} recorded · {visibleRecords.length} shown</p>
          </div>
          {counts[kind] > 0 ? (
            <label className="relative block w-full sm:w-72">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input className="h-8 pl-8" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${activeMeta.label.toLowerCase()}`} aria-label={`Search ${activeMeta.label.toLowerCase()}`} />
            </label>
          ) : null}
        </header>

        {visibleRecords.length > 0 ? (
          <div className="grid min-w-0 gap-3 p-3 xl:grid-cols-2">
            {visibleRecords.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                owner={record.ownerAgentId ? ownerMap.get(record.ownerAgentId) ?? null : null}
                pending={update.isPending}
                onTransition={(item, status) => update.mutate({ id: item.id, status })}
              />
            ))}
          </div>
        ) : search ? (
          <div className="paperclip-empty-state m-3 px-4 py-10 text-center">
            <Search className="mx-auto h-6 w-6 text-muted-foreground" />
            <h3 className="mt-3 text-sm font-semibold">No matching {activeMeta.label.toLowerCase()}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Try a broader title, statement, rationale, or consequence.</p>
            <Button className="mt-3" size="sm" variant="outline" onClick={() => setSearch("")}>Clear search</Button>
          </div>
        ) : (
          <div className="p-3">
            <EmptyState
              icon={activeMeta.icon}
              title={`No ${activeMeta.label.toLowerCase()} recorded`}
              message={activeMeta.emptyDescription}
              examples={activeMeta.examples}
              action={`Add ${activeMeta.singular}`}
              onAction={() => setShowForm(true)}
            />
          </div>
        )}
      </section>
    </div>
  );
}
