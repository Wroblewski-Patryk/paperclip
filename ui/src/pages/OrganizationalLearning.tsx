import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OrganizationalObservation, OrganizationalObservationKind } from "@paperclipai/shared";
import { Activity, CheckCircle2, Plus, RefreshCw } from "lucide-react";
import { organizationalObservationsApi } from "../api/organizationalObservations";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { cn } from "../lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";

const KINDS: OrganizationalObservationKind[] = ["outcome", "causal", "external_signal", "learning"];
const LABELS: Record<OrganizationalObservationKind, string> = {
  outcome: "Outcomes", causal: "Causes", external_signal: "External signals", learning: "Learning",
};
const TRANSITIONS: Record<OrganizationalObservationKind, Record<string, string[]>> = {
  outcome: { active: ["verified", "disputed", "archived"], verified: ["disputed", "archived"], disputed: ["active", "archived"] },
  causal: { proposed: ["accepted", "disputed", "archived"], accepted: ["disputed", "archived"], disputed: ["proposed", "archived"] },
  external_signal: { current: ["stale", "contradicted", "archived"], stale: ["current", "contradicted", "archived"], contradicted: ["current", "archived"] },
  learning: { proposed: ["validated", "rejected"], validated: ["promoted", "rejected"], rejected: ["proposed"] },
};

function ObservationCard({ item, pending, onTransition }: { item: OrganizationalObservation; pending: boolean; onTransition: (item: OrganizationalObservation, status: string) => void }) {
  const staleAt = item.validUntil ?? (item.freshnessWindowHours ? new Date(new Date(item.observedAt).getTime() + item.freshnessWindowHours * 3_600_000) : null);
  return <article className="rounded-lg border border-border bg-card p-4">
    <div className="flex items-start justify-between gap-3">
      <div><h3 className="font-medium">{item.title}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{item.summary}</p></div>
      <span className={cn("rounded-full border px-2 py-0.5 text-xs", ["verified", "accepted", "validated", "promoted", "current"].includes(item.status) && "border-emerald-500/30 text-emerald-400", ["disputed", "contradicted", "stale", "failure"].includes(item.status) && "border-amber-500/30 text-amber-400")}>{item.status}</span>
    </div>
    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
      <span>Source: {item.sourceClass}</span>
      <span>Observed {new Date(item.observedAt).toLocaleString()}</span>
      {staleAt ? <span>Fresh until {new Date(staleAt).toLocaleString()}</span> : null}
      {item.outcomeLayer ? <span>{item.outcomeLayer}: {item.outcomeResult}</span> : null}
      {item.causalRole ? <span>{item.causalRole.replaceAll("_", " ")}</span> : null}
      {item.externalCategory ? <span>{item.externalCategory}</span> : null}
    </div>
    {(TRANSITIONS[item.kind][item.status] ?? []).length > 0 ? <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
      {(TRANSITIONS[item.kind][item.status] ?? []).map((status) => <Button key={status} size="sm" variant="outline" disabled={pending} onClick={() => onTransition(item, status)}>{["verified", "accepted", "validated", "promoted", "current"].includes(status) ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}{status}</Button>)}
    </div> : null}
  </article>;
}

