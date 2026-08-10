import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function localPort(value) {
  const match = String(value ?? "").match(/:(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function parseNetstatListeners(output, port) {
  const pids = new Set();
  for (const rawLine of String(output ?? "").split(/\r?\n/)) {
    const columns = rawLine.trim().split(/\s+/);
    if (columns.length < 5 || columns[0].toUpperCase() !== "TCP") continue;
    if (columns[3].toUpperCase() !== "LISTENING") continue;
    if (localPort(columns[1]) !== Number(port)) continue;
    const pid = Number(columns[4]);
    if (Number.isInteger(pid) && pid > 0) pids.add(pid);
  }
  return [...pids];
}

export function parseTasklistImageName(output, pid) {
  const line = String(output ?? "")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .find((value) => value.startsWith('"'));
  if (!line) return null;
  const fields = [...line.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
  if (fields.length < 2 || Number(fields[1]) !== Number(pid)) return null;
  return fields[0] || null;
}

export function readWindowsStrictPortListeners(port) {
  if (process.platform !== "win32") return [];
  const netstat = execFileSync("netstat.exe", ["-ano", "-p", "tcp"], {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });
  return parseNetstatListeners(netstat, port).map((pid) => {
    let imageName = null;
    try {
      const tasklist = execFileSync(
        "tasklist.exe",
        ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"],
        { encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 },
      );
      imageName = parseTasklistImageName(tasklist, pid);
    } catch {
      // A unique listener still remains useful evidence; the caller decides
      // whether missing process identity is sufficient for reconciliation.
    }
    return { pid, imageName, source: "netstat", ancestorPids: [] };
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const portIndex = process.argv.indexOf("--port");
  const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : 0);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    console.error("Usage: node windows-runtime-inventory.mjs --port <1-65535>");
    process.exitCode = 2;
  } else {
    console.log(JSON.stringify(readWindowsStrictPortListeners(port)));
  }
}
