const defaultControlUrl = "https://example.com/";
const sensitiveHeader = /\b(authorization|proxy-authorization|cookie|set-cookie)\s*[:=]\s*[^\r\n]*/gi;
const sensitiveAssignment = /\b(authorization|cookie|password|passwd|secret|token|api[-_]?key)\s*[:=]\s*([^\s,;]+)/gi;
const bearerValue = /\bbearer\s+[^\s,;]+/gi;
const urlInText = /https?:\/\/[^\s)\]}>'"]+/gi;

export function safeProbeUrl(value) {
  try {
    const url = new URL(String(value));
    const safeOrigin = new URL("/", url.origin).toString();
    return safeOrigin.length <= 240 ? safeOrigin : "redacted-url";
  } catch {
    return "invalid-url";
  }
}

function safeText(value, maxLength = 240) {
  return String(value ?? "")
    .replace(sensitiveHeader, "$1=[redacted]")
    .replace(urlInText, (url) => safeProbeUrl(url))
    .replace(bearerValue, "Bearer [redacted]")
    .replace(sensitiveAssignment, "$1=[redacted]")
    .slice(0, maxLength);
}

export function safeErrorCause(error, depth = 0) {
  if (!error || depth > 2) return null;
  const evidence = {
    name: safeText(error.name || "Error", 80),
    message: safeText(error.message || String(error)),
  };
  for (const key of ["code", "errno", "syscall", "hostname"]) {
    if (error[key] !== undefined && error[key] !== null) {
      evidence[key] = safeText(error[key], 120);
    }
  }
  const cause = safeErrorCause(error.cause, depth + 1);
  if (cause) evidence.cause = cause;
  return evidence;
}

function errorSummary(error) {
  const chain = [];
  for (let current = safeErrorCause(error); current; current = current.cause) {
    chain.push([current.name, current.code, current.message].filter(Boolean).join(" "));
  }
  return chain.join(" caused by ");
}

export function deploymentShaFrom(value) {
  if (!value || typeof value !== "object") return null;
  for (const key of ["sha", "commit", "commitSha", "gitSha", "buildSha", "revision"]) {
    if (typeof value[key] === "string" && /^[0-9a-f]{7,40}$/i.test(value[key])) return value[key];
  }
  for (const nested of Object.values(value)) {
    const found = deploymentShaFrom(nested);
    if (found) return found;
  }
  return null;
}

