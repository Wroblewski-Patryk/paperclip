import { z } from "zod";

export const softwarehouseIssueTemplateKindSchema = z.enum([
  "task",
  "bug",
  "feature",
  "qa",
  "release",
  "work-report",
  "adr",
  "agent-role",
]);

export const softwarehouseIssueTemplateSchema = z.object({
  kind: softwarehouseIssueTemplateKindSchema,
  key: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  useCase: z.string().min(1),
  path: z.string().min(1),
  body: z.string().min(1),
  defaultDocumentKey: z.string().min(1).nullable(),
});

export const softwarehouseIssueTemplateCatalogResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  templates: z.array(softwarehouseIssueTemplateSchema),
});

export type SoftwarehouseIssueTemplateKind = z.infer<typeof softwarehouseIssueTemplateKindSchema>;
export type SoftwarehouseIssueTemplate = z.infer<typeof softwarehouseIssueTemplateSchema>;
export type SoftwarehouseIssueTemplateCatalogResponse = z.infer<typeof softwarehouseIssueTemplateCatalogResponseSchema>;
