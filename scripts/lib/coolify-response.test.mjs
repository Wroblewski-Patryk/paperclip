import assert from "node:assert/strict";
import test from "node:test";
import { coolifyResponseItems } from "./coolify-response.mjs";

test("normalizes Coolify array and nested collection responses", () => {
  assert.deepEqual(coolifyResponseItems({ data: [{ uuid: "one" }] }), [{ uuid: "one" }]);
  assert.deepEqual(coolifyResponseItems({ data: { data: [{ uuid: "two" }] } }), [{ uuid: "two" }]);
  assert.deepEqual(coolifyResponseItems({ data: { resources: [{ uuid: "three" }] } }), [{ uuid: "three" }]);
});

test("normalizes the numeric-key object returned by the deployments endpoint", () => {
  assert.deepEqual(
    coolifyResponseItems({ data: { 0: { uuid: "first" }, 1: { uuid: "second" } } }),
    [{ uuid: "first" }, { uuid: "second" }],
  );
});

test("keeps a single Coolify resource object intact", () => {
  assert.deepEqual(
    coolifyResponseItems({ data: { uuid: "app", name: "soar-web" } }),
    [{ uuid: "app", name: "soar-web" }],
  );
  assert.deepEqual(coolifyResponseItems({ data: null }), []);
});
