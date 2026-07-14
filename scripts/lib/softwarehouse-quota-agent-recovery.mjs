export function isStandardQuotaCritical(windows, thresholdPercent = 90) {
  return (Array.isArray(windows) ? windows : []).some((window) =>
    window?.quotaLane === "codex_standard"
    && Number.isFinite(Number(window?.usedPercent))
    && Number(window.usedPercent) >= thresholdPercent
  );
}

export function quotaWindowsFromResult(result) {
  if (Array.isArray(result)) {
    return result.flatMap((entry) => {
      if (Array.isArray(entry?.windows)) return entry.windows;
      return entry?.quotaLane ? [entry] : [];
    });
  }
  return Array.isArray(result?.windows) ? result.windows : [];
}

export function probePassed(result) {
  return result?.status === "pass"
    && !(result?.checks ?? []).some((check) => check?.level === "error");
}

export function probeIsQuotaFailure(result) {
  const errorChecks = (result?.checks ?? []).filter((check) => check?.level === "error");
  return errorChecks.some((check) => {
    const text = `${check?.code ?? ""} ${check?.message ?? ""} ${check?.detail ?? ""}`;
    return /usage limit|quota|try again at|credits? exhausted/i.test(text);
  });
}

export function quotaAgentRecoveryDecision({ quotaWindows, primaryProbe, fallbackProbe }) {
  if (probePassed(primaryProbe)) {
    return { recover: true, reason: "stale_error_primary_probe_passed" };
  }
  if (!isStandardQuotaCritical(quotaWindows)) {
    return { recover: false, reason: "standard_quota_not_critical" };
  }
  if (!probeIsQuotaFailure(primaryProbe)) {
    return { recover: false, reason: "primary_failure_is_not_quota" };
  }
  if (!probePassed(fallbackProbe)) {
    return { recover: false, reason: "spark_fallback_unavailable" };
  }
  return { recover: true, reason: "standard_quota_exhausted_spark_available" };
}
