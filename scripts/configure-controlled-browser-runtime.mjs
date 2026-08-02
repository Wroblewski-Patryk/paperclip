import { spawn } from "node:child_process";
import path from "node:path";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? "ae26bb8b-8f5f-4a85-b341-78d4e1985975";
const apply = process.argv.includes("--apply");
const targetAgentName = "09 DRE (Deployment & Reliability Engineer)";
const configPrefix = "mcp_servers.playwright.";
const cliPath = path.resolve("node_modules", "@playwright", "mcp", "cli.js");
const outputDir = path.resolve("report", "controlled-browser", "dre");

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

async function request(method, route, body) {
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${route} failed with ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

function controlledBrowserExtraArgs(current) {
  const existing = asStringArray(current);
  const preserved = [];
  for (let index = 0; index < existing.length; index += 1) {
    const arg = existing[index];
    if (arg === "-c" && existing[index + 1]?.startsWith(configPrefix)) {
      index += 1;
      continue;
    }
    if (arg.startsWith(`-c${configPrefix}`)) continue;
    preserved.push(arg);
  }
  const serverArgs = [
    cliPath,
    "--headless",
    "--isolated",
    "--browser", "msedge",
    "--block-service-workers",
    "--output-mode", "file",
    "--output-dir", outputDir,
  ];
  return [
    ...preserved,
    "-c", `${configPrefix}command=${JSON.stringify(process.execPath)}`,
    "-c", `${configPrefix}args=${JSON.stringify(serverArgs)}`,
    "-c", `${configPrefix}startup_timeout_sec=30`,
    "-c", `${configPrefix}tool_timeout_sec=120`,
  ];
}

function configuredAdapter(rawConfig) {
  const config = asRecord(rawConfig);
  return { ...config, extraArgs: controlledBrowserExtraArgs(config.extraArgs) };
}

function browserConfigIsCurrent(rawConfig) {
  const args = asStringArray(asRecord(rawConfig).extraArgs);
  return args.includes(`${configPrefix}command=${JSON.stringify(process.execPath)}`)
    && args.includes(`${configPrefix}args=${JSON.stringify([
      cliPath,
      "--headless",
      "--isolated",
      "--browser", "msedge",
      "--block-service-workers",
      "--output-mode", "file",
      "--output-dir", outputDir,
    ])}`);
}

async function verifyControlledBrowser() {
  const child = spawn(process.execPath, [
    cliPath,
    "--headless",
    "--isolated",
    "--browser", "msedge",
    "--block-service-workers",
    "--output-mode", "file",
    "--output-dir", outputDir,
  ], {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  const responses = new Map();
  let stdoutBuffer = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdoutBuffer += chunk;
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const message = JSON.parse(line);
      if (typeof message.id === "number") responses.set(message.id, message);
    }
  });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const waitFor = async (id, timeoutMs = 60_000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (responses.has(id)) return responses.get(id);
      if (child.exitCode != null) throw new Error(`Playwright MCP exited ${child.exitCode}: ${stderr.slice(0, 1_000)}`);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error(`Timed out waiting for Playwright MCP response ${id}: ${stderr.slice(0, 1_000)}`);
  };
  const send = (message) => child.stdin.write(`${JSON.stringify(message)}\n`);
  try {
    send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "paperclip-controlled-browser-verifier", version: "1.0.0" },
      },
    });
    const initialized = await waitFor(1);
    if (initialized.error) throw new Error(`Playwright MCP initialize failed: ${JSON.stringify(initialized.error)}`);
    send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
    send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    const toolsResponse = await waitFor(2);
    const tools = asRecord(toolsResponse.result).tools ?? [];
    const toolNames = Array.isArray(tools) ? tools.map((tool) => tool.name).filter(Boolean) : [];
    for (const required of ["browser_navigate", "browser_close"]) {
      if (!toolNames.includes(required)) throw new Error(`Playwright MCP is missing ${required}`);
    }
    send({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "browser_navigate", arguments: { url: "about:blank" } },
    });
    const navigate = await waitFor(3);
    if (navigate.error || asRecord(navigate.result).isError === true) throw new Error("Controlled browser launch/navigation failed");
    send({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "browser_close", arguments: {} } });
    const close = await waitFor(4);
    if (close.error || asRecord(close.result).isError === true) throw new Error("Controlled browser close failed");
    return {
      initialized: true,
      toolCount: toolNames.length,
      requiredTools: ["browser_navigate", "browser_close"],
      isolatedContextOpened: true,
      isolatedContextClosed: true,
      browser: "msedge",
      headless: true,
    };
  } finally {
    child.stdin.end();
    if (child.exitCode == null) child.kill();
  }
}

const [agents, liveRuns] = await Promise.all([
  request("GET", `/api/companies/${companyId}/agents`),
  request("GET", `/api/companies/${companyId}/live-runs`),
]);
const target = agents.find((agent) => agent.name === targetAgentName);
if (!target) throw new Error(`Target agent not found: ${targetAgentName}`);
if (apply && liveRuns.some((run) => run.agentId === target.id)) {
  throw new Error(`Refusing to reconfigure ${targetAgentName} while its heartbeat is active`);
}
const runtimeConfig = asRecord(target.runtimeConfig);
const modelProfiles = asRecord(runtimeConfig.modelProfiles);
const cheap = asRecord(modelProfiles.cheap);
const before = {
  primary: browserConfigIsCurrent(target.adapterConfig),
  cheap: browserConfigIsCurrent(cheap.adapterConfig),
};

if (apply) {
  await request("PATCH", `/api/agents/${target.id}?companyId=${companyId}`, {
    adapterConfig: configuredAdapter(target.adapterConfig),
    runtimeConfig: {
      ...runtimeConfig,
      modelProfiles: {
        ...modelProfiles,
        cheap: { ...cheap, adapterConfig: configuredAdapter(cheap.adapterConfig) },
      },
    },
  });
}

const verification = await verifyControlledBrowser();
const refreshed = apply
  ? (await request("GET", `/api/companies/${companyId}/agents`)).find((agent) => agent.id === target.id)
  : target;
const refreshedCheap = asRecord(asRecord(asRecord(refreshed.runtimeConfig).modelProfiles).cheap);
console.log(JSON.stringify({
  mode: apply ? "apply" : "verify",
  targetAgent: { id: target.id, name: target.name },
  targetActiveRunCount: liveRuns.filter((run) => run.agentId === target.id).length,
  before,
  after: {
    primary: browserConfigIsCurrent(refreshed.adapterConfig),
    cheap: browserConfigIsCurrent(refreshedCheap.adapterConfig),
  },
  verification,
  persistedBrowserProfile: false,
  productionMutation: false,
  secretValuesRead: false,
}, null, 2));
