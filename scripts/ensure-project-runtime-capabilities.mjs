import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const softwarehouseRoot = path.resolve(path.dirname(scriptPath), "..");

function uniqueExistingFiles(candidates) {
  return [...new Set(candidates.filter(Boolean).map((candidate) => path.resolve(candidate)))]
    .filter((candidate) => existsSync(candidate));
}

function pathMatches(command) {
  const locator = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(locator, [command], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) return [];
  return String(result.stdout ?? "").split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
}

function wingetPhpCandidates(env = process.env) {
  if (process.platform !== "win32" || !env.LOCALAPPDATA) return [];
  const packagesRoot = path.join(env.LOCALAPPDATA, "Microsoft", "WinGet", "Packages");
  if (!existsSync(packagesRoot)) return [];
  return readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^PHP\.PHP\.(?:NTS\.)?8\.[2-9]_/.test(entry.name))
    .map((entry) => path.join(packagesRoot, entry.name, "php.exe"));
}

function managedPhpCandidates(env = process.env) {
  const toolchainsRoot = env.LUCKYSPARROW_TOOLCHAINS_ROOT
    ? path.resolve(env.LUCKYSPARROW_TOOLCHAINS_ROOT)
    : path.join(softwarehouseRoot, ".paperclip", "runtime", "toolchains");
  if (!existsSync(toolchainsRoot)) return [];
  return readdirSync(toolchainsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^php(?:-|$)/i.test(entry.name))
    .sort((left, right) => right.name.localeCompare(left.name, undefined, { numeric: true }))
    .map((entry) => path.join(toolchainsRoot, entry.name, process.platform === "win32" ? "php.exe" : "php"));
}

export function findPhpExecutable(env = process.env) {
  const candidates = [
    env.PHP_EXECUTABLE,
    ...managedPhpCandidates(env),
    ...pathMatches("php"),
    ...wingetPhpCandidates(env),
    process.platform === "win32" ? "C:\\php\\php.exe" : null,
    process.platform === "win32" ? "C:\\xampp\\php\\php.exe" : null,
  ];
  return uniqueExistingFiles(candidates)[0] ?? null;
}

export function findDockerCli() {
  const candidates = [
    ...pathMatches("docker"),
    process.platform === "win32" ? "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe" : null,
  ];
  return uniqueExistingFiles(candidates)[0] ?? null;
}

export function findDockerDesktop() {
  if (process.platform !== "win32") return null;
  return uniqueExistingFiles([
    process.env.DOCKER_DESKTOP_EXECUTABLE,
    "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe",
  ])[0] ?? null;
}

export function inspectDockerDaemon(dockerCli = findDockerCli()) {
  if (!dockerCli) return { ok: false, reason: "docker_cli_missing", dockerCli: null };
  const result = spawnSync(dockerCli, ["info", "--format", "{{.ServerVersion}}"], {
    encoding: "utf8",
    timeout: 8_000,
    windowsHide: true,
  });
  return {
    ok: result.status === 0 && Boolean(String(result.stdout ?? "").trim()),
    reason: result.status === 0 ? null : "docker_daemon_unavailable",
    dockerCli,
    serverVersion: String(result.stdout ?? "").trim() || null,
    stderr: String(result.stderr ?? "").trim() || null,
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureDockerDaemon({ allowStart = false, timeoutMs = 180_000 } = {}) {
  const initial = inspectDockerDaemon();
  if (initial.ok || !allowStart) return { ...initial, action: initial.ok ? "already_running" : "start_not_authorized" };
  const desktop = findDockerDesktop();
  if (!desktop) return { ...initial, action: "docker_desktop_missing" };

  const child = spawn(desktop, [], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await delay(2_000);
    const current = inspectDockerDaemon(initial.dockerCli);
    if (current.ok) return { ...current, action: "started_on_demand", desktop };
  }
  return { ...inspectDockerDaemon(initial.dockerCli), action: "start_timed_out", desktop };
}

function parseArgs(argv) {
  const separator = argv.indexOf("--");
  const options = separator >= 0 ? argv.slice(0, separator) : argv;
  const command = separator >= 0 ? argv.slice(separator + 1) : [];
  const valueAfter = (flag) => {
    const index = options.indexOf(flag);
    return index >= 0 ? options[index + 1] : null;
  };
  return {
    projectRoot: path.resolve(valueAfter("--project-root") ?? process.cwd()),
    requirePhp: options.includes("--require-php"),
    requireDocker: options.includes("--require-docker"),
    startDocker: options.includes("--start-docker"),
    command,
  };
}

export async function ensureProjectRuntimeCapabilities(options) {
  const phpExecutable = options.requirePhp ? findPhpExecutable() : null;
  const docker = options.requireDocker
    ? await ensureDockerDaemon({ allowStart: options.startDocker })
    : null;
  const missing = [];
  if (options.requirePhp && !phpExecutable) missing.push("php");
  if (options.requireDocker && !docker?.ok) missing.push("docker_daemon");
  return {
    ok: missing.length === 0,
    projectRoot: options.projectRoot,
    phpExecutable,
    docker,
    missing,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await ensureProjectRuntimeCapabilities(options);
  if (!result.ok) {
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return;
  }
  if (options.command.length === 0) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const [requestedExecutable, ...args] = options.command;
  const executable = requestedExecutable === "php" && result.phpExecutable
    ? result.phpExecutable
    : requestedExecutable === "docker" && result.docker?.dockerCli
      ? result.docker.dockerCli
      : requestedExecutable;
  const child = spawn(executable, args, {
    cwd: options.projectRoot,
    env: {
      ...process.env,
      ...(result.phpExecutable
        ? { PATH: `${path.dirname(result.phpExecutable)}${path.delimiter}${process.env.PATH ?? ""}` }
        : {}),
    },
    stdio: "inherit",
    windowsHide: true,
  });
  child.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  child.on("exit", (code) => {
    process.exitCode = code ?? 1;
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) await main();
