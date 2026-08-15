import assert from "node:assert/strict";
import test from "node:test";

import { hasExchangeIntent, hasTradingIntent } from "./product-flow-classifier.mjs";

test("generic credentials do not imply an exchange product flow", () => {
  assert.equal(hasExchangeIntent("login validates credentials without leaking a secret"), false);
  assert.equal(hasExchangeIntent("database API key configuration"), false);
  assert.equal(hasExchangeIntent("POST /exchange-connections"), true);
  assert.equal(hasExchangeIntent("Gate.io adapter"), true);
  assert.equal(hasExchangeIntent("POST /exchange-connections", { projectName: "Featherly" }), false);
});

test("robots and generic runtime workers do not imply a trading product flow", () => {
  assert.equal(hasTradingIntent("GET /robots.txt"), false);
  assert.equal(hasTradingIntent("runtime worker status"), false);
  assert.equal(hasTradingIntent("DCA bot position worker"), true);
  assert.equal(hasTradingIntent("market order"), true);
  assert.equal(hasTradingIntent("market order", { projectName: "Roost" }), false);
  assert.equal(hasTradingIntent("market order", { projectName: "Soar" }), true);
});

test("exchange intent wins when an exchange UI also mentions authentication", () => {
  const exchangeUiEvidence = "ExchangeConnectionsView manages exchange connections for authenticated users";
  assert.equal(hasExchangeIntent(exchangeUiEvidence, { projectName: "Soar" }), true);
  assert.equal(hasExchangeIntent("authenticated login form", { projectName: "Soar" }), false);
});
