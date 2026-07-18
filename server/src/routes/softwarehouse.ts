import fs from "node:fs/promises";
import path from "node:path";
import {
  softwarehouseControlStatusResponseSchema,
  softwarehouseIssueTemplateCatalogResponseSchema,
  type SoftwarehouseControlStatusResponse,
  type SoftwarehouseIssueTemplate,
  type SoftwarehouseIssueTemplateCatalogResponse,
} from "@paperclipai/shared";
import { Router } from "express";
import { assertCompanyAccess } from "./authz.js";

function resolveWorkspaceRoot() {
  const cwd = process.cwd();
  if (cwd.endsWith(`${path.sep}server`)) {
    return path.dirname(cwd);
  }
  return cwd;
}

const ROOT = resolveWorkspaceRoot();
const SOFTWAREHOUSE_STATUS_PATH = "report/softwarehouse-readiness-snapshot.latest.json";
const SOFTWAREHOUSE_STATUS_STALE_AFTER_SECONDS = 15 * 60;

interface FileStatus {
  path: string;
  exists: boolean;
  updatedAt: string | null;
  size: number | null;
}

interface SoftwarehouseDoc {
  key: string;
  title: string;
  path: string;
  exists: boolean;
  updatedAt: string | null;
  excerpt: string | null;
}

interface SoftwarehouseKnowledgeResponse {
  generatedAt: string;
  portfolioIndex: SoftwarehouseDoc;
  controlDocs: SoftwarehouseDoc[];
  graphFiles: FileStatus[];
  statusDocs: SoftwarehouseDoc[];
}

interface SoftwarehouseToolsResponse {
  generatedAt: string;
  commandCatalog: {
    path: string;
    rows: Array<Record<string, string>>;
    safetyClasses: Record<string, number>;
    ownerCounts: Record<string, number>;
  };
  runtimeLedger: {
    path: string;
    rows: Array<Record<string, string>>;
    unknownVerifications: number;
    secretEntries: number;
  };
  toolingContract: SoftwarehouseDoc;
}

interface SoftwarehouseBacklogResponse {
  generatedAt: string;
  featureBacklog: SoftwarehouseDoc;
  unificationPlan: SoftwarehouseDoc;
  appFeatureCandidates: Array<{
    title: string;
    status: "local_first" | "deferred";
    note: string;
  }>;
}

const ISSUE_TEMPLATE_CATALOG: Array<Omit<SoftwarehouseIssueTemplate, "body"> & { fileName: string }> = [
  {
    kind: "task",
    key: "task",
    label: "Task / handoff",
    description: "Standard Paperclip issue or child issue with PDCA, readiness, acceptance, verification, and ownership defaults.",
    useCase: "Creating a standard delivery issue or delegating a scoped child issue.",
    path: "docs/softwarehouse/templates/task-template.md",
    fileName: "task-template.md",
    defaultDocumentKey: "plan",
  },
  {
    kind: "bug",
    key: "bug",
    label: "Bug / incident",
    description: "Symptom, impact, reproduction, evidence, regression, and rollback-oriented defect intake.",
    useCase: "Recording a bug, incident, or regression that needs triage and proof.",
    path: "docs/softwarehouse/templates/bug-report-template.md",
    fileName: "bug-report-template.md",
    defaultDocumentKey: "bug",
  },
  {
    kind: "feature",
    key: "feature",
    label: "Feature",
    description: "User value, non-goals, behavior, API/data contracts, risks, release impact, and acceptance defaults.",
    useCase: "Specifying a new capability before implementation or delegation.",
    path: "docs/softwarehouse/templates/feature-spec-template.md",
    fileName: "feature-spec-template.md",
    defaultDocumentKey: "plan",
  },
  {
    kind: "qa",
    key: "qa",
    label: "QA proof",
    description: "Acceptance-oriented verification checklist with environment, evidence, and regression notes.",
    useCase: "Requesting QA or test automation proof for a completed lane.",
    path: "docs/softwarehouse/templates/qa-checklist-template.md",
    fileName: "qa-checklist-template.md",
    defaultDocumentKey: "qa",
  },
  {
    kind: "release",
    key: "release",
    label: "Release / deploy",
    description: "Build, deploy, smoke, rollback, security, and release decision checklist.",
    useCase: "Preparing or reviewing a release, deploy, or production-impacting change.",
    path: "docs/softwarehouse/templates/release-checklist-template.md",
    fileName: "release-checklist-template.md",
    defaultDocumentKey: "release",
  },
  {
    kind: "work-report",
    key: "work-report",
    label: "Work report",
    description: "Closure report for files changed, verification, source control, deploy impact, risk, and next ownership.",
    useCase: "Closing code, docs, proof, or coordination work with durable evidence.",
    path: "docs/softwarehouse/templates/work-report-template.md",
    fileName: "work-report-template.md",
    defaultDocumentKey: "work-report",
  },
  {
    kind: "adr",
    key: "adr",
    label: "ADR",
    description: "Architecture decision record for context, decision, alternatives, consequences, and follow-up.",
    useCase: "Recording a non-trivial architecture, integration, data, or security decision.",
    path: "docs/softwarehouse/templates/adr-template.md",
    fileName: "adr-template.md",
    defaultDocumentKey: "adr",
  },
  {
    kind: "agent-role",
    key: "agent-role",
    label: "Agent role",
    description: "Role responsibility template for agent ownership, boundaries, handoffs, and done criteria.",
    useCase: "Drafting or updating an agent role responsibility file.",
    path: "docs/softwarehouse/templates/agent-role-template.md",
    fileName: "agent-role-template.md",
    defaultDocumentKey: null,
  },
];

