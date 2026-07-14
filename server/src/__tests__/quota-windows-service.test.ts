import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockGetExperimental = vi.hoisted(() => vi.fn());

vi.mock("../adapters/registry.js", () => ({
  listServerAdapters: vi.fn(),
}));
vi.mock("../services/instance-settings.js", () => ({
  instanceSettingsService: () => ({
    getExperimental: mockGetExperimental,
  }),
}));

import { listServerAdapters } from "../adapters/registry.js";
import {
  fetchAllQuotaWindows,
  resetQuotaWindowLastKnownGoodForTests,
} from "../services/quota-windows.js";

describe("fetchAllQuotaWindows", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetQuotaWindowLastKnownGoodForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns adapter results without waiting for a slower provider to finish forever", async () => {
    vi.mocked(listServerAdapters).mockReturnValue([
      {
        type: "codex_local",
        getQuotaWindows: vi.fn().mockResolvedValue({
          provider: "openai",
          source: "codex-rpc",
          ok: true,
          windows: [{ label: "5h limit", usedPercent: 2, resetsAt: null, valueLabel: null, detail: null }],
        }),
      },
      {
        type: "claude_local",
        getQuotaWindows: vi.fn(() => new Promise(() => {})),
      },
    ] as never);

    const promise = fetchAllQuotaWindows();
    await vi.advanceTimersByTimeAsync(20_001);
    const results = await promise;

    expect(results).toEqual([
      {
        provider: "openai",
        source: "codex-rpc",
        ok: true,
        windows: [{ label: "5h limit", usedPercent: 2, resetsAt: null, valueLabel: null, detail: null }],
      },
      {
        provider: "anthropic",
        ok: false,
        error: "quota polling timed out after 20s",
        windows: [],
      },
    ]);
  });

  it("can skip Anthropic quota polling when disabled in instance settings", async () => {
    vi.mocked(listServerAdapters).mockReturnValue([
      {
        type: "codex_local",
        getQuotaWindows: vi.fn().mockResolvedValue({
          provider: "openai",
          source: "codex-rpc",
          ok: true,
          windows: [{ label: "5h limit", usedPercent: 2, resetsAt: null, valueLabel: null, detail: null }],
        }),
      },
      {
        type: "claude_local",
        getQuotaWindows: vi.fn().mockResolvedValue({
          provider: "anthropic",
          source: "claude-cli",
          ok: true,
          windows: [{ label: "15m limit", usedPercent: 30, resetsAt: null, valueLabel: null, detail: null }],
        }),
      },
    ] as never);
    mockGetExperimental.mockResolvedValue({
      enableAnthropicQuotaPolling: false,
    });

    const results = await fetchAllQuotaWindows({} as any);

    expect(results).toHaveLength(1);
    expect(results).toEqual([
      {
        provider: "openai",
        source: "codex-rpc",
        ok: true,
        windows: [{ label: "5h limit", usedPercent: 2, resetsAt: null, valueLabel: null, detail: null }],
      },
    ]);
    expect(mockGetExperimental).toHaveBeenCalled();
  });

  it("keeps a labelled last-known-good window across a transient provider failure", async () => {
    vi.setSystemTime(new Date("2026-07-14T20:00:00.000Z"));
    const getQuotaWindows = vi.fn()
      .mockResolvedValueOnce({
        provider: "openai",
        source: "codex-wham",
        ok: true,
        windows: [{ label: "Weekly limit", usedPercent: 17, resetsAt: "2026-07-21T20:00:00.000Z", valueLabel: null }],
      })
      .mockResolvedValueOnce({
        provider: "openai",
        ok: false,
        error: "temporary 503",
        windows: [],
      });
    vi.mocked(listServerAdapters).mockReturnValue([
      { type: "codex_local", getQuotaWindows },
    ] as never);

    await expect(fetchAllQuotaWindows()).resolves.toEqual([
      {
        provider: "openai",
        source: "codex-wham",
        ok: true,
        windows: [{ label: "Weekly limit", usedPercent: 17, resetsAt: "2026-07-21T20:00:00.000Z", valueLabel: null }],
      },
    ]);
    vi.advanceTimersByTime(5 * 60 * 1000);

    await expect(fetchAllQuotaWindows()).resolves.toEqual([
      {
        provider: "openai",
        source: "codex-wham",
        ok: true,
        stale: true,
        observedAt: "2026-07-14T20:00:00.000Z",
        error: "temporary 503",
        windows: [{ label: "Weekly limit", usedPercent: 17, resetsAt: "2026-07-21T20:00:00.000Z", valueLabel: null }],
      },
    ]);
  });

  it("expires last-known-good quota data instead of presenting it indefinitely", async () => {
    vi.setSystemTime(new Date("2026-07-14T20:00:00.000Z"));
    const getQuotaWindows = vi.fn()
      .mockResolvedValueOnce({
        provider: "openai",
        source: "codex-rpc",
        ok: true,
        windows: [{ label: "5h limit", usedPercent: 20, resetsAt: "2026-07-15T01:00:00.000Z", valueLabel: null }],
      })
      .mockResolvedValueOnce({
        provider: "openai",
        ok: false,
        error: "still unavailable",
        windows: [],
      });
    vi.mocked(listServerAdapters).mockReturnValue([
      { type: "codex_local", getQuotaWindows },
    ] as never);

    await fetchAllQuotaWindows();
    vi.advanceTimersByTime(60 * 60 * 1000 + 1);

    await expect(fetchAllQuotaWindows()).resolves.toEqual([
      {
        provider: "openai",
        ok: false,
        error: "still unavailable",
        windows: [],
      },
    ]);
  });
});
