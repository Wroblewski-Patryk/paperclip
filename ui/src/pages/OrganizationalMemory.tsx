import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OrganizationalRecord, OrganizationalRecordKind } from "@paperclipai/shared";
import { BrainCircuit, CheckCircle2, Clock3, Plus, RefreshCw } from "lucide-react";
import { organizationalRecordsApi } from "../api/organizationalRecords";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { queryKeys } from "../lib/queryKeys";
import { cn } from "../lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";

const KINDS: OrganizationalRecordKind[] = ["assumption", "commitment", "decision"];
const KIND_LABELS: Record<OrganizationalRecordKind, string> = {
  assumption: "Assumptions",
  commitment: "Commitments",
  decision: "Decisions",
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

function toIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function dateLabel(value: Date | string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function RecordCard({ record, onTransition, pending }: {
  record: OrganizationalRecord;
  onTransition: (record: OrganizationalRecord, status: string) => void;
  pending: boolean;
}) {
  const dates = [
    record.dueAt ? `Due ${dateLabel(record.dueAt)}` : null,
    record.reviewAt ? `Review ${dateLabel(record.reviewAt)}` : null,
    record.expiresAt ? `Expires ${dateLabel(record.expiresAt)}` : null,
  ].filter(Boolean);
  const transitions = NEXT_STATUSES[record.kind][record.status] ?? [];

  return (
    <article className="paperclip-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-medium text-foreground">{record.title}</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{record.statement}</p>
        </div>
        <span className={cn(
          "rounded-full border px-2 py-0.5 text-xs font-medium",
          ["contradicted", "breached", "reversed"].includes(record.status) && "border-red-500/30 bg-red-500/10 text-red-400",
          ["active", "accepted", "validated", "fulfilled"].includes(record.status) && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        )}>{record.status}</span>
      </div>
      {record.rationale ? <p className="mt-3 text-xs"><span className="font-medium">Rationale:</span> {record.rationale}</p> : null}
      {record.confidence !== null ? <p className="mt-2 text-xs text-muted-foreground">Confidence: {record.confidence}%</p> : null}
      {dates.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {dates.map((date) => <span key={date} className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{date}</span>)}
        </div>
      ) : null}
      {transitions.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
          {transitions.map((status) => (
            <Button key={status} size="sm" variant="outline" disabled={pending} onClick={() => onTransition(record, status)}>
              {status === "fulfilled" || status === "validated" || status === "accepted" ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}
              {status}
            </Button>
          ))}
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
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [rationale, setRationale] = useState("");
  const [confidence, setConfidence] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [reviewAt, setReviewAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  useEffect(() => setBreadcrumbs([{ label: "Organizational memory" }]), [setBreadcrumbs]);
  const key = queryKeys.organizationalRecords.list(selectedCompanyId ?? "", kind);
  const recordsQuery = useQuery({
    queryKey: key,
    queryFn: () => organizationalRecordsApi.list(selectedCompanyId!, { kind }),
    enabled: Boolean(selectedCompanyId),
  });
  const records = useMemo(() => recordsQuery.data ?? [], [recordsQuery.data]);

  const create = useMutation({
    mutationFn: () => organizationalRecordsApi.create(selectedCompanyId!, {
      kind,
      title,
      statement,
      rationale: rationale || null,
      confidence: kind === "assumption" && confidence ? Number(confidence) : null,
      dueAt: kind === "commitment" ? toIso(dueAt) : null,
      reviewAt: toIso(reviewAt),
      expiresAt: kind === "assumption" ? toIso(expiresAt) : null,
    }),
    onSuccess: async () => {
      setTitle(""); setStatement(""); setRationale(""); setConfidence(""); setDueAt(""); setReviewAt(""); setExpiresAt("");
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Organizational memory</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Explicit premises, promises, and decisions that keep autonomous work coherent. These records never replace approvals or evidence gates.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((value) => !value)}><Plus className="mr-1 h-4 w-4" />New record</Button>
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-muted/20 p-1">
        {KINDS.map((item) => <Button key={item} size="sm" variant={kind === item ? "secondary" : "ghost"} onClick={() => setKind(item)}>{KIND_LABELS[item]}</Button>)}
      </div>

      {showForm ? (
        <form className="paperclip-surface space-y-3 p-4" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${kind} title`} required maxLength={300} />
          <Textarea value={statement} onChange={(event) => setStatement(event.target.value)} placeholder="State the premise, promise, or decision precisely" required />
          <Textarea value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="Rationale and evidence context (optional)" />
          <div className="grid gap-3 sm:grid-cols-3">
            {kind === "assumption" ? <Input type="number" min="0" max="100" value={confidence} onChange={(event) => setConfidence(event.target.value)} placeholder="Confidence %" /> : null}
            {kind === "commitment" ? <label className="text-xs text-muted-foreground">Due<Input className="mt-1" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label> : null}
            <label className="text-xs text-muted-foreground">Review<Input className="mt-1" type="datetime-local" value={reviewAt} onChange={(event) => setReviewAt(event.target.value)} /></label>
            {kind === "assumption" ? <label className="text-xs text-muted-foreground">Expires<Input className="mt-1" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label> : null}
          </div>
          {create.error ? <p className="text-sm text-destructive">{create.error.message}</p> : null}
          <div className="flex gap-2"><Button size="sm" type="submit" disabled={create.isPending}>Create</Button><Button size="sm" variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button></div>
        </form>
      ) : null}

      {recordsQuery.error ? <p className="text-sm text-destructive">{recordsQuery.error.message}</p> : null}
      {update.error ? <p className="text-sm text-destructive">{update.error.message}</p> : null}
      {records.length === 0 ? <EmptyState
        icon={BrainCircuit}
        title={`No ${KIND_LABELS[kind].toLowerCase()} recorded`}
        message="Capture the context future agents would otherwise have to rediscover."
        examples={kind === "assumption" ? ["Customer preference", "Technical constraint", "Market premise"] : kind === "commitment" ? ["Delivery promise", "Review deadline", "Owner obligation"] : ["Architecture choice", "Priority decision", "Policy exception"]}
        action={`Add ${kind}`}
        onAction={() => setShowForm(true)}
      /> : (
        <div className="grid gap-3 lg:grid-cols-2">{records.map((record) => <RecordCard key={record.id} record={record} pending={update.isPending} onTransition={(item, status) => update.mutate({ id: item.id, status })} />)}</div>
      )}
    </div>
  );
}
