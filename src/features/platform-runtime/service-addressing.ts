const BFF_PROXY_BASE_URL = "/api/bff";
const API_VERSION_PREFIX = "/api/v1";
const DEFAULT_LOTUS_ENVIRONMENT = "dev";

export type ServiceRequestTarget = "server" | "client";

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export function resolveLotusEnvironment(): string {
  const configured = process.env.LOTUS_ENVIRONMENT?.trim().toLowerCase();
  return configured && configured.length > 0 ? configured : DEFAULT_LOTUS_ENVIRONMENT;
}

export function resolveGatewayBaseUrl(): string {
  const configured = process.env.BFF_BASE_URL?.trim();
  if (configured && configured.length > 0) {
    return normalizeBaseUrl(configured);
  }

  const environment = resolveLotusEnvironment();
  const protocol = environment === "dev" || environment === "local" ? "http" : "https";
  const host = environment === "prod" || environment === "production"
    ? "gateway.lotus"
    : `gateway.${environment}.lotus`;
  return `${protocol}://${host}`;
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
