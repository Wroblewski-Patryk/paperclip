import { and, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  admissionControls,
  admissionControlTransitions,
  companies,
} from "@paperclipai/db";
import { conflict, notFound, unprocessable } from "../errors.js";

export const ADMISSION_CONTROL_STATES = ["open", "draining", "maintenance", "reopening"] as const;
export type AdmissionControlState = (typeof ADMISSION_CONTROL_STATES)[number];

const allowedTransitions: Record<AdmissionControlState, readonly AdmissionControlState[]> = {
  open: ["draining"],
  draining: ["maintenance"],
  maintenance: ["reopening"],
  reopening: ["open", "maintenance"],
};

type AdmissionEvidence = Array<Record<string, unknown>>;

export type AdmissionDecision = {
  admitted: boolean;
  disposition: "admitted" | "deferred_by_maintenance";
  controlId: string;
  controlVersion: number;
  state: AdmissionControlState;
  scopeType: "company" | "project";
  scopeId: string;
  reason: string | null;
};

export function admissionControlService(db: Db) {
  async function ensureCompanyControl(companyId: string) {
    const company = await db
      .select({ id: companies.id, status: companies.status })
      .from(companies)
      .where(eq(companies.id, companyId))
      .then((rows) => rows[0] ?? null);
    if (!company) throw notFound("Company not found");

    const existing = await db
      .select()
      .from(admissionControls)
      .where(
        and(
          eq(admissionControls.companyId, companyId),
          eq(admissionControls.scopeType, "company"),
          eq(admissionControls.scopeId, companyId),
        ),
      )
      .then((rows) => rows[0] ?? null);
    if (existing) return existing;

    const maintenance = company.status === "paused";
    return db
      .insert(admissionControls)
      .values({
        companyId,
        scopeType: "company",
        scopeId: companyId,
        state: maintenance ? "maintenance" : "open",
        reason: maintenance ? "legacy_company_pause" : "company_control_initialized",
        priorState: company.status,
        maintenanceStartedAt: maintenance ? new Date() : null,
        openedAt: maintenance ? null : new Date(),
      })
      .onConflictDoNothing()
      .returning()
      .then(async (rows) => rows[0] ?? db
        .select()
        .from(admissionControls)
        .where(
          and(
            eq(admissionControls.companyId, companyId),
            eq(admissionControls.scopeType, "company"),
            eq(admissionControls.scopeId, companyId),
          ),
        )
        .then((current) => current[0]!));
  }

  async function list(companyId: string) {
    await ensureCompanyControl(companyId);
    return db
      .select()
      .from(admissionControls)
      .where(eq(admissionControls.companyId, companyId));
  }

  async function evaluate(companyId: string, projectId?: string | null): Promise<AdmissionDecision> {
    const companyControl = await ensureCompanyControl(companyId);
    const controls = projectId
      ? await db
        .select()
        .from(admissionControls)
        .where(
          and(
            eq(admissionControls.companyId, companyId),
            inArray(admissionControls.id, [companyControl.id]),
          ),
        )
      : [companyControl];
    let selected = controls[0] ?? companyControl;
    if (projectId) {
      const projectControl = await db
        .select()
        .from(admissionControls)
        .where(
          and(
            eq(admissionControls.companyId, companyId),
            eq(admissionControls.scopeType, "project"),
            eq(admissionControls.scopeId, projectId),
          ),
        )
        .then((rows) => rows[0] ?? null);
      if (companyControl.state === "open" && projectControl) selected = projectControl;
    }
    const state = selected.state as AdmissionControlState;
    const admitted = state === "open";
    return {
      admitted,
      disposition: admitted ? "admitted" : "deferred_by_maintenance",
      controlId: selected.id,
      controlVersion: selected.version,
      state,
      scopeType: selected.scopeType as "company" | "project",
      scopeId: selected.scopeId,
      reason: selected.reason,
    };
  }

  async function transition(input: {
    companyId: string;
    scopeType?: "company" | "project";
    scopeId?: string;
    toState: AdmissionControlState;
    idempotencyKey: string;
    actorType: string;
    actorId?: string | null;
    reason?: string | null;
    evidence?: AdmissionEvidence;
  }) {
    const scopeType = input.scopeType ?? "company";
    const scopeId = input.scopeId ?? input.companyId;
    if (scopeType === "company" && scopeId !== input.companyId) {
      throw unprocessable("Company admission scope must use the company id as scopeId");
    }
    await ensureCompanyControl(input.companyId);

    return db.transaction(async (tx) => {
      await tx.execute(sql`
        select id from admission_controls
        where company_id = ${input.companyId}
          and scope_type = ${scopeType}
          and scope_id = ${scopeId}
        for update
      `);
      const control = await tx
        .select()
        .from(admissionControls)
        .where(
          and(
            eq(admissionControls.companyId, input.companyId),
            eq(admissionControls.scopeType, scopeType),
            eq(admissionControls.scopeId, scopeId),
          ),
        )
        .then((rows) => rows[0] ?? null);
      if (!control) throw notFound("Admission control not found");

      const existing = await tx
        .select()
        .from(admissionControlTransitions)
        .where(
          and(
            eq(admissionControlTransitions.admissionControlId, control.id),
            eq(admissionControlTransitions.idempotencyKey, input.idempotencyKey),
          ),
        )
        .then((rows) => rows[0] ?? null);
      if (existing) return { control, transition: existing, idempotent: true };

      const fromState = control.state as AdmissionControlState;
      if (!allowedTransitions[fromState]?.includes(input.toState)) {
        throw conflict(`Illegal admission transition: ${fromState} -> ${input.toState}`);
      }
      if ((input.toState === "reopening" || input.toState === "open") && !(input.evidence?.length)) {
        throw unprocessable("Reopening transitions require inspectable safety evidence");
      }
      const now = new Date();
      const version = control.version + 1;
      const updated = await tx
        .update(admissionControls)
        .set({
          state: input.toState,
          version,
          reason: input.reason ?? control.reason,
          priorState: fromState,
          initiatorActorType: input.actorType,
          initiatorActorId: input.actorId ?? null,
          requiredEvidence: input.evidence ?? control.requiredEvidence,
          drainStartedAt: input.toState === "draining" ? now : control.drainStartedAt,
          maintenanceStartedAt: input.toState === "maintenance" ? now : control.maintenanceStartedAt,
          reopenStartedAt: input.toState === "reopening" ? now : control.reopenStartedAt,
          openedAt: input.toState === "open" ? now : control.openedAt,
          updatedAt: now,
        })
        .where(and(eq(admissionControls.id, control.id), eq(admissionControls.version, control.version)))
        .returning()
        .then((rows) => rows[0] ?? null);
      if (!updated) throw conflict("Admission control changed concurrently");

      if (scopeType === "company") {
        if (input.toState === "maintenance") {
          await tx.update(companies).set({ status: "paused", pauseReason: input.reason, pausedAt: now, updatedAt: now })
            .where(eq(companies.id, input.companyId));
        } else if (input.toState === "open") {
          await tx.update(companies).set({ status: "active", pauseReason: null, pausedAt: null, updatedAt: now })
            .where(eq(companies.id, input.companyId));
        }
      }

      const transition = await tx
        .insert(admissionControlTransitions)
        .values({
          companyId: input.companyId,
          admissionControlId: control.id,
          fromState,
          toState: input.toState,
          controlVersion: version,
          idempotencyKey: input.idempotencyKey,
          actorType: input.actorType,
          actorId: input.actorId ?? null,
          evidence: input.evidence ?? [],
          status: "committed",
          result: { state: input.toState, version },
          updatedAt: now,
        })
        .returning()
        .then((rows) => rows[0]);
      return { control: updated, transition, idempotent: false };
    });
  }

  return { ensureCompanyControl, list, evaluate, transition };
}
