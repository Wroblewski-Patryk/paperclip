import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const appSource = fs.readFileSync(path.resolve(testDir, "../app.ts"), "utf8");

describe("main application route registration", () => {
  it("mounts the teams catalog API in the canonical application", () => {
    expect(appSource).toContain(
      'import { teamsCatalogRoutes } from "./routes/teams-catalog.js";',
    );
    expect(appSource).toContain("api.use(teamsCatalogRoutes(db));");
  });
});