async function statOptional(relativePath: string, base = ROOT): Promise<FileStatus> {
  const fullPath = path.resolve(base, relativePath);
  try {
    const stats = await fs.stat(fullPath);
    return {
      path: path.relative(ROOT, fullPath).replaceAll("\\", "/"),
      exists: true,
      updatedAt: stats.mtime.toISOString(),
      size: stats.size,
    };
  } catch {
    return {
      path: path.relative(ROOT, fullPath).replaceAll("\\", "/"),
      exists: false,
      updatedAt: null,
      size: null,
    };
  }
}

async function readTextOptional(relativePath: string, base = ROOT): Promise<string | null> {
  try {
    return await fs.readFile(path.resolve(base, relativePath), "utf8");
  } catch {
    return null;
  }
}

function titleFromMarkdown(content: string | null, fallback: string) {
  if (!content) return fallback;
  const heading = content.split(/\r?\n/).find((line) => line.startsWith("# "));
  return heading?.replace(/^#\s+/, "").trim() || fallback;
}

function excerptFromMarkdown(content: string | null) {
  if (!content) return null;
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  return lines.slice(0, 3).join(" ").slice(0, 420) || null;
}

async function readDoc(key: string, relativePath: string, fallbackTitle: string, base = ROOT): Promise<SoftwarehouseDoc> {
  const [status, content] = await Promise.all([
    statOptional(relativePath, base),
    readTextOptional(relativePath, base),
  ]);
  return {
    key,
    title: titleFromMarkdown(content, fallbackTitle),
    path: status.path,
    exists: status.exists,
    updatedAt: status.updatedAt,
    excerpt: excerptFromMarkdown(content),
  };
}

async function readIssueTemplateCatalog(): Promise<SoftwarehouseIssueTemplate[]> {
  return Promise.all(
    ISSUE_TEMPLATE_CATALOG.map(async ({ fileName: _fileName, ...entry }) => ({
      ...entry,
      body: (await readTextOptional(entry.path)) ?? "",
    })),
  );
}

function parseCsv(content: string | null): Array<Record<string, string>> {
  if (!content) return [];
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  const headers = lines.shift()?.split(",").map((header) => header.trim()) ?? [];
  if (headers.length === 0) return [];

  return lines.map((line) => {
    const cells = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (index === headers.length - 1) {
        row[header] = cells.slice(index).join(",").trim();
      } else {
        row[header] = (cells[index] ?? "").trim();
      }
    });
    return row;
  });
}

