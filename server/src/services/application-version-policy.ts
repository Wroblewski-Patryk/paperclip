import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type VersionEntry = { version: string; status: string; semanticMarkers?: string[] };
type ApplicationEntry = {
  name: string;
  projectNames: string[];
  currentVersion: string;
  currentStatus: string;
  versions: VersionEntry[];
  forbiddenProductDomains?: string[];
};
type PolicyDocument = {
  schemaVersion: number;
  namespace: string;
  defaultPolicy?: { currentVersion?: string; currentStatus?: string };
  applications: ApplicationEntry[];
};

export type ApplicationVersionDisposition =
  | "not_controlled"
  | "authorized_current"
  | "future_version_locked"
  | "product_domain_not_authorized"
  | "policy_invalid";

export type ApplicationVersionDecision = {
  controlled: boolean;
  disposition: ApplicationVersionDisposition;
  application: ApplicationEntry | null;
  targetVersion?: string | null;
  predecessorVersion?: string | null;
  marker?: string | null;
};

function policyPath() {
  const configuredRoot = process.env.LUCKYSPARROW_SOFTWAREHOUSE_ROOT?.trim();
  const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  return path.resolve(
    configuredRoot || moduleRoot,
    "softwarehouse/portfolio/application-version-policy.json",
  );
}

function versionNumber(value: unknown) {
  const match = /^v(\d+)$/i.exec(String(value ?? "").trim());
  return match ? Number(match[1]) : null;
}

export function loadApplicationVersionPolicy(): PolicyDocument {
  const parsed = JSON.parse(fs.readFileSync(policyPath(), "utf8")) as PolicyDocument;
  if (parsed?.schemaVersion !== 1 || parsed?.namespace !== "application_release" || !Array.isArray(parsed.applications)) {
    throw new Error("Invalid application version policy");
  }
  return parsed;
}

export function evaluateApplicationVersionPolicy(input: {
  projectName: string | null;
  title?: string | null;
  description?: string | null;
  executionPolicy?: unknown;
  policy?: PolicyDocument;
}): ApplicationVersionDecision {
  const policy = input.policy ?? loadApplicationVersionPolicy();
  const projectName = String(input.projectName ?? "").trim().toLowerCase();
  const application = policy.applications.find((entry) =>
    entry.projectNames.some((name) => name.toLowerCase() === projectName),
  ) ?? null;
  if (!application) return { controlled: false, disposition: "not_controlled", application: null };

  const text = `${input.title ?? ""}\n${input.description ?? ""}`.toLowerCase();
  const forbidden = (application.forbiddenProductDomains ?? []).find((marker) => text.includes(marker.toLowerCase()));
  if (forbidden) {
    return { controlled: true, disposition: "product_domain_not_authorized", application, targetVersion: null, marker: forbidden };
  }

  const executionPolicy = input.executionPolicy && typeof input.executionPolicy === "object"
    ? input.executionPolicy as Record<string, unknown>
    : {};
  const applicationVersion = executionPolicy.applicationVersion && typeof executionPolicy.applicationVersion === "object"
    ? executionPolicy.applicationVersion as Record<string, unknown>
    : {};
  const explicitPolicyVersion = typeof applicationVersion.targetVersion === "string"
    ? applicationVersion.targetVersion
    : null;
  let targetVersion = explicitPolicyVersion
    ?? /(?:application[-_ ]version|app)[-_: ]+(v\d+)/i.exec(text)?.[1]
    ?? /\[(v\d+)\]/i.exec(text)?.[1]
    ?? null;
  if (!targetVersion) {
    for (const version of [...application.versions].sort((left, right) => (versionNumber(right.version) ?? 0) - (versionNumber(left.version) ?? 0))) {
      if ((version.semanticMarkers ?? []).some((marker) => text.includes(marker.toLowerCase()))) {
        targetVersion = version.version;
        break;
      }
    }
  }
  targetVersion = (targetVersion ?? application.currentVersion).toLowerCase();

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
