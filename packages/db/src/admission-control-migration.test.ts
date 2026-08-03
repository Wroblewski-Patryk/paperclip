import { afterEach, describe, expect, it } from "vitest";
import postgres from "postgres";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
  type EmbeddedPostgresTestDatabase,
} from "./test-embedded-postgres.js";

const support = await getEmbeddedPostgresTestSupport();
const describeEmbedded = support.supported ? describe : describe.skip;
let database: EmbeddedPostgresTestDatabase | null = null;

afterEach(async () => {
  await database?.cleanup();
  database = null;
});

describeEmbedded("admission-control migration", () => {
  it(
    "applies on a fresh database with the durable dedupe indexes",
    async () => {
      database = await startEmbeddedPostgresTestDatabase("paperclip-admission-control-");
      const sql = postgres(database.connectionString, { max: 1, onnotice: () => {} });

      try {
        const tables = await sql<{ table_name: string }[]>`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name IN ('admission_controls', 'admission_control_transitions', 'admission_decisions')
          ORDER BY table_name
        `;
        expect(tables.map((row) => row.table_name)).toEqual([
          "admission_control_transitions",
          "admission_controls",
          "admission_decisions",
        ]);

        const indexes = await sql<{ indexname: string }[]>`
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname IN (
              'admission_controls_company_scope_unique',
              'admission_control_transitions_control_key_unique',
              'agent_wakeup_requests_deferred_dedupe_unique',
              'admission_decisions_fingerprint_created_idx',
              'heartbeat_runs_wakeup_request_unique_idx'
            )
          ORDER BY indexname
        `;
        expect(indexes.map((row) => row.indexname)).toHaveLength(5);
      } finally {
        await sql.end();
      }
    },
    process.platform === "win32" ? 90_000 : 30_000,
  );
});
