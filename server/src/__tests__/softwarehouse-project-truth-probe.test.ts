import { describe, expect, it, vi } from "vitest";
import {
  probeSoftwarehouseProjectTruthHttps,
  resolveSoftwarehouseProjectTruthProbeAllowlist,
} from "../services/softwarehouse-project-truth-probe.js";

describe("governed Softwarehouse project-truth HTTPS probe", () => {
  it("allows only exact HTTPS targets without credentials, query strings, or fragments", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));

    await expect(probeSoftwarehouseProjectTruthHttps("http://example.com/", {
      fetchImpl,
      allowedUrls: ["http://example.com/"],
    })).rejects.toMatchObject({ status: 403 });
    await expect(probeSoftwarehouseProjectTruthHttps("https://user:secret@example.com/", {
      fetchImpl,
      allowedUrls: ["https://user:secret@example.com/"],
    })).rejects.toMatchObject({ status: 403 });
    await expect(probeSoftwarehouseProjectTruthHttps("https://example.com/?token=secret", {
      fetchImpl,
      allowedUrls: ["https://example.com/"],
    })).rejects.toMatchObject({ status: 403 });
    await expect(probeSoftwarehouseProjectTruthHttps("https://example.com/private", {
      fetchImpl,
      allowedUrls: ["https://example.com/"],
    })).rejects.toMatchObject({ status: 403 });

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("performs one bounded GET without following redirects or forwarding caller headers", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, {
      status: 302,
      headers: { Location: "http://127.0.0.1/private" },
    }));

    const result = await probeSoftwarehouseProjectTruthHttps("https://example.com/", {
      fetchImpl,
      allowedUrls: ["https://example.com/"],
    });

    expect(result).toMatchObject({
      outcome: "response",
      url: "https://example.com/",
      httpStatus: 302,
      body: null,
      error: null,
    });
    expect(fetchImpl).toHaveBeenCalledWith("https://example.com/", expect.objectContaining({
      method: "GET",
      redirect: "manual",
      headers: {
        Accept: "*/*",
        "Cache-Control": "no-cache",
      },
    }));
  });

  it("returns at most 32 KiB and only for an allowlisted JSON build-info response", async () => {
    const body = JSON.stringify({ sha: "a".repeat(40_000) });
    const result = await probeSoftwarehouseProjectTruthHttps(
      "https://soar.luckysparrow.ch/api/build-info",
      {
        fetchImpl: async () => new Response(body, {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }),
        allowedUrls: ["https://soar.luckysparrow.ch/api/build-info"],
      },
    );

    expect(result.outcome).toBe("response");
    expect(Buffer.byteLength(result.body ?? "", "utf8")).toBeLessThanOrEqual(32_768);
    expect(result.url).toBe("https://soar.luckysparrow.ch/");
  });

  it("classifies network errors without retaining target paths, secrets, or stacks", async () => {
    const error = Object.assign(new TypeError("fetch failed for https://host.test/private?token=secret"), {
      stack: "secret stack",
      cause: { code: "EACCES" },
    });
    const result = await probeSoftwarehouseProjectTruthHttps("https://example.com/", {
      fetchImpl: async () => { throw error; },
      allowedUrls: ["https://example.com/"],
    });

    expect(result).toMatchObject({
      outcome: "network_error",
      httpStatus: null,
      body: null,
      error: { name: "TypeError", code: "EACCES" },
    });
    expect(JSON.stringify(result)).not.toMatch(/private|token=secret|secret stack/);
  });

  it("keeps operator extensions explicit, bounded, and HTTPS-only", () => {
    const extras = Array.from({ length: 40 }, (_, index) => `https://allowed-${index}.example/`).join(",");
    const allowed = resolveSoftwarehouseProjectTruthProbeAllowlist(
      `${extras},http://denied.example/,https://allowed.example/?query=denied`,
    );

    expect(allowed.size).toBeLessThanOrEqual(32);
    expect([...allowed].every((url) => url.startsWith("https://"))).toBe(true);
    expect([...allowed].some((url) => url.includes("?"))).toBe(false);
  });
});
