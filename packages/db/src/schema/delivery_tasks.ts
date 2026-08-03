import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { productDeliveries } from "./product_deliveries.js";
import { issues } from "./issues.js";

export const deliveryTasks = pgTable("delivery_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  deliveryId: uuid("delivery_id").notNull().references(() => productDeliveries.id, { onDelete: "cascade" }),
  issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("implementation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  deliveryIssueUnique: uniqueIndex("delivery_tasks_delivery_issue_unique").on(table.deliveryId, table.issueId),
  issueIdx: index("delivery_tasks_issue_idx").on(table.issueId),
}));
