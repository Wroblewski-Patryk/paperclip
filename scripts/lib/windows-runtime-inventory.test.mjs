import assert from "node:assert/strict";
import test from "node:test";
import { parseNetstatListeners, parseTasklistImageName } from "./windows-runtime-inventory.mjs";

test("parses and deduplicates strict TCP listeners without privileged CIM access", () => {
  const output = [
    "  TCP    127.0.0.1:3200    0.0.0.0:0    LISTENING    39164",
    "  TCP    [::1]:3200        [::]:0       LISTENING    39164",
    "  TCP    127.0.0.1:3100    0.0.0.0:0    LISTENING    100",
    "  UDP    127.0.0.1:3200    *:*                       200",
  ].join("\r\n");
  assert.deepEqual(parseNetstatListeners(output, 3200), [39164]);
});

test("extracts the exact tasklist image for the listener pid", () => {
  assert.equal(
    parseTasklistImageName('"node.exe","39164","Console","1","470,948 K"', 39164),
    "node.exe",
  );
  assert.equal(parseTasklistImageName("INFO: No tasks are running", 39164), null);
});
