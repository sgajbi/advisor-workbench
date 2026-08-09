const BFF_PROXY_BASE_URL = "/api/bff";
const API_VERSION_PREFIX = "/api/v1";
const DEFAULT_LOTUS_ENVIRONMENT = "dev";
const DISALLOWED_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const OWNED_E2E_FIXTURE_GATEWAYS = [
  {
    mode: "performance",
    portEnvironmentVariable: "PERFORMANCE_E2E_FIXTURE_PORT",
    scenarioEnvironmentVariable: "PERFORMANCE_E2E_FIXTURE",
    scenarios: new Set(["populated", "unavailable"]),
  },
  {
    mode: "report-centre",
    portEnvironmentVariable: "REPORT_CENTRE_E2E_FIXTURE_PORT",
    scenarioEnvironmentVariable: "REPORT_CENTRE_E2E_FIXTURE",
    scenarios: new Set(["state-matrix"]),
  },
  {
    mode: "portfolio",
    portEnvironmentVariable: "PORTFOLIO_E2E_FIXTURE_PORT",
    scenarioEnvironmentVariable: "PORTFOLIO_E2E_FIXTURE",
    scenarios: new Set(["cashflow"]),
  },
] as const;

export type ServiceRequestTarget = "server" | "client";

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function isOwnedE2eFixtureGateway(parsed: URL): boolean {
  const configuredMode = process.env.WORKBENCH_E2E_FIXTURE_GATEWAY?.trim();
  const fixture = OWNED_E2E_FIXTURE_GATEWAYS.find(
    (candidate) => candidate.mode === configuredMode,
  );
  if (!fixture) {
    return false;
  }

  const fixturePort = process.env[fixture.portEnvironmentVariable]?.trim();
  const fixtureScenario = process.env[fixture.scenarioEnvironmentVariable]?.trim() ?? "";
  return (
    fixture.scenarios.has(fixtureScenario) &&
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

  if (DISALLOWED_LOCAL_HOSTS.has(hostname) && !isOwnedE2eFixtureGateway(parsed)) {
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
