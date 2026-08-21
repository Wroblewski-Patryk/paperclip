import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const applicationVersionPolicyPath = path.join(moduleRoot, "softwarehouse", "portfolio", "application-version-policy.json");

function versionNumber(value) {
  const match = /^v(\d+)$/i.exec(String(value ?? "").trim());
  return match ? Number(match[1]) : null;
}

export function loadApplicationVersionPolicy(filePath = applicationVersionPolicyPath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (parsed?.schemaVersion !== 1 || parsed?.namespace !== "application_release" || !Array.isArray(parsed?.applications)) {
    throw new Error("Invalid application version policy");
  }
  return parsed;
}

export function findApplicationPolicy(policy, projectName) {
  const target = String(projectName ?? "").trim().toLowerCase();
  return policy.applications.find((application) =>
    application.projectNames.some((name) => name.toLowerCase() === target),
  ) ?? null;
}

export function evaluateApplicationWork({ policy, projectName, title = "", description = "", executionPolicy = null }) {
  const application = findApplicationPolicy(policy, projectName);
  if (!application) return { controlled: false, disposition: "not_controlled", application: null };

  const text = `${title}\n${description}`.toLowerCase();
  const forbidden = (application.forbiddenProductDomains ?? []).find((marker) => text.includes(marker.toLowerCase()));
  if (forbidden) {
    return {
      controlled: true,
      disposition: "product_domain_not_authorized",
      application,
      marker: forbidden,
      targetVersion: null,
    };
  }

  const explicit = executionPolicy?.applicationVersion?.targetVersion
    ?? /(?:application[-_ ]version|app)[-_: ]+(v\d+)/i.exec(text)?.[1]
    ?? /\[(v\d+)\]/i.exec(text)?.[1]
    ?? null;
  let targetVersion = explicit?.toLowerCase() ?? null;
  if (!targetVersion) {
    for (const version of [...application.versions].sort((a, b) => (versionNumber(b.version) ?? 0) - (versionNumber(a.version) ?? 0))) {
      if ((version.semanticMarkers ?? []).some((marker) => text.includes(marker.toLowerCase()))) {
        targetVersion = version.version;
        break;
      }
    }
  }
  targetVersion ??= application.currentVersion;

  const currentNumber = versionNumber(application.currentVersion);
  const targetNumber = versionNumber(targetVersion);
  if (currentNumber == null || targetNumber == null) {
    return { controlled: true, disposition: "policy_invalid", application, targetVersion };
  }
  if (targetNumber > currentNumber || application.versions.find((entry) => entry.version === targetVersion)?.status === "locked") {
    return {
      controlled: true,
      disposition: "future_version_locked",
      application,
      targetVersion,
      predecessorVersion: `v${targetNumber - 1}`,
    };
  }
  return { controlled: true, disposition: "authorized_current", application, targetVersion };
}

export function orderApplicationVersionPolicyActions(actions) {
  const priority = (action) => action.reasonCode === "product_scope.invalid_ancestor" ? 0 : 1;
  return [...actions].sort((left, right) => priority(left) - priority(right));
}
