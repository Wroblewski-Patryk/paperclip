import { boolean, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const companyCoreSettings = pgTable(
  "company_core_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    baseUrl: text("base_url"),
    workspaceId: text("workspace_id"),
    workspaceName: text("workspace_name"),
    knowledgeEnabled: boolean("knowledge_enabled").notNull().default(false),
    knowledgeApiKey: text("knowledge_api_key"),
    knowledgeProfileId: text("knowledge_profile_id"),
    knowledgeCapabilities: jsonb("knowledge_capabilities").$type<string[]>().notNull().default([]),
    toolsEnabled: boolean("tools_enabled").notNull().default(false),
    toolsApiKey: text("tools_api_key"),
    toolsProfileId: text("tools_profile_id"),
    toolsCommandMode: text("tools_command_mode").notNull().default("approval_required"),
    toolsCapabilities: jsonb("tools_capabilities").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyUq: uniqueIndex("company_core_settings_company_uq").on(table.companyId),
  }),
);
