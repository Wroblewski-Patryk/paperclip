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
            AND table_name IN (
              'admission_controls', 'admission_control_transitions', 'admission_decisions',
              'assignment_proposals', 'product_deliveries', 'product_outcomes', 'delivery_tasks', 'delivery_transitions'
            )
          ORDER BY table_name
        `;
        expect(tables.map((row) => row.table_name)).toEqual([
          "admission_control_transitions",
          "admission_controls",
          "admission_decisions",
          "assignment_proposals",
          "delivery_tasks",
          "delivery_transitions",
          "product_deliveries",
          "product_outcomes",
        ]);

        const columns = await sql<{ column_name: string }[]>`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'admission_controls'
            AND column_name = 'project_id'
        `;
        expect(columns).toHaveLength(1);

        const indexes = await sql<{ indexname: string }[]>`
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname IN (
              'admission_controls_company_scope_unique',
              'admission_controls_company_id_key',
              'admission_control_transitions_control_key_unique',
              'agent_wakeup_requests_company_id_key',
              'agent_wakeup_requests_deferred_dedupe_unique',
              'admission_decisions_fingerprint_created_idx',
              'assignment_proposals_company_key_unique',
              'delivery_tasks_delivery_issue_unique',
              'delivery_transitions_delivery_key_unique',
              'heartbeat_runs_wakeup_request_unique_idx',
              'projects_company_id_key'
            )
          ORDER BY indexname
        `;
        expect(indexes.map((row) => row.indexname)).toHaveLength(11);

        const companySafeConstraints = await sql<{ table_name: string }[]>`
          SELECT DISTINCT table_name
          FROM information_schema.table_constraints
          WHERE constraint_schema = 'public'
            AND constraint_type IN ('FOREIGN KEY', 'CHECK')
            AND (
              constraint_name LIKE 'admission_control_transitions_company_control_id%'
              OR constraint_name LIKE 'admission_controls_company_project_id%'
              OR constraint_name = 'admission_controls_project_scope_check'
              OR constraint_name LIKE 'agent_wakeup_requests_company_project_id%'
              OR constraint_name LIKE 'agent_wakeup_requests_company_control_id%'
              OR constraint_name LIKE 'heartbeat_runs_company_wakeup_request_id%'
            )
          ORDER BY table_name
        `;
        expect(companySafeConstraints.map((row) => row.table_name)).toEqual([
          "admission_control_transitions",
          "admission_controls",
          "agent_wakeup_requests",
          "heartbeat_runs",
        ]);
      } finally {
        await sql.end();
      }
    },
    process.platform === "win32" ? 90_000 : 30_000,
  );
});
