const DEFAULT_GATEWAY_REQUEST_TIMEOUT_MS = 15_000;
const MIN_GATEWAY_REQUEST_TIMEOUT_MS = 1_000;
const MAX_GATEWAY_REQUEST_TIMEOUT_MS = 120_000;

export function resolveGatewayRequestTimeoutMs(
  configured = process.env.WORKBENCH_GATEWAY_REQUEST_TIMEOUT_MS,
): number {
  if (configured === undefined || configured.trim() === "") {
    return DEFAULT_GATEWAY_REQUEST_TIMEOUT_MS;
  }

  const timeoutMs = Number(configured);
  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs < MIN_GATEWAY_REQUEST_TIMEOUT_MS ||
    timeoutMs > MAX_GATEWAY_REQUEST_TIMEOUT_MS
  ) {
    throw new Error(
      `WORKBENCH_GATEWAY_REQUEST_TIMEOUT_MS must be an integer from ${MIN_GATEWAY_REQUEST_TIMEOUT_MS} to ${MAX_GATEWAY_REQUEST_TIMEOUT_MS}.`,
    );
  }
  return timeoutMs;
}

export function createGatewayRequestSignal(): AbortSignal {
  return AbortSignal.timeout(resolveGatewayRequestTimeoutMs());
}

export function isGatewayRequestTimeout(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const name = "name" in error ? error.name : undefined;
  return name === "TimeoutError" || name === "AbortError";
}
