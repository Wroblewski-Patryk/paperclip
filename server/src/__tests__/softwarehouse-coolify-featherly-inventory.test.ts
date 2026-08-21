import { describe, expect, it, vi } from "vitest";
import {
  FEATHERLY_COOLIFY_APPLICATION_UUID,
  FEATHERLY_COOLIFY_ENVIRONMENT_UUID,
  FEATHERLY_COOLIFY_PROJECT_UUID,
  inspectSoftwarehouseCoolifyFeatherly,
} from "../services/softwarehouse-coolify-featherly-inventory.js";

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

const options = {
  auditRef: "softwarehouse.coolify_featherly_inventory:run-1",
  sessionRef: "heartbeat-run:run-1",
};

describe("bounded Coolify Featherly inventory", () => {
  it("performs only the three fixed GETs and returns redacted verified identity/status evidence", async () => {
    const token = "provider-token-must-not-return";
    const fetchImpl = vi.fn(async (url: URL | RequestInfo, init?: RequestInit) => {
      const target = String(url);
      expect(init).toMatchObject({
        method: "GET",
        redirect: "manual",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });
      if (target.endsWith(`/projects/${FEATHERLY_COOLIFY_PROJECT_UUID}`)) {
        return jsonResponse({ id: 11, uuid: FEATHERLY_COOLIFY_PROJECT_UUID, name: "Featherly" });
      }
      if (target.endsWith(`/projects/${FEATHERLY_COOLIFY_PROJECT_UUID}/${FEATHERLY_COOLIFY_ENVIRONMENT_UUID}`)) {
        return jsonResponse({
          id: 22,
          uuid: FEATHERLY_COOLIFY_ENVIRONMENT_UUID,
          project_id: 11,
          name: "production",
        });
      }
      if (target.endsWith(`/applications/${FEATHERLY_COOLIFY_APPLICATION_UUID}`)) {
        return jsonResponse({
          uuid: FEATHERLY_COOLIFY_APPLICATION_UUID,
          environment_id: 22,
          name: "Featherly Web",
          status: "running:healthy",
          fqdn: "https://featherly.example",
          git_branch: "main",
          git_commit_sha: "abc123",
          updated_at: "2026-08-21T10:00:00Z",
          dockerfile: "must not return",
          private_key_id: 999,
        });
      }
      throw new Error(`Unexpected target: ${target}`);
    });

    const result = await inspectSoftwarehouseCoolifyFeatherly(
      "https://coolify.example/",
      token,
      { ...options, fetchImpl },
    );

    expect(result).toMatchObject({
      outcome: "verified",
      providerHost: "coolify.example",
      http: { project: "success", environment: "success", application: "success" },
      scopeVerified: { project: true, environment: true, application: true },
      providerWriteAttempted: false,
      requestMethods: ["GET", "GET", "GET"],
      secretsReturned: false,
      application: {
        uuid: FEATHERLY_COOLIFY_APPLICATION_UUID,
        name: "Featherly Web",
        status: "running:healthy",
        gitCommitSha: "abc123",
      },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls.map(([url]) => String(url))).toEqual([
      `https://coolify.example/api/v1/projects/${FEATHERLY_COOLIFY_PROJECT_UUID}`,
      `https://coolify.example/api/v1/projects/${FEATHERLY_COOLIFY_PROJECT_UUID}/${FEATHERLY_COOLIFY_ENVIRONMENT_UUID}`,
      `https://coolify.example/api/v1/applications/${FEATHERLY_COOLIFY_APPLICATION_UUID}`,
    ]);
    expect(JSON.stringify(result)).not.toContain(token);
    expect(JSON.stringify(result)).not.toContain("dockerfile");
    expect(JSON.stringify(result)).not.toContain("private_key_id");
  });

  it("fails closed on a mismatched project before environment or application reads", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({
      id: 11,
      uuid: "different-project",
      name: "Wrong project",
    }));

    const result = await inspectSoftwarehouseCoolifyFeatherly(
      "https://coolify.example",
      "read-token",
      { ...options, fetchImpl },
    );

    expect(result).toMatchObject({
      outcome: "scope_mismatch",
      http: { project: "success", environment: "not_attempted", application: "not_attempted" },
      scopeVerified: { project: false, environment: false, application: false },
      providerWriteAttempted: false,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("blocks redirects without following or exposing their target", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, {
      status: 302,
      headers: { location: "http://127.0.0.1/private" },
    }));

    const result = await inspectSoftwarehouseCoolifyFeatherly(
      "https://coolify.example",
      "read-token",
      { ...options, fetchImpl },
    );

    expect(result).toMatchObject({
      outcome: "provider_error",
      http: { project: "redirect_blocked", environment: "not_attempted", application: "not_attempted" },
      providerWriteAttempted: false,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain("127.0.0.1");
  });

  it("rejects non-origin HTTPS base URLs before any provider request", async () => {
    const fetchImpl = vi.fn();
    const result = await inspectSoftwarehouseCoolifyFeatherly(
      "https://coolify.example/api/v1/deploy",
      "read-token",
      { ...options, fetchImpl },
    );

    expect(result).toMatchObject({
      outcome: "invalid_runtime_binding",
      providerHost: "invalid-host",
      http: { project: "not_attempted", environment: "not_attempted", application: "not_attempted" },
      providerWriteAttempted: false,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
