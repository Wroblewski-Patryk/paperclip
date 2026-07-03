export class TimedRequestError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "TimedRequestError";
    this.method = options.method ?? null;
    this.route = options.route ?? null;
    this.timeoutMs = options.timeoutMs ?? null;
    this.cause = options.cause;
  }
}

export class HttpRequestError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "HttpRequestError";
    this.method = options.method ?? null;
    this.route = options.route ?? null;
    this.status = options.status ?? null;
    this.body = options.body ?? "";
  }
}

export function isRequestTimeoutError(error) {
  return error?.name === "TimedRequestError"
    || error?.name === "TimeoutError"
    || error?.name === "AbortError"
    || error?.cause?.name === "TimeoutError"
    || error?.cause?.name === "AbortError";
}

function authHeaders({ authToken, runId, mutating }) {
  const headers = { "content-type": "application/json" };
  if (authToken) headers.authorization = `Bearer ${authToken}`;
  if (mutating && runId) headers["x-paperclip-run-id"] = runId;
  return headers;
}

export async function requestJson({
  apiBase,
  method,
  route,
  body,
  timeoutMs,
  authToken,
  runId,
  mutating = method !== "GET",
}) {
  const signal = AbortSignal.timeout(timeoutMs);
  let response;
  try {
    response = await fetch(`${apiBase}${route}`, {
      method,
      headers: authHeaders({ authToken, runId, mutating }),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (isRequestTimeoutError(error)) {
      throw new TimedRequestError(`${method} ${route} timed out after ${timeoutMs}ms`, {
        method,
        route,
        timeoutMs,
        cause: error,
      });
    }
    throw error;
  }

  const text = await response.text();
  if (!response.ok) {
    throw new HttpRequestError(`${method} ${route} failed with ${response.status}: ${text}`, {
      method,
      route,
      status: response.status,
      body: text,
    });
  }

  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${method} ${route} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}