async function readBoundedResponseText(response, maxBytes = 32_768) {
  if (!response.body?.getReader) return String(await response.text()).slice(0, maxBytes);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let byteCount = 0;
  let text = "";
  try {
    while (byteCount < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = maxBytes - byteCount;
      const bounded = value.byteLength > remaining ? value.subarray(0, remaining) : value;
      byteCount += bounded.byteLength;
      text += decoder.decode(bounded, { stream: byteCount < maxBytes });
      if (bounded.byteLength < value.byteLength) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return text + decoder.decode();
}

async function probeTarget(check, { fetchImpl, timeoutMs, timeoutSignal }) {
  const safeUrl = safeProbeUrl(check.url);
  try {
    const response = await fetchImpl(check.url, {
      signal: timeoutSignal(timeoutMs),
      headers: { "Cache-Control": "no-cache" },
    });
    let deployedSha = null;
    if (check.name === "web_build_info" && response.ok) {
      try {
        deployedSha = deploymentShaFrom(JSON.parse(await readBoundedResponseText(response)));
      } catch {
        deployedSha = null;
      }
    }
    return {
      ...check,
      url: safeUrl,
      status: response.ok ? "pass" : "failed",
      failureType: response.ok ? null : "http_response",
      httpStatus: response.status,
      summary: `${check.name} ${safeUrl} returned ${response.status}`,
      deployedSha,
    };
  } catch (error) {
    return {
      ...check,
      url: safeUrl,
      status: "failed",
      failureType: "network_error",
      error: safeErrorCause(error),
      summary: `${check.name} ${safeUrl} fetch failed: ${errorSummary(error)}`,
    };
  }
}

async function probeControl({ fetchImpl, controlUrl, timeoutMs, timeoutSignal }) {
  const safeUrl = safeProbeUrl(controlUrl);
  try {
    if (new URL(controlUrl).protocol !== "https:") throw new Error("Control probe URL must use HTTPS");
  } catch (error) {
    return {
      name: "runner_https_egress_control",
      url: safeUrl,
      status: "failed",
      failureType: "control_configuration",
      error: safeErrorCause(error),
      summary: `Runner HTTPS egress control is misconfigured: ${errorSummary(error)}`,
    };
  }
  try {
    const response = await fetchImpl(controlUrl, {
      signal: timeoutSignal(timeoutMs),
      headers: { "Cache-Control": "no-cache" },
    });
    return {
      name: "runner_https_egress_control",
      url: safeUrl,
      status: "pass",
      httpStatus: response.status,
      summary: `Runner HTTPS egress control ${safeUrl} was reachable (HTTP ${response.status}).`,
    };
  } catch (error) {
    return {
      name: "runner_https_egress_control",
      url: safeUrl,
      status: "failed",
      failureType: "network_error",
      error: safeErrorCause(error),
      summary: `Runner HTTPS egress control ${safeUrl} failed: ${errorSummary(error)}`,
    };
  }
}

export async function runPublicRuntimeProbe({
  checks,
  fetchImpl = globalThis.fetch,
  controlUrl = process.env.PROJECT_TRUTH_EGRESS_CONTROL_URL ?? defaultControlUrl,
  timeoutMs = 15_000,
  controlTimeoutMs = 8_000,
  timeoutSignal = (milliseconds) => AbortSignal.timeout(milliseconds),
}) {
  const results = [];
  for (const check of checks) {
    results.push(await probeTarget(check, { fetchImpl, timeoutMs, timeoutSignal }));
  }

  const failed = results.filter((result) => result.required && result.status !== "pass");
  const httpFailures = failed.filter((result) => result.failureType === "http_response");
  const networkFailures = failed.filter((result) => result.failureType === "network_error");
  const controlProbe = networkFailures.length > 0
    ? await probeControl({ fetchImpl, controlUrl, timeoutMs: controlTimeoutMs, timeoutSignal })
    : null;
  const runnerEgressFailed = networkFailures.length > 0 && controlProbe?.status === "failed";
  const status = failed.length === 0
    ? "pass"
    : httpFailures.length === 0 && runnerEgressFailed
      ? "inconclusive"
      : "failed";
  const classification = status === "pass"
    ? "healthy"
    : status === "inconclusive"
      ? "monitor_environment"
      : "production_outage";
  const deployedSha = results.find((result) => result.name === "web_build_info")?.deployedSha ?? null;

  return {
    status,
    classification,
    summary: status === "pass"
      ? `All public runtime probes passed: ${results.map((result) => result.name).join(", ")}.`
      : status === "inconclusive"
        ? `Public runtime probe inconclusive: ${failed.map((result) => result.summary).join("; ")}; ${controlProbe.summary}`
        : `${failed.map((result) => result.summary).join("; ")}${controlProbe ? `; ${controlProbe.summary}` : ""}`,
    evidence: [...results.map((result) => result.url), controlProbe?.url].filter(Boolean),
    checks: results,
    controlProbe,
    deployedSha,
  };
}

export function runtimeFindingForPublicProbe(publicProbe) {
  if (publicProbe?.status === "failed") {
    return {
      id: "production-public-probe",
      kind: "runtime_error",
      classification: "production_outage",
      severity: "critical",
      layer: "production",
      status: "failing",
      summary: publicProbe.summary,
      evidence: publicProbe.evidence,
      nextOwner: "Deployment Reliability Engineer + Ops Release Lead",
      nextAction: "Create or resume a release mutation permit for read-only diagnosis, then rollback/restart/redeploy only with named resource, SHA/image, rollback, and smoke proof.",
    };
  }
  if (publicProbe?.status === "inconclusive") {
    return {
      id: "runner-egress-public-probe",
      kind: "monitor_environment_error",
      classification: "monitor_environment",
      severity: "high",
      layer: "monitor_environment",
      status: "inconclusive",
      summary: publicProbe.summary,
      evidence: publicProbe.evidence,
      nextOwner: "Runtime and Adapter Engineer",
      nextAction: "Restore or change the runner DNS/TCP/HTTPS egress path, then rerun the bounded target and control probes before asserting production health.",
    };
  }
  return null;
}
