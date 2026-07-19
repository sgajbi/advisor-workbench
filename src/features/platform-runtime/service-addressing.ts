const BFF_PROXY_BASE_URL = "/api/bff";
const API_VERSION_PREFIX = "/api/v1";
const DEFAULT_LOTUS_ENVIRONMENT = "dev";
const DISALLOWED_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const PERFORMANCE_FIXTURE_GATEWAY_MODE = "performance";
const PERFORMANCE_FIXTURE_SCENARIOS = new Set(["populated", "unavailable"]);

export type ServiceRequestTarget = "server" | "client";

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function isOwnedPerformanceFixtureGateway(parsed: URL): boolean {
  const fixturePort = process.env.PERFORMANCE_E2E_FIXTURE_PORT?.trim();
  return (
    process.env.WORKBENCH_E2E_FIXTURE_GATEWAY?.trim() ===
      PERFORMANCE_FIXTURE_GATEWAY_MODE &&
    PERFORMANCE_FIXTURE_SCENARIOS.has(process.env.PERFORMANCE_E2E_FIXTURE?.trim() ?? "") &&
    parsed.protocol === "http:" &&
    parsed.hostname === "127.0.0.1" &&
    Boolean(fixturePort) &&
    parsed.port === fixturePort
  );
}

function assertCanonicalGatewayBaseUrl(value: string): string {
  const normalized = normalizeBaseUrl(value);
  const parsed = new URL(normalized);
  const hostname = parsed.hostname.trim().toLowerCase();

  if (DISALLOWED_LOCAL_HOSTS.has(hostname) && !isOwnedPerformanceFixtureGateway(parsed)) {
    throw new Error(
      `BFF_BASE_URL must use a canonical Lotus hostname, not local loopback (${hostname}).`
    );
  }

  return normalized;
}

export function resolveLotusEnvironment(): string {
  const configured = process.env.LOTUS_ENVIRONMENT?.trim().toLowerCase();
  return configured && configured.length > 0 ? configured : DEFAULT_LOTUS_ENVIRONMENT;
}

export function resolveGatewayBaseUrl(): string {
  const configured = process.env.BFF_BASE_URL?.trim();
  if (configured && configured.length > 0) {
    return assertCanonicalGatewayBaseUrl(configured);
  }

  const environment = resolveLotusEnvironment();
  const protocol = environment === "dev" ? "http" : "https";
  const host = environment === "prod" || environment === "production"
    ? "gateway.lotus"
    : `gateway.${environment}.lotus`;
  return assertCanonicalGatewayBaseUrl(`${protocol}://${host}`);
}

export function resolveBffProxyBaseUrl(): string {
  return BFF_PROXY_BASE_URL;
}

export function resolveWorkbenchApiBase(target: ServiceRequestTarget): string {
  if (target === "client") {
    return `${BFF_PROXY_BASE_URL}${API_VERSION_PREFIX}`;
  }
  return `${resolveGatewayBaseUrl()}${API_VERSION_PREFIX}`;
}
