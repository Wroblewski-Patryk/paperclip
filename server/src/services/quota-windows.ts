import type { ProviderQuotaResult } from "@paperclipai/shared";
import type { Db } from "@paperclipai/db";
import { listServerAdapters } from "../adapters/registry.js";
import { instanceSettingsService } from "./instance-settings.js";

const QUOTA_PROVIDER_TIMEOUT_MS = 20_000;
const QUOTA_LAST_KNOWN_GOOD_MAX_AGE_MS = 60 * 60 * 1000;

interface CachedProviderQuota {
  observedAt: number;
  result: ProviderQuotaResult;
}

const lastKnownGoodQuotaByProvider = new Map<string, CachedProviderQuota>();

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
    const adapterType = adaptersToQuery[i]!.type;
    const provider = providerSlugForAdapterType(adapterType);
    const providerResult = result.status === "fulfilled"
      ? result.value
      : {
          provider,
          ok: false,
          error: String(result.reason),
          windows: [],
        };
    return rememberOrRecoverQuotaResult(providerResult);
  });
}

function rememberOrRecoverQuotaResult(result: ProviderQuotaResult): ProviderQuotaResult {
  const now = Date.now();
  if (result.ok && result.windows.length > 0) {
    lastKnownGoodQuotaByProvider.set(result.provider, {
      observedAt: now,
      result: {
        ...result,
        windows: result.windows.map((window) => ({ ...window })),
      },
    });
    return result;
  }

  const cached = lastKnownGoodQuotaByProvider.get(result.provider);
  if (!cached || now - cached.observedAt > QUOTA_LAST_KNOWN_GOOD_MAX_AGE_MS) {
    return result;
  }

  return {
    ...cached.result,
    ok: true,
    stale: true,
    observedAt: new Date(cached.observedAt).toISOString(),
    error: result.error ?? "provider quota refresh returned no usable windows",
    windows: cached.result.windows.map((window) => ({ ...window })),
  };
}

export function resetQuotaWindowLastKnownGoodForTests() {
  lastKnownGoodQuotaByProvider.clear();
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