function countBy(rows: Array<Record<string, string>>, key: string) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const value = row[key]?.trim() || "unknown";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function countMatching(rows: Array<Record<string, string>>, key: string, predicate: (value: string) => boolean) {
  return rows.filter((row) => predicate(row[key]?.trim() ?? "")).length;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function nullableCount(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function emptyControlStatus(now: Date, observedAt: string | null = null): SoftwarehouseControlStatusResponse {
  return {
    generatedAt: now.toISOString(),
    observedAt,
    sourcePath: SOFTWAREHOUSE_STATUS_PATH,
    available: false,
    stale: true,
    staleAfterSeconds: SOFTWAREHOUSE_STATUS_STALE_AFTER_SECONDS,
    ageSeconds: null,
    auditOverall: null,
    controlDecision: null,
    effectiveOperatingPosture: null,
    supervisionReady: null,
    fullDeliveryReady: null,
    activeRunCount: null,
    liveRunCount: null,
    operatorActionStatus: null,
    headline: null,
    recommendedAction: null,
    primaryNextAction: null,
    deliveryPermission: {
      protectedDeliveryAllowed: null,
      projectRepoMutationAllowed: null,
      canStartNewLane: null,
      allowedLaneTypes: [],
      reason: null,
    },
    blockedGates: [],
    dirtyProjects: [],
    allowedWhileBlocked: [],
    forbiddenWhileBlocked: [],
    requiredBeforeFullDelivery: [],
    nextControlActions: [],
    projectTruth: {
      projectCount: 0,
      projectsWithGaps: 0,
      criticalRuntimeFindings: 0,
      totalGaps: 0,
      projects: [],
    },
  };
}

export async function loadSoftwarehouseControlStatus(
  workspaceRoot = ROOT,
  now = new Date(),
): Promise<SoftwarehouseControlStatusResponse> {
  const fullPath = path.resolve(workspaceRoot, SOFTWAREHOUSE_STATUS_PATH);
  let raw: Record<string, unknown>;
  let fileModifiedAt: string | null = null;

  try {
    const [content, stats] = await Promise.all([
      fs.readFile(fullPath, "utf8"),
      fs.stat(fullPath),
    ]);
    raw = asRecord(JSON.parse(content));
    fileModifiedAt = stats.mtime.toISOString();
  } catch {
    return softwarehouseControlStatusResponseSchema.parse(emptyControlStatus(now));
  }

  const controlBrief = asRecord(raw.controlBrief);
  const deliveryPermission = asRecord(controlBrief.deliveryPermission);
  const truth = asRecord(raw.projectTruthAudit);
  const rawObservedAt = nullableString(raw.generatedAt) ?? fileModifiedAt;
  const observedTimestamp = rawObservedAt ? Date.parse(rawObservedAt) : Number.NaN;
  const observedAt = Number.isFinite(observedTimestamp)
    ? new Date(observedTimestamp).toISOString()
    : fileModifiedAt;
  const ageSeconds = observedAt
    ? Math.max(0, Math.floor((now.getTime() - Date.parse(observedAt)) / 1000))
    : null;

  const blockedGates = (Array.isArray(controlBrief.blockedGates)
    ? controlBrief.blockedGates
    : Array.isArray(raw.blockedGates) ? raw.blockedGates : [])
    .map((value) => asRecord(value))
    .map((gate) => ({
      project: nullableString(gate.project),
      rootBlocker: nullableString(gate.rootBlocker),
      owner: nullableString(gate.owner),
      evidenceRequired: nullableString(gate.ownerAction),
      operatorPrompt: nullableString(gate.operatorPrompt),
    }));

  const projects = (Array.isArray(truth.projects) ? truth.projects : [])
    .map((value) => asRecord(value))
    .map((project) => {
      const firstGap = asRecord(project.firstGap);
      const hasFirstGap = Object.keys(firstGap).length > 0;
      return {
        name: nullableString(project.name) ?? "Unknown project",
        ok: nullableBoolean(project.ok),
        publicProbeStatus: nullableString(project.publicProbeStatus),
        projectTruthStatus: nullableString(project.projectTruthStatus),
        totalGaps: nullableCount(project.totalGaps) ?? 0,
        firstGap: hasFirstGap ? {
          kind: nullableString(firstGap.kind),
          severity: nullableString(firstGap.severity),
          userFlow: nullableString(firstGap.userFlow),
          summary: nullableString(firstGap.summary),
          nextOwner: nullableString(firstGap.nextOwner),
          nextAction: nullableString(firstGap.nextAction),
          risk: nullableString(firstGap.risk),
        } : null,
      };
    });

  const response: SoftwarehouseControlStatusResponse = {
    ...emptyControlStatus(now, observedAt),
    available: true,
    stale: ageSeconds === null || ageSeconds > SOFTWAREHOUSE_STATUS_STALE_AFTER_SECONDS,
    ageSeconds,
    auditOverall: nullableString(raw.auditOverall),
    controlDecision: nullableString(raw.controlDecision),
    effectiveOperatingPosture: nullableString(raw.effectiveOperatingPosture),
    supervisionReady: nullableBoolean(raw.supervisionReady),
    fullDeliveryReady: nullableBoolean(raw.twoProjectFullDeliveryReady),
    activeRunCount: nullableCount(raw.activeRunCount),
    liveRunCount: nullableCount(raw.liveRunCount),
    operatorActionStatus: nullableString(raw.operatorActionStatus),
    headline: nullableString(controlBrief.headline),
    recommendedAction: nullableString(raw.recommendedAction),
    primaryNextAction: nullableString(controlBrief.primaryNextAction),
    deliveryPermission: {
      protectedDeliveryAllowed: nullableBoolean(deliveryPermission.protectedDeliveryAllowed),
      projectRepoMutationAllowed: nullableBoolean(deliveryPermission.projectRepoMutationAllowed),
      canStartNewLane: nullableBoolean(deliveryPermission.canStartNewLane),
      allowedLaneTypes: stringArray(deliveryPermission.allowedLaneTypes),
      reason: nullableString(deliveryPermission.reason),
    },
    blockedGates,
    dirtyProjects: stringArray(raw.dirtyProjects),
    allowedWhileBlocked: stringArray(raw.allowedWhileBlocked),
    forbiddenWhileBlocked: stringArray(raw.forbiddenWhileBlocked),
    requiredBeforeFullDelivery: stringArray(raw.requiredBeforeFullDelivery),
    nextControlActions: stringArray(raw.nextControlActions),
    projectTruth: {
      projectCount: nullableCount(truth.projectCount) ?? projects.length,
      projectsWithGaps: nullableCount(truth.projectsWithGaps) ?? projects.filter((project) => project.totalGaps > 0).length,
      criticalRuntimeFindings: nullableCount(truth.criticalRuntimeFindings) ?? 0,
      totalGaps: nullableCount(truth.totalGaps) ?? projects.reduce((sum, project) => sum + project.totalGaps, 0),
      projects,
    },
  };

  return softwarehouseControlStatusResponseSchema.parse(response);
}

export function softwarehouseRoutes() {
  const router = Router();

  router.get("/companies/:companyId/softwarehouse/status", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await loadSoftwarehouseControlStatus());
  });

  router.get("/companies/:companyId/softwarehouse/knowledge", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const [portfolioIndex, controlDocs, graphFiles, statusDocs] = await Promise.all([
      readDoc("portfolio-index", "softwarehouse/portfolio/APPLICATIONS_INDEX.md", "Applications Index"),
      Promise.all([
        readDoc("readme", "softwarehouse/README.md", "Softwarehouse README"),
        readDoc("operating-processes", "softwarehouse/operating-processes.md", "Operating Processes"),
        readDoc("autonomous-model", "softwarehouse/autonomous-operating-model.md", "Autonomous Operating Model"),
        readDoc("architecture-layer", "softwarehouse/architectural-awareness-layer.md", "Architectural Awareness Layer"),
        readDoc("service-topology", "docs/operations/service-topology.md", "Service Topology"),
        readDoc("app-feature-backlog", "softwarehouse/paperclip-app-feature-backlog.md", "Paperclip App Feature Backlog"),
      ]),
      Promise.all([
        statOptional("docs/graphs/architecture-awareness.json"),
        statOptional("docs/graphs/architecture-awareness.csv"),
        statOptional("docs/graphs/architecture-proof-register.csv"),
        statOptional("docs/graphs/architecture-graph.md"),
        statOptional("docs/graphs/architecture-health.json"),
      ]),
      Promise.all([
        readDoc("architecture-awareness-report", "docs/status/architecture-awareness-report.md", "Architecture Awareness Report"),
        readDoc("architecture-dependency-report", "docs/status/architecture-dependency-report.md", "Architecture Dependency Report"),
        readDoc("architecture-ownership-report", "docs/status/architecture-ownership-report.md", "Architecture Ownership Report"),
        readDoc("task-synchronization-report", "docs/status/task-synchronization-report.md", "Task Synchronization Report"),
        readDoc("softwarehouse-unblock-packet", "docs/status/softwarehouse-unblock-packet.md", "Softwarehouse Unblock Packet"),
      ]),
    ]);

    const response: SoftwarehouseKnowledgeResponse = {
      generatedAt: new Date().toISOString(),
      portfolioIndex,
      controlDocs,
      graphFiles,
      statusDocs,
    };
    res.json(response);
  });

  router.get("/companies/:companyId/softwarehouse/tools", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const [catalogContent, ledgerContent, toolingContract] = await Promise.all([
      readTextOptional("docs/automation/agent-command-catalog.csv"),
      readTextOptional("docs/operations/runtime-config-ledger.csv"),
      readDoc("tooling-contract", "docs/automation/tooling-contract.md", "Tooling Contract"),
    ]);
    const catalogRows = parseCsv(catalogContent);
    const ledgerRows = parseCsv(ledgerContent);

    const response: SoftwarehouseToolsResponse = {
      generatedAt: new Date().toISOString(),
      commandCatalog: {
        path: "docs/automation/agent-command-catalog.csv",
        rows: catalogRows,
        safetyClasses: countBy(catalogRows, "Safety class"),
        ownerCounts: countBy(catalogRows, "Owner"),
      },
      runtimeLedger: {
        path: "docs/operations/runtime-config-ledger.csv",
        rows: ledgerRows,
        unknownVerifications: countMatching(ledgerRows, "Last verified", (value) => value === "unknown" || value === ""),
        secretEntries: countMatching(ledgerRows, "Secret", (value) => value === "yes" || value === "mixed"),
      },
      toolingContract,
    };
    res.json(response);
  });

  router.get("/companies/:companyId/softwarehouse/backlog", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const [featureBacklog, unificationPlan] = await Promise.all([
      readDoc("feature-backlog", "softwarehouse/paperclip-app-feature-backlog.md", "Paperclip App Feature Backlog"),
      readDoc("unification-plan", "softwarehouse/paperclip-unification-plan.md", "Paperclip Unification Plan"),
    ]);
    const response: SoftwarehouseBacklogResponse = {
      generatedAt: new Date().toISOString(),
      featureBacklog,
      unificationPlan,
      appFeatureCandidates: [
        {
          title: "Local Knowledge / Tools cockpit",
          status: "local_first",
          note: "Use architecture graphs, command catalog, runtime ledger, and service topology before any external CompanyCore bridge.",
        },
        {
          title: "External CompanyCore bridge",
          status: "deferred",
          note: "Defer until local read-only cockpit proves useful and secret/connector ownership is clear.",
        },
        {
          title: "Hindsight memory plugin",
          status: "deferred",
          note: "Defer to avoid token-heavy memory flows; use lightweight docs and ledgers for now.",
        },
      ],
    };
    res.json(response);
  });

  router.get("/companies/:companyId/softwarehouse/issue-templates", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const response: SoftwarehouseIssueTemplateCatalogResponse = {
      generatedAt: new Date().toISOString(),
      templates: await readIssueTemplateCatalog(),
    };
    res.json(softwarehouseIssueTemplateCatalogResponseSchema.parse(response));
  });

  return router;
}
