import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { companies } from "./companies.js";

export const agentCompanyCoreTools = pgTable(
  "agent_company_core_tools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    toolName: text("tool_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentToolUq: uniqueIndex("agent_company_core_tools_agent_tool_uq").on(table.agentId, table.toolName),
    companyIdx: index("agent_company_core_tools_company_idx").on(table.companyId),
    agentIdx: index("agent_company_core_tools_agent_idx").on(table.agentId),
    toolIdx: index("agent_company_core_tools_tool_idx").on(table.companyId, table.toolName),
  }),
);
