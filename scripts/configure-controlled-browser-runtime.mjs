import { spawn } from "node:child_process";
import path from "node:path";
import { BROWSER_CAPABILITY_AGENT_NAMES } from "./lib/softwarehouse-agent-capabilities.mjs";

const apiBase = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3200";
const companyId = process.env.PAPERCLIP_COMPANY_ID ?? "ae26bb8b-8f5f-4a85-b341-78d4e1985975";
const apply = process.argv.includes("--apply");
const configPrefix = "mcp_servers.playwright.";
const cliPath = path.resolve("node_modules", "@playwright", "mcp", "cli.js");

function outputDirFor(agentName) {
  const slug = agentName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return path.resolve("report", "controlled-browser", slug);
}

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

function controlledBrowserExtraArgs(current, outputDir) {
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

function configuredAdapter(rawConfig, outputDir) {
  const config = asRecord(rawConfig);
  return { ...config, extraArgs: controlledBrowserExtraArgs(config.extraArgs, outputDir) };
}

function browserConfigIsCurrent(rawConfig, outputDir) {
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

async function verifyControlledBrowser(outputDir) {
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
const targets = BROWSER_CAPABILITY_AGENT_NAMES.map((name) => {
  const agent = agents.find((candidate) => candidate.name === name);
  if (!agent) throw new Error(`Target agent not found: ${name}`);
  return agent;
});
const activeTargets = targets.filter((target) => liveRuns.some((run) => run.agentId === target.id));
if (apply && activeTargets.length > 0) {
  throw new Error(`Refusing to reconfigure agents with active heartbeats: ${activeTargets.map((agent) => agent.name).join(", ")}`);
}

const before = targets.map((target) => {
  const cheap = asRecord(asRecord(asRecord(target.runtimeConfig).modelProfiles).cheap);
  const outputDir = outputDirFor(target.name);
  return {
    agentId: target.id,
    agent: target.name,
    primary: browserConfigIsCurrent(target.adapterConfig, outputDir),
    cheap: browserConfigIsCurrent(cheap.adapterConfig, outputDir),
  };
});

if (apply) {
  for (const target of targets) {
    const runtimeConfig = asRecord(target.runtimeConfig);
    const modelProfiles = asRecord(runtimeConfig.modelProfiles);
    const cheap = asRecord(modelProfiles.cheap);
    const outputDir = outputDirFor(target.name);
    await request("PATCH", `/api/agents/${target.id}?companyId=${companyId}`, {
      adapterConfig: configuredAdapter(target.adapterConfig, outputDir),
      runtimeConfig: {
        ...runtimeConfig,
        modelProfiles: {
          ...modelProfiles,
          cheap: { ...cheap, adapterConfig: configuredAdapter(cheap.adapterConfig, outputDir) },
        },
      },
    });
  }
}

const verification = await verifyControlledBrowser(outputDirFor("verification"));
const refreshedAgents = apply
  ? await request("GET", `/api/companies/${companyId}/agents`)
  : agents;
const after = targets.map((target) => {
  const refreshed = refreshedAgents.find((agent) => agent.id === target.id);
  const refreshedCheap = asRecord(asRecord(asRecord(refreshed.runtimeConfig).modelProfiles).cheap);
  const outputDir = outputDirFor(target.name);
  return {
    agentId: target.id,
    agent: target.name,
    primary: browserConfigIsCurrent(refreshed.adapterConfig, outputDir),
    cheap: browserConfigIsCurrent(refreshedCheap.adapterConfig, outputDir),
  };
});
console.log(JSON.stringify({
  mode: apply ? "apply" : "verify",
  targetAgents: targets.map((target) => ({ id: target.id, name: target.name })),
  targetActiveRunCount: activeTargets.length,
  before,
  after,
  verification,
  persistedBrowserProfile: false,
  productionMutation: false,
  secretValuesRead: false,
}, null, 2));
