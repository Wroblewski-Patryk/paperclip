import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { isRequestTimeoutError, requestJson } from "./lib/timed-json-request.mjs";

async function withServer(handler, fn) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const { port } = server.address();
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("requestJson aborts slow responses with route and timeout context", async () => {
  await withServer(() => {}, async (apiBase) => {
    await assert.rejects(
      () => requestJson({
        apiBase,
        method: "GET",
        route: "/slow",
        timeoutMs: 25,
      }),
      (error) => {
        assert.equal(isRequestTimeoutError(error), true);
        assert.equal(error.route, "/slow");
        assert.equal(error.timeoutMs, 25);
        return true;
      },
    );
  });
});

test("requestJson sends auth and run-id headers for mutating requests", async () => {
  await withServer((request, response) => {
    assert.equal(request.headers.authorization, "Bearer agent-token");
    assert.equal(request.headers["x-paperclip-run-id"], "run-1");
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
  }, async (apiBase) => {
    const data = await requestJson({
      apiBase,
      method: "PATCH",
      route: "/api/issues/issue-1",
      body: { status: "todo" },
      timeoutMs: 1_000,
      authToken: "agent-token",
      runId: "run-1",
    });
    assert.deepEqual(data, { ok: true });
  });
});
