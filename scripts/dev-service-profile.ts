import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLocalServiceKey } from "../server/src/services/local-service-supervisor.ts";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function bootstrapRepoManagedDevServiceEnv(
  rootDir: string,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const configuredHome = env.PAPERCLIP_HOME?.trim();
  if (configuredHome) return path.resolve(configuredHome);

  const managedHome = path.resolve(rootDir, ".paperclip", "runtime", "home");
  if (!existsSync(managedHome)) return null;

  env.PAPERCLIP_HOME = managedHome;
  return managedHome;
}

export function resolveDevRunnerPort(input: {
  envPort?: string;
  processEnvPort?: string;
  configuredPort?: number;
  defaultPort?: number;
}) {
  for (const candidate of [input.envPort, input.processEnvPort]) {
    const parsed = Number.parseInt(candidate ?? "", 10);
    if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65_535) {
      return parsed;
    }
  }

  if (Number.isInteger(input.configuredPort) && input.configuredPort! > 0 && input.configuredPort! <= 65_535) {
    return input.configuredPort!;
  }

  return input.defaultPort ?? 3100;
}

export function createDevServiceIdentity(input: {
  mode: "watch" | "dev";
  forwardedArgs: string[];
  networkProfile: string;
  port: number;
}) {
  const envFingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        mode: input.mode,
        forwardedArgs: input.forwardedArgs,
        networkProfile: input.networkProfile,
        port: input.port,
      }),
    )
    .digest("hex");

  const serviceName = input.mode === "watch" ? "paperclip-dev-watch" : "paperclip-dev-once";
  const serviceKey = createLocalServiceKey({
    profileKind: "paperclip-dev",
    serviceName,
    cwd: repoRoot,
    command: "dev-runner.ts",
    envFingerprint,
    port: input.port,
    scope: {
      repoRoot,
      mode: input.mode,
    },
  });

  return {
    serviceKey,
    serviceName,
    envFingerprint,
  };
}
