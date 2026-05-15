export interface Memory {
  text: string;
  type?: string;
}

export interface RecallResponse {
  results: Memory[];
}

export class HindsightClient {
  private readonly baseUrl: string;
  private readonly token: string | undefined;

  constructor(baseUrl: string, token?: string) {
    const url = baseUrl.trim();
    if (!url) throw new Error("hindsightApiUrl is required");
    this.baseUrl = url.replace(/\/$/, "");
    this.token = token;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    return headers;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: this.headers(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`HTTP ${response.status} from ${path}: ${text}`);
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async recall(bankId: string, query: string, budget = "mid"): Promise<RecallResponse> {
    return this.request("POST", `/v1/default/banks/${encodeURIComponent(bankId)}/memories/recall`, {
      query,
      budget,
      max_tokens: 1024,
    });
  }

  async retain(
    bankId: string,
    content: string,
    documentId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const item: Record<string, unknown> = {
      content,
      context: "paperclip",
    };
    if (documentId) item.document_id = documentId;
    if (metadata) item.metadata = metadata;

    await this.request("POST", `/v1/default/banks/${encodeURIComponent(bankId)}/memories`, {
      items: [item],
      async: true,
    });
  }

  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(5_000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export function formatMemories(memories: Memory[]): string {
  if (memories.length === 0) return "";
  return memories.map((memory) => `- ${memory.text}`).join("\n");
}
