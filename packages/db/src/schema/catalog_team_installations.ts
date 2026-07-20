import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export interface CatalogTeamInstallationBindings {
  agents: Record<string, string>;
  projects: Record<string, string>;
  routines: Record<string, string>;
}

export const catalogTeamInstallations = pgTable(
  "catalog_team_installations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    catalogId: text("catalog_id").notNull(),
    catalogKey: text("catalog_key").notNull(),
    packageName: text("package_name"),
    packageVersion: text("package_version"),
    originHash: text("origin_hash").notNull(),
    status: text("status").notNull().default("installed"),
    bindings: jsonb("bindings").$type<CatalogTeamInstallationBindings>().notNull().default({
      agents: {},
      projects: {},
      routines: {},
    }),
    installedAt: timestamp("installed_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("catalog_team_installations_company_idx").on(table.companyId),
    companyCatalogUq: uniqueIndex("catalog_team_installations_company_catalog_uq").on(
      table.companyId,
      table.catalogId,
    ),
  }),
);
