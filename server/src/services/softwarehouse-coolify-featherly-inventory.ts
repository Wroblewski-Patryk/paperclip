import type { SoftwarehouseCoolifyFeatherlyInventoryResponse } from "@paperclipai/shared";

const MAX_PROVIDER_RESPONSE_BYTES = 128 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;

export const FEATHERLY_COOLIFY_APPLICATION_UUID = "dc1mn3hep62twm6ih582kblw";
export const FEATHERLY_COOLIFY_PROJECT_UUID = "a14a7zgzt6r13wtqxe5c916y";
export const FEATHERLY_COOLIFY_ENVIRONMENT_UUID = "gz5uke25v3tpqcc0o47gyw2e";

type JsonRecord = Record<string, unknown>;
type HttpCategory = SoftwarehouseCoolifyFeatherlyInventoryResponse["http"]["project"];

export interface SoftwarehouseCoolifyFeatherlyInventoryOptions {
  fetchImpl?: typeof globalThis.fetch;
  timeoutMs?: number;
  auditRef: string;
  sessionRef: string;
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function nullableString(value: unknown, maxLength = 240): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function comparableId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function categoryForStatus(status: number): HttpCategory {
  if (status >= 200 && status < 300) return "success";
  if (status >= 300 && status < 400) return "redirect_blocked";
  if (status === 401 || status === 403) return "auth_error";
  if (status === 404) return "not_found";
  if (status >= 400 && status < 500) return "client_error";
  return "provider_error";
}

function normalizeCoolifyBaseUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:"
      || url.username
      || url.password
      || url.search
      || url.hash
      || (url.port && url.port !== "443")
      || (url.pathname !== "/" && url.pathname !== "")
    ) {
      return null;
    }
    url.pathname = "/";
    return url;
  } catch {
    return null;
  }
}

