import assert from "node:assert/strict";
import test from "node:test";

import {
  runPublicRuntimeProbe,
  runtimeFindingForPublicProbe,
  safeErrorCause,
} from "./lib/project-truth-public-probe.mjs";

const checks = [{ name: "web_home", url: "https://app.example.test/?token=secret", required: true }];
const noTimeout = () => undefined;

function response(status, body = "") {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  };
}

test("public runtime probe reports a passing target without a control request", async () => {
  const calls = [];
  const result = await runPublicRuntimeProbe({
    checks,
    timeoutSignal: noTimeout,
    fetchImpl: async (url) => {
      calls.push(url);
      return response(200);
    },
  });

  assert.equal(result.status, "pass");
  assert.equal(result.classification, "healthy");
  assert.equal(result.controlProbe, null);
  assert.equal(calls.length, 1);
  assert.deepEqual(result.evidence, ["https://app.example.test/"]);
  assert.equal(runtimeFindingForPublicProbe(result), null);
});

test("target fetch failure with healthy control egress remains a critical production finding", async () => {
  const result = await runPublicRuntimeProbe({
    checks,
    controlUrl: "https://control.example.test/",
    timeoutSignal: noTimeout,
    fetchImpl: async (url) => {
      if (url === checks[0].url) throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND", message: "lookup failed" } });
      return response(204);
    },
  });

  assert.equal(result.status, "failed");
  assert.equal(result.classification, "production_outage");
  assert.equal(result.controlProbe.status, "pass");
  const finding = runtimeFindingForPublicProbe(result);
  assert.equal(finding.severity, "critical");
  assert.equal(finding.nextOwner, "Deployment Reliability Engineer + Ops Release Lead");
});

test("target and control fetch failures are inconclusive and route to the monitor environment owner", async () => {
  const result = await runPublicRuntimeProbe({
    checks,
    controlUrl: "https://user:password@control.example.test/?api_key=secret",
    timeoutSignal: noTimeout,
    fetchImpl: async () => {
      throw Object.assign(new TypeError("fetch failed for https://user:pw@host.test/?token=secret"), {
        cause: Object.assign(new Error("getaddrinfo ENOTFOUND host.test token=secret"), { code: "ENOTFOUND", syscall: "getaddrinfo" }),
      });
    },
  });

  assert.equal(result.status, "inconclusive");
  assert.equal(result.classification, "monitor_environment");
  assert.equal(result.controlProbe.status, "failed");
  assert.doesNotMatch(JSON.stringify(result), /password|api_key=secret|token=secret|user:pw/);
  const finding = runtimeFindingForPublicProbe(result);
  assert.equal(finding.severity, "high");
  assert.equal(finding.kind, "monitor_environment_error");
  assert.equal(finding.nextOwner, "Runtime and Adapter Engineer");
});

test("target non-2xx remains a production failure and never records a response body", async () => {
  const result = await runPublicRuntimeProbe({
    checks,
    timeoutSignal: noTimeout,
    fetchImpl: async () => response(503, "credential-like response token=must-not-appear"),
  });

  assert.equal(result.status, "failed");
  assert.equal(result.classification, "production_outage");
  assert.equal(result.controlProbe, null);
  assert.doesNotMatch(JSON.stringify(result), /must-not-appear/);
});

test("persisted probe URLs are bounded and never retain path credentials", async () => {
  const rawUrl = `https://hooks.example.test/webhook/sk_live_SUPERSECRET/${"x".repeat(600)}?token=query-secret`;
  const calls = [];
  const result = await runPublicRuntimeProbe({
    checks: [{ name: "web_home", url: rawUrl, required: true }],
    timeoutSignal: noTimeout,
    fetchImpl: async (url) => {
      calls.push(url);
      return response(200);
    },
  });

  assert.equal(calls[0], rawUrl);
  assert.equal(result.evidence[0], "https://hooks.example.test/");
  assert.ok(result.evidence[0].length <= 240);
  assert.doesNotMatch(JSON.stringify(result), /sk_live_SUPERSECRET|query-secret|webhook/);
});

test("safe error evidence is bounded and excludes stacks", () => {
  const evidence = safeErrorCause(Object.assign(new Error("x".repeat(500)), { stack: "secret stack", code: "ECONNRESET" }));
  assert.equal(evidence.message.length, 240);
  assert.equal(evidence.code, "ECONNRESET");
  assert.equal("stack" in evidence, false);
});

test("safe error evidence fully redacts authorization bearer values", () => {
  const evidence = safeErrorCause(new Error("Authorization: Bearer sk_live_SUPERSECRET"));
  assert.doesNotMatch(JSON.stringify(evidence), /sk_live_SUPERSECRET/);
});

test("safe error evidence fully redacts compound authorization and cookie headers", () => {
  const authorization = safeErrorCause(new Error("Authorization: Basic dXNlcjpzdXBlcnNlY3JldA=="));
  const cookie = safeErrorCause(new Error("Cookie: session=first-secret; auth=second-secret"));

  assert.doesNotMatch(JSON.stringify(authorization), /dXNlcjpzdXBlcnNlY3JldA/);
  assert.doesNotMatch(JSON.stringify(cookie), /first-secret|second-secret|session=|auth=/);
});
