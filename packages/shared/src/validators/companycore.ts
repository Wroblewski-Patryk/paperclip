import { z } from "zod";

export const companyCoreCommandModeSchema = z.enum([
  "read_only",
  "draft_only",
  "approval_required",
  "supervised_operator",
]);

const capabilityListSchema = z
  .array(z.string().trim().min(1))
  .max(100)
  .transform((items) => Array.from(new Set(items)));

const nullableStringSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().min(1).nullable(),
);

const patchSurfaceSchema = z.object({
  enabled: z.boolean().optional(),
  apiKey: nullableStringSchema.optional(),
  profileId: nullableStringSchema.optional(),
  capabilities: capabilityListSchema.optional(),
}).strict();

export const patchCompanyCoreSettingsSchema = z.object({
  baseUrl: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().url().nullable(),
  ).optional(),
  workspaceId: nullableStringSchema.optional(),
  workspaceName: nullableStringSchema.optional(),
  knowledge: patchSurfaceSchema.optional(),
  tools: patchSurfaceSchema.extend({
    commandMode: companyCoreCommandModeSchema.optional(),
  }).optional(),
}).strict();

export type PatchCompanyCoreSettings = z.infer<typeof patchCompanyCoreSettingsSchema>;
export type CompanyCoreCommandMode = z.infer<typeof companyCoreCommandModeSchema>;
