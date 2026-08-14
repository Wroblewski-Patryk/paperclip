import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scriptUrl = new URL("./configure-coolify-runtime-access.mjs", import.meta.url);
let importCounter = 0;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function runHelper(fixtures, args, options = {}) {
  const requests = [];
  const output = [];
  const previous = {
    argv: process.argv,
    fetch: globalThis.fetch,
    consoleLog: console.log,
    apiUrl: process.env.PAPERCLIP_API_URL,
    apiKey: process.env.PAPERCLIP_API_KEY,
    companyId: process.env.PAPERCLIP_COMPANY_ID,
    runId: process.env.PAPERCLIP_RUN_ID,
  };

  process.argv = [process.execPath, fileURLToPath(scriptUrl), ...args];
  process.env.PAPERCLIP_API_URL = "http://paperclip.test";
  process.env.PAPERCLIP_API_KEY = options.apiKey ?? "agent-jwt";
  process.env.PAPERCLIP_COMPANY_ID = "company-1";
  if (options.runId === null) delete process.env.PAPERCLIP_RUN_ID;
  else process.env.PAPERCLIP_RUN_ID = options.runId ?? "run-audit-123";

  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    const record = {
      method: init.method ?? "GET",
      path: url.pathname + url.search,
      headers,
      body: init.body ? JSON.parse(String(init.body)) : null,
    };
    requests.push(record);

    if (record.method === "GET" && record.path === "/api/companies/company-1/secrets/metadata") {
      return jsonResponse(fixtures.metadata ?? []);
    }
    if (record.method === "GET" && record.path === "/api/companies/company-1/secrets") {
      return jsonResponse({ error: "board-only endpoint must not be used" }, 403);
    }
    if (record.method === "GET" && record.path === "/api/companies/company-1/agents") {
      return jsonResponse(fixtures.agents ?? []);
    }
    if (record.method === "GET" && record.path === "/api/companies/company-1/routines") {
      return jsonResponse(fixtures.routines ?? []);
    }
    if (record.method === "GET" && record.path.startsWith("/api/routines/")) {
      const routineId = record.path.slice("/api/routines/".length);
      return jsonResponse(fixtures.routineDetails?.[routineId] ?? {});
    }
    if (record.method === "PATCH" && record.path.startsWith("/api/agents/")) {
      return jsonResponse({ id: "response-agent-id" });
    }
    if (record.method === "PATCH" && record.path.startsWith("/api/routines/")) {
      return jsonResponse({ id: "response-routine-id" });
    }
    return jsonResponse({ error: "unexpected request" }, 404);
  };
  console.log = (...values) => output.push(values.join(" "));

  try {
    importCounter += 1;
    await import(scriptUrl.href + "?test=" + importCounter);
    return { ok: true, stdout: output.join("\n"), stderr: "", requests };
  } catch (error) {
    return {
      ok: false,
      stdout: output.join("\n"),
      stderr: error instanceof Error ? error.stack ?? error.message : String(error),
      requests,
    };
  } finally {
    process.argv = previous.argv;
    globalThis.fetch = previous.fetch;
    console.log = previous.consoleLog;
    for (const [key, value] of [
      ["PAPERCLIP_API_URL", previous.apiUrl],
      ["PAPERCLIP_API_KEY", previous.apiKey],
      ["PAPERCLIP_COMPANY_ID", previous.companyId],
      ["PAPERCLIP_RUN_ID", previous.runId],
    ]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("agent JWT dry-run resolves aliases through names-only metadata", async () => {
  const result = await runHelper({
    metadata: [{
      id: "secret-opaque-id",
      key: "coolify_read_api_token",
      value: "must-never-print",
      externalRef: "provider-reference-must-never-print",
    }],
    agents: [{
      id: "agent-dre",
      name: "09 DRE (Deployment & Reliability Engineer)",
      status: "active",
      adapterConfig: { env: {} },
    }],
  }, [
    "--agent",
    "09 DRE (Deployment & Reliability Engineer)",
    "--binding",
    "COOLIFY_API_TOKEN",
  ]);

  assert.equal(result.ok, true, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.mode, "dry-run");
  assert.equal(output.scope, "explicit-target");
  assert.equal(output.actionCount, 1);
  assert.deepEqual(output.actions[0].changedEnvKeys, ["COOLIFY_API_TOKEN"]);
  assert.deepEqual(output.actions[0].sourceSecretKeys, ["coolify_read_api_token"]);
  assert.equal(result.requests.some((entry) => entry.path.endsWith("/secrets")), false);
  assert.deepEqual(
    result.requests.map((entry) => entry.path).sort(),
    [
      "/api/companies/company-1/agents",
      "/api/companies/company-1/secrets/metadata",
    ],
  );
  assert.equal(result.requests.every((entry) => entry.headers.authorization === "Bearer agent-jwt"), true);
  assert.equal(result.stdout.includes("secret-opaque-id"), false);
  assert.equal(result.stdout.includes("must-never-print"), false);
  assert.equal(result.stdout.includes("provider-reference-must-never-print"), false);
});

test("scoped agent apply merges only selected bindings and sends the run audit header", async () => {
  const result = await runHelper({
    metadata: [{ id: "secret-agent-id", key: "coolify_read_api_token" }],
    agents: [{
      id: "agent-dre",
      name: "09 DRE (Deployment & Reliability Engineer)",
      status: "active",
      adapterConfig: {
        cwd: "C:/workspace",
        nested: { keep: true },
        env: {
          KEEP_ME: { type: "literal", value: "existing" },
          ROOST_UNRELATED: { type: "literal", value: "preserve" },
        },
      },
    }],
  }, [
    "--agent=agent-dre",
    "--bindings=COOLIFY_API_TOKEN",
    "--apply",
  ]);

  assert.equal(result.ok, true, result.stderr);
  const mutations = result.requests.filter((entry) => entry.method === "PATCH");
  assert.equal(mutations.length, 1);
  assert.equal(mutations[0].headers["x-paperclip-run-id"], "run-audit-123");
  assert.equal(mutations[0].path, "/api/agents/agent-dre?companyId=company-1");
  assert.deepEqual(mutations[0].body, {
    adapterConfig: {
      cwd: "C:/workspace",
      nested: { keep: true },
      env: {
        KEEP_ME: { type: "literal", value: "existing" },
        ROOST_UNRELATED: { type: "literal", value: "preserve" },
        COOLIFY_API_TOKEN: {
          type: "secret_ref",
          secretId: "secret-agent-id",
          version: "latest",
        },
      },
    },
  });
  assert.equal(result.stdout.includes("secret-agent-id"), false);
  assert.equal(result.stdout.includes("existing"), false);
  assert.equal(result.stdout.includes("preserve"), false);
});

test("scoped routine apply preserves unrelated env and sends the run audit header", async () => {
  const result = await runHelper({
    metadata: [{ id: "secret-routine-id", key: "coolify_base_url" }],
    routines: [{
      id: "routine-soar",
      title: "[Soar] Coolify production deploy",
      status: "active",
    }],
    routineDetails: {
      "routine-soar": {
        id: "routine-soar",
        title: "[Soar] Coolify production deploy",
        env: { KEEP_ME: { type: "literal", value: "existing" } },
      },
    },
  }, [
    "--routine",
    "[Soar] Coolify production deploy",
    "--binding",
    "COOLIFY_BASE_URL",
    "--apply",
  ]);

  assert.equal(result.ok, true, result.stderr);
  const mutations = result.requests.filter((entry) => entry.method === "PATCH");
  assert.equal(mutations.length, 1);
  assert.equal(mutations[0].headers["x-paperclip-run-id"], "run-audit-123");
  assert.equal(mutations[0].path, "/api/routines/routine-soar");
  assert.deepEqual(mutations[0].body, {
    env: {
      KEEP_ME: { type: "literal", value: "existing" },
      COOLIFY_BASE_URL: {
        type: "secret_ref",
        secretId: "secret-routine-id",
        version: "latest",
      },
    },
  });
  assert.equal(result.stdout.includes("secret-routine-id"), false);
  assert.equal(result.stdout.includes("existing"), false);
});

test("ambiguous targets and missing aliases fail before mutation", async () => {
  const ambiguous = await runHelper({
    metadata: [],
    agents: [
      {
        id: "agent-a",
        name: "09 DRE (Deployment & Reliability Engineer)",
        status: "active",
        adapterConfig: { env: {} },
      },
      {
        id: "agent-b",
        name: "09 DRE (Deployment & Reliability Engineer)",
        status: "active",
        adapterConfig: { env: {} },
      },
    ],
  }, [
    "--agent",
    "09 DRE (Deployment & Reliability Engineer)",
    "--binding",
    "COOLIFY_API_TOKEN",
    "--apply",
  ]);
  assert.equal(ambiguous.ok, false);
  assert.match(ambiguous.stderr, /selector is ambiguous/);
  assert.equal(ambiguous.requests.some((entry) => entry.method === "PATCH"), false);

  const missing = await runHelper({
    metadata: [],
    agents: [{
      id: "agent-dre",
      name: "09 DRE (Deployment & Reliability Engineer)",
      status: "active",
      adapterConfig: { env: {} },
    }],
  }, [
    "--agent",
    "agent-dre",
    "--binding",
    "COOLIFY_API_TOKEN",
    "--apply",
  ]);
  assert.equal(missing.ok, false);
  assert.match(missing.stderr, /aliases are missing from secret metadata: COOLIFY_API_TOKEN/);
  assert.equal(missing.requests.some((entry) => entry.method === "PATCH"), false);
});

test("empty or duplicate binding selection and missing audit id fail before network access", async () => {
  const cases = [
    {
      args: ["--apply"],
      runId: "run-audit-123",
      expected: /requires exactly one target and an explicit binding selection/,
    },
    {
      args: [
        "--agent",
        "agent-dre",
        "--routine",
        "routine-soar",
        "--binding",
        "COOLIFY_API_TOKEN",
        "--apply",
      ],
      runId: "run-audit-123",
      expected: /requires exactly one of --agent or --routine/,
    },
    {
      args: ["--agent", "agent-dre", "--binding=", "--apply"],
      runId: "run-audit-123",
      expected: /non-empty --binding selection/,
    },
    {
      args: ["--agent", "agent-dre", "--binding", "COOLIFY_API_TOKEN,coolify_api_token", "--apply"],
      runId: "run-audit-123",
      expected: /Binding selection is ambiguous/,
    },
    {
      args: ["--agent", "agent-dre", "--binding", "COOLIFY_API_TOKEN", "--apply"],
      runId: null,
      expected: /requires PAPERCLIP_RUN_ID/,
    },
  ];

  for (const testCase of cases) {
    const result = await runHelper({}, testCase.args, { runId: testCase.runId });
    assert.equal(result.ok, false);
    assert.match(result.stderr, testCase.expected);
    assert.equal(result.requests.length, 0);
  }
});