async function readBoundedJson(response: Response): Promise<JsonRecord | null> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PROVIDER_RESPONSE_BYTES) return null;

  if (!response.body?.getReader) {
    const body = Buffer.from(await response.arrayBuffer());
    if (body.byteLength > MAX_PROVIDER_RESPONSE_BYTES) return null;
    try {
      return asRecord(JSON.parse(body.toString("utf8")));
    } catch {
      return null;
    }
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_PROVIDER_RESPONSE_BYTES) return null;
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  try {
    return asRecord(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch {
    return null;
  }
}

function emptyResult(input: {
  observedAt: string;
  outcome: SoftwarehouseCoolifyFeatherlyInventoryResponse["outcome"];
  providerHost: string;
  auditRef: string;
  sessionRef: string;
  http: SoftwarehouseCoolifyFeatherlyInventoryResponse["http"];
  scopeVerified?: Partial<SoftwarehouseCoolifyFeatherlyInventoryResponse["scopeVerified"]>;
}): SoftwarehouseCoolifyFeatherlyInventoryResponse {
  return {
    observedAt: input.observedAt,
    outcome: input.outcome,
    providerHost: input.providerHost,
    target: {
      projectUuid: FEATHERLY_COOLIFY_PROJECT_UUID,
      environmentUuid: FEATHERLY_COOLIFY_ENVIRONMENT_UUID,
      applicationUuid: FEATHERLY_COOLIFY_APPLICATION_UUID,
    },
    http: input.http,
    scopeVerified: {
      project: input.scopeVerified?.project ?? false,
      environment: input.scopeVerified?.environment ?? false,
      application: input.scopeVerified?.application ?? false,
    },
    project: null,
    environment: null,
    application: null,
    auditRef: input.auditRef,
    sessionRef: input.sessionRef,
    providerWriteAttempted: false,
    requestMethods: ["GET"],
    secretsReturned: false,
  };
}

export async function inspectSoftwarehouseCoolifyFeatherly(
  baseUrlValue: string,
  token: string,
  options: SoftwarehouseCoolifyFeatherlyInventoryOptions,
): Promise<SoftwarehouseCoolifyFeatherlyInventoryResponse> {
  const observedAt = new Date().toISOString();
  const baseUrl = normalizeCoolifyBaseUrl(baseUrlValue);
  if (!baseUrl || !token.trim()) {
    return emptyResult({
      observedAt,
      outcome: "invalid_runtime_binding",
      providerHost: "invalid-host",
      auditRef: options.auditRef,
      sessionRef: options.sessionRef,
      http: { project: "not_attempted", environment: "not_attempted", application: "not_attempted" },
    });
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = Math.min(Math.max(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, 1_000), DEFAULT_TIMEOUT_MS);
  const http: SoftwarehouseCoolifyFeatherlyInventoryResponse["http"] = {
    project: "not_attempted",
    environment: "not_attempted",
    application: "not_attempted",
  };
  const scopeVerified = { project: false, environment: false, application: false };
  const providerHost = baseUrl.hostname;

  const providerGet = async (path: string): Promise<{ category: HttpCategory; body: JsonRecord | null }> => {
    const target = new URL(path, baseUrl);
    if (target.origin !== baseUrl.origin || target.protocol !== "https:") {
      return { category: "invalid_target", body: null };
    }
    try {
      const response = await fetchImpl(target, {
        method: "GET",
        redirect: "manual",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const category = categoryForStatus(response.status);
      if (category !== "success") return { category, body: null };
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("application/json")) return { category: "invalid_response", body: null };
      const body = await readBoundedJson(response);
      return body
        ? { category, body }
        : { category: "invalid_response", body: null };
    } catch {
      return { category: "network_error", body: null };
    }
  };

  const projectRead = await providerGet(`/api/v1/projects/${FEATHERLY_COOLIFY_PROJECT_UUID}`);
  http.project = projectRead.category;
  if (!projectRead.body) {
    return emptyResult({
      observedAt,
      outcome: "provider_error",
      providerHost,
      auditRef: options.auditRef,
      sessionRef: options.sessionRef,
      http,
    });
  }
  const projectId = comparableId(projectRead.body.id);
  if (projectRead.body.uuid !== FEATHERLY_COOLIFY_PROJECT_UUID || !projectId) {
    return emptyResult({
      observedAt,
      outcome: "scope_mismatch",
      providerHost,
      auditRef: options.auditRef,
      sessionRef: options.sessionRef,
      http,
    });
  }
  scopeVerified.project = true;

  const environmentRead = await providerGet(
    `/api/v1/projects/${FEATHERLY_COOLIFY_PROJECT_UUID}/${FEATHERLY_COOLIFY_ENVIRONMENT_UUID}`,
  );
  http.environment = environmentRead.category;
  if (!environmentRead.body) {
    return emptyResult({
      observedAt,
      outcome: "provider_error",
      providerHost,
      auditRef: options.auditRef,
      sessionRef: options.sessionRef,
      http,
      scopeVerified,
    });
  }
  const environmentId = comparableId(environmentRead.body.id);
  const environmentProjectId = comparableId(environmentRead.body.project_id);
  const returnedEnvironmentUuid = nullableString(environmentRead.body.uuid);
  if (
    !environmentId
    || environmentProjectId !== projectId
    || (returnedEnvironmentUuid !== null && returnedEnvironmentUuid !== FEATHERLY_COOLIFY_ENVIRONMENT_UUID)
  ) {
    return emptyResult({
      observedAt,
      outcome: "scope_mismatch",
      providerHost,
      auditRef: options.auditRef,
      sessionRef: options.sessionRef,
      http,
      scopeVerified,
    });
  }
  scopeVerified.environment = true;

  const applicationRead = await providerGet(`/api/v1/applications/${FEATHERLY_COOLIFY_APPLICATION_UUID}`);
  http.application = applicationRead.category;
  if (!applicationRead.body) {
    return emptyResult({
      observedAt,
      outcome: "provider_error",
      providerHost,
      auditRef: options.auditRef,
      sessionRef: options.sessionRef,
      http,
      scopeVerified,
    });
  }
  if (
    applicationRead.body.uuid !== FEATHERLY_COOLIFY_APPLICATION_UUID
    || comparableId(applicationRead.body.environment_id) !== environmentId
  ) {
    return emptyResult({
      observedAt,
      outcome: "scope_mismatch",
      providerHost,
      auditRef: options.auditRef,
      sessionRef: options.sessionRef,
      http,
      scopeVerified,
    });
  }
  scopeVerified.application = true;

  return {
    observedAt,
    outcome: "verified",
    providerHost,
    target: {
      projectUuid: FEATHERLY_COOLIFY_PROJECT_UUID,
      environmentUuid: FEATHERLY_COOLIFY_ENVIRONMENT_UUID,
      applicationUuid: FEATHERLY_COOLIFY_APPLICATION_UUID,
    },
    http,
    scopeVerified,
    project: {
      uuid: FEATHERLY_COOLIFY_PROJECT_UUID,
      name: nullableString(projectRead.body.name),
    },
    environment: {
      uuid: FEATHERLY_COOLIFY_ENVIRONMENT_UUID,
      name: nullableString(environmentRead.body.name),
    },
    application: {
      uuid: FEATHERLY_COOLIFY_APPLICATION_UUID,
      name: nullableString(applicationRead.body.name),
      status: nullableString(applicationRead.body.status, 120),
      fqdn: nullableString(applicationRead.body.fqdn, 500),
      gitBranch: nullableString(applicationRead.body.git_branch, 240),
      gitCommitSha: nullableString(applicationRead.body.git_commit_sha, 120),
      updatedAt: nullableString(applicationRead.body.updated_at, 120),
    },
    auditRef: options.auditRef,
    sessionRef: options.sessionRef,
    providerWriteAttempted: false,
    requestMethods: ["GET", "GET", "GET"],
    secretsReturned: false,
  };
}
