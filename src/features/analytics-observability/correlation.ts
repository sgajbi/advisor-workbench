const TRACEPARENT_PATTERN = /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/;
const TRACE_ID_PATTERN = /^[0-9a-f]{32}$/;
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CORRELATION_STORAGE_PREFIX = "lotus.analytics-ui.correlation";
const TRACEPARENT_STORAGE_PREFIX = "lotus.analytics-ui.traceparent";

export type AnalyticsUiCorrelationContext = {
  correlationId: string;
  traceparent: string;
  traceId: string;
};

export function isValidAnalyticsUiTraceparent(
  value: string | null | undefined
): value is string {
  return typeof value === "string" && TRACEPARENT_PATTERN.test(value);
}

export function isValidAnalyticsUiCorrelationId(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && CORRELATION_ID_PATTERN.test(value);
}

export function buildAnalyticsUiCorrelationHeaders(
  initialHeaders?: HeadersInit,
  routeKey = "workbench-analytics"
): Headers {
  const headers = new Headers(initialHeaders);
  const context = resolveAnalyticsUiCorrelationContext(routeKey, {
    correlationId: headers.get("X-Correlation-Id"),
    traceparent: headers.get("traceparent"),
    traceId: headers.get("X-Trace-Id"),
  });

  headers.set("X-Correlation-Id", context.correlationId);
  headers.set("X-Trace-Id", context.traceId);
  headers.set("traceparent", context.traceparent);
  return headers;
}

export function prepareAnalyticsUiProxyHeaders(initialHeaders: Headers): Headers {
  const headers = new Headers(initialHeaders);
  headers.delete("host");
  return buildAnalyticsUiCorrelationHeaders(headers, "workbench-bff-proxy");
}

function resolveAnalyticsUiCorrelationContext(
  routeKey: string,
  incoming: {
    correlationId?: string | null;
    traceparent?: string | null;
    traceId?: string | null;
  }
): AnalyticsUiCorrelationContext {
  const correlationId =
    validCorrelationId(incoming.correlationId) ??
    readOrCreateSessionValue(
      `${CORRELATION_STORAGE_PREFIX}.${routeKey}`,
      createAnalyticsUiCorrelationId
    );

  const traceparent = resolveTraceparent(routeKey, incoming);

  const traceIdFromTraceparent = traceparent.split("-")[1] ?? createAnalyticsUiTraceId();

  return {
    correlationId,
    traceparent,
    traceId: traceIdFromTraceparent,
  };
}

function validCorrelationId(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && isValidAnalyticsUiCorrelationId(trimmed) ? trimmed : undefined;
}

function resolveTraceparent(
  routeKey: string,
  incoming: { traceparent?: string | null; traceId?: string | null }
): string {
  const incomingTraceparent = nonEmpty(incoming.traceparent);
  if (incomingTraceparent && isValidAnalyticsUiTraceparent(incomingTraceparent)) {
    return incomingTraceparent;
  }
  if (isValidTraceId(incoming.traceId)) {
    return createAnalyticsUiTraceparent(incoming.traceId);
  }

  const storageKey = `${TRACEPARENT_STORAGE_PREFIX}.${routeKey}`;
  const stored = getSessionStorage()?.getItem(storageKey);
  if (isValidAnalyticsUiTraceparent(stored)) {
    return stored;
  }

  const created = createAnalyticsUiTraceparent();
  getSessionStorage()?.setItem(storageKey, created);
  return created;
}

function readOrCreateSessionValue(key: string, createValue: () => string): string {
  const storage = getSessionStorage();
  const existing = storage?.getItem(key);
  if (existing) {
    return existing;
  }

  const created = createValue();
  storage?.setItem(key, created);
  return created;
}

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function nonEmpty(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isValidTraceId(value: string | null | undefined): value is string {
  return typeof value === "string" && TRACE_ID_PATTERN.test(value);
}

function createAnalyticsUiCorrelationId(): string {
  return `corr-workbench-${randomHex(8)}`;
}

function createAnalyticsUiTraceparent(traceId = createAnalyticsUiTraceId()): string {
  return `00-${traceId}-${randomHex(8)}-01`;
}

function createAnalyticsUiTraceId(): string {
  return randomHex(16);
}

function randomHex(byteCount: number): string {
  const bytes = new Uint8Array(byteCount);
  globalThis.crypto?.getRandomValues?.(bytes);
  if (bytes.some((byte) => byte !== 0)) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return Array.from({ length: byteCount }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0")
  ).join("");
}
