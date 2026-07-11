import type { ProviderQuotaResult } from "@paperclipai/shared";
import type { Db } from "@paperclipai/db";
import { listServerAdapters } from "../adapters/registry.js";
import { instanceSettingsService } from "./instance-settings.js";

const QUOTA_PROVIDER_TIMEOUT_MS = 20_000;

function providerSlugForAdapterType(type: string): string {
  switch (type) {
    case "claude_local":
      return "anthropic";
    case "codex_local":
      return "openai";
    default:
      return type;
  }
}

/**
 * Asks each registered adapter for its provider quota windows and aggregates the results.
 * Adapters that don't implement getQuotaWindows() are silently skipped.
 * Individual adapter failures are caught and returned as error results rather than
 * letting one provider's outage block the entire response.
 */
export async function fetchAllQuotaWindows(db?: Db): Promise<ProviderQuotaResult[]> {
  const adapters = listServerAdapters().filter((a) => a.getQuotaWindows != null);
  const shouldPollAnthropic = await shouldPollAnthropicAdapter(db);
  const adaptersToQuery = shouldPollAnthropic
    ? adapters
    : adapters.filter((adapter) => providerSlugForAdapterType(adapter.type) !== "anthropic");

  const settled = await Promise.allSettled(
    adaptersToQuery.map((adapter) => withQuotaTimeout(adapter.type, adapter.getQuotaWindows!())),
  );

  return settled.map((result, i) => {
    if (result.status === "fulfilled") return result.value;
    const adapterType = adaptersToQuery[i]!.type;
    return {
      provider: providerSlugForAdapterType(adapterType),
      ok: false,
      error: String(result.reason),
      windows: [],
    };
  });
}

async function shouldPollAnthropicAdapter(db?: Db) {
  if (!db) return true;
  try {
    const experimental = await instanceSettingsService(db).getExperimental();
    return experimental.enableAnthropicQuotaPolling;
  } catch {
    return true;
  }
}

async function withQuotaTimeout(
  adapterType: string,
  task: Promise<ProviderQuotaResult>,
): Promise<ProviderQuotaResult> {
  let timeoutId: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      task,
      new Promise<ProviderQuotaResult>((resolve) => {
        timeoutId = setTimeout(() => {
          resolve({
            provider: providerSlugForAdapterType(adapterType),
            ok: false,
            error: `quota polling timed out after ${Math.round(QUOTA_PROVIDER_TIMEOUT_MS / 1000)}s`,
            windows: [],
          });
        }, QUOTA_PROVIDER_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