export function OrganizationalLearning() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<OrganizationalObservationKind>("outcome");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState(""); const [summary, setSummary] = useState("");
  const [sourceClass, setSourceClass] = useState("operator_observation"); const [sourceRef, setSourceRef] = useState("");
  const [variant, setVariant] = useState("output"); const [result, setResult] = useState("neutral"); const [freshness, setFreshness] = useState("24");
  useEffect(() => setBreadcrumbs([{ label: "Evidence & learning" }]), [setBreadcrumbs]);
  const key = ["organizational-observations", selectedCompanyId, kind];
  const query = useQuery({ queryKey: key, queryFn: () => organizationalObservationsApi.list(selectedCompanyId!, kind), enabled: Boolean(selectedCompanyId) });
  const create = useMutation({
    mutationFn: () => organizationalObservationsApi.create(selectedCompanyId!, {
      kind, title, summary, sourceClass, observedAt: new Date().toISOString(),
      provenance: [{ kind: kind === "external_signal" ? "external" : "other", ref: sourceRef }],
      ...(kind === "outcome" ? { outcomeLayer: variant, outcomeResult: result } : {}),
      ...(kind === "causal" ? { causalRole: variant } : {}),
      ...(kind === "external_signal" ? { externalCategory: variant, freshnessWindowHours: Number(freshness) } : {}),
    }),
    onSuccess: async () => { setTitle(""); setSummary(""); setSourceRef(""); setShowForm(false); await queryClient.invalidateQueries({ queryKey: ["organizational-observations", selectedCompanyId] }); await queryClient.invalidateQueries({ queryKey: ["dashboard", selectedCompanyId] }); },
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
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["organizational-observations", selectedCompanyId] }); await queryClient.invalidateQueries({ queryKey: ["dashboard", selectedCompanyId] }); },
  });
  if (!selectedCompanyId) return <EmptyState icon={Activity} message="Select a company to view evidence and learning." />;
  if (query.isLoading) return <PageSkeleton variant="list" />;
  const variantOptions = kind === "outcome" ? ["output", "acceptance", "outcome", "impact"] : kind === "causal" ? ["symptom", "contributing_cause", "root_cause", "prevention", "success_factor"] : kind === "external_signal" ? ["production", "customer", "business", "market", "regulatory"] : [];
  return <div className="space-y-4">
    <div className="flex items-start justify-between gap-3"><div><h1 className="text-lg font-semibold">Evidence & learning</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Source-backed outcomes, causal findings, external reality and validated improvements. Learning must be validated before it can become operating infrastructure.</p></div><Button size="sm" onClick={() => setShowForm((v) => !v)}><Plus className="mr-1 h-4 w-4" />New observation</Button></div>
    <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/20 p-1">{KINDS.map((item) => <Button key={item} size="sm" variant={kind === item ? "secondary" : "ghost"} onClick={() => { setKind(item); setVariant(item === "outcome" ? "output" : item === "causal" ? "symptom" : item === "external_signal" ? "production" : ""); }}>{LABELS[item]}</Button>)}</div>
    {showForm ? <form className="space-y-3 rounded-lg border border-border bg-card p-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What was observed?" required />
      <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="State the evidence and its operational meaning without inventing causality" required />
      <div className="grid gap-3 sm:grid-cols-3"><Input value={sourceClass} onChange={(e) => setSourceClass(e.target.value)} placeholder="Source class" required /><Input value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} placeholder="Inspectable source reference" required />{variantOptions.length ? <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={variant} onChange={(e) => setVariant(e.target.value)}>{variantOptions.map((v) => <option key={v}>{v}</option>)}</select> : null}</div>
      {kind === "outcome" ? <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={result} onChange={(e) => setResult(e.target.value)}>{["success", "failure", "mixed", "neutral"].map((v) => <option key={v}>{v}</option>)}</select> : null}
      {kind === "external_signal" ? <Input type="number" min="1" max="8760" value={freshness} onChange={(e) => setFreshness(e.target.value)} placeholder="Freshness in hours" required /> : null}
      {create.error ? <p className="text-sm text-destructive">{create.error.message}</p> : null}<div className="flex gap-2"><Button size="sm" type="submit" disabled={create.isPending}>Create</Button><Button size="sm" variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button></div>
    </form> : null}
    {update.error ? <p className="text-sm text-destructive">{update.error.message}</p> : null}
    {(query.data ?? []).length === 0 ? <EmptyState icon={Activity} message={`No ${LABELS[kind].toLowerCase()} recorded.`} /> : <div className="grid gap-3 lg:grid-cols-2">{query.data!.map((item) => <ObservationCard key={item.id} item={item} pending={update.isPending} onTransition={(record, status) => update.mutate({ item: record, status })} />)}</div>}
  </div>;
}
