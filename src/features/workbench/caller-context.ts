import { resolveConfiguredAuthorityMode } from "./authority-mode";

const DEFAULT_CALLER_CONTEXT_HEADERS = {
  "X-Actor-Id": "workbench-system",
  "X-Caller-Application": "lotus-workbench",
  "X-Tenant-Id": "tenant-sg",
  "X-Region": "APAC",
  "X-Booking-Center-Code": "SG",
  "X-Role": "advisor",
} as const;

const DEFAULT_DPM_CONTEXT = {
  mandateId: "MANDATE_PB_SG_GLOBAL_BAL_001",
  modelPortfolioId: "MODEL_PB_SG_GLOBAL_BAL_DPM",
  bookingCenterCode: "Singapore",
  sourceAsOfDate: "2026-04-10",
  commandCenterTenantId: "default",
  commandCenterPortfolioManagerId: "PM_SG_DPM_001",
  commandCenterBookId: "BOOK_SG_BALANCED_DPM",
  commandCenterAsOfDate: "2026-05-03",
} as const;

const CALLER_CONTEXT_ENV_OVERRIDES: Record<
  keyof typeof DEFAULT_CALLER_CONTEXT_HEADERS,
  string
> = {
  "X-Actor-Id": "WORKBENCH_BFF_ACTOR_ID",
  "X-Caller-Application": "WORKBENCH_BFF_CALLER_APPLICATION",
  "X-Tenant-Id": "WORKBENCH_BFF_TENANT_ID",
  "X-Region": "WORKBENCH_BFF_REGION",
  "X-Booking-Center-Code": "WORKBENCH_BFF_BOOKING_CENTER_CODE",
  "X-Role": "WORKBENCH_BFF_ROLE",
};

const IDEA_CALLER_CONTEXT_ENV_OVERRIDES = {
  subject: "WORKBENCH_IDEA_CALLER_SUBJECT",
  roles: "WORKBENCH_IDEA_CALLER_ROLES",
  portfolioIds: "WORKBENCH_IDEA_CALLER_PORTFOLIO_IDS",
} as const;

const DEFAULT_IDEA_CALLER_CONTEXT = {
  subject: "workbench-advisor",
  roles: "advisor",
  portfolioIds: "PB_SG_GLOBAL_BAL_001",
} as const;

export const SERVER_DERIVED_CALLER_AUTHORITY_HEADERS = [
  "X-Actor-Id",
  "X-Caller-Application",
  "X-Tenant-Id",
  "X-Region",
  "X-Booking-Center-Code",
  "X-Legal-Entity-Code",
  "X-Role",
  "X-Caller-Subject",
  "X-Caller-Roles",
  "X-Caller-Capabilities",
  "X-Caller-Portfolio-Ids",
  "X-Caller-Client-Ids",
  "X-Caller-Book-Ids",
  "X-Principal-Status",
  "X-Authorized-Advisor-Id",
  "X-Authorized-Portfolio-Id",
] as const;

export const BFF_PRINCIPAL_SESSION_CONTRACT_POSTURE = {
  schemaVersion: "lotus-platform.bff-principal-session.v1",
  certificationSchemaVersion:
    "lotus-platform.bff-principal-session-certification.v1",
  contractId: "lotus-platform-authenticated-bff-principal-session",
  contractVersion: "1.0.0",
  consumer: "lotus-workbench",
  upstreamService: "lotus-gateway",
  productSafeDenialCode: "AUTHENTICATED_PRINCIPAL_REQUIRED",
  certificationStatus: "not_certified",
  productionIdentityCertified: false,
  supportedFeaturePromoted: false,
  localDevFixtureNonCertifying: true,
} as const;

export const FORBIDDEN_BROWSER_AUTHORITY_HEADERS = [
  ...SERVER_DERIVED_CALLER_AUTHORITY_HEADERS,
  "Authorization",
  "Cookie",
  "Proxy-Authorization",
  "X-Forwarded-User",
  "X-Forwarded-Email",
  "X-Auth-Request-User",
  "X-Auth-Request-Email",
  "X-Authenticated-User",
  "X-Authenticated-Email",
  "X-Session-Id",
] as const;

export function stripBrowserSuppliedAuthorityHeaders(headers: Headers) {
  for (const headerName of FORBIDDEN_BROWSER_AUTHORITY_HEADERS) {
    headers.delete(headerName);
  }
}

const REPORTING_CALLER_CONTEXT_ENV_OVERRIDES = {
  role: "WORKBENCH_REPORTING_CALLER_ROLE",
  portfolioIds: "WORKBENCH_REPORTING_CALLER_PORTFOLIO_IDS",
} as const;

const DEFAULT_REPORTING_CALLER_CONTEXT = {
  role: "client_advisor",
  portfolioIds: "PB_SG_GLOBAL_BAL_001",
} as const;

const IDEA_AUTH_MODE_ENV = "WORKBENCH_IDEA_AUTH_MODE";
const REPORTING_AUTH_MODE_ENV = "WORKBENCH_REPORTING_AUTH_MODE";
type IdeaAuthorityResolution =
  | { status: "not_applicable" }
  | { status: "applied"; mode: "development_configured" }
  | {
      status: "rejected";
      reason:
        | "authenticated_principal_required"
        | "development_authority_not_allowed"
        | "invalid_authority_mode"
        | "unsupported_idea_route";
    };

export type ReportingAuthorityResolution =
  | { status: "not_applicable" }
  | { status: "applied"; mode: "development_configured" }
  | {
      status: "rejected";
      reason:
        | "authenticated_principal_required"
        | "development_authority_not_allowed"
        | "invalid_authority_mode"
        | "invalid_reporting_configuration"
        | "invalid_reporting_request"
        | "reporting_scope_not_entitled";
    };

function defaultCallerContextValue(
  headerName: keyof typeof DEFAULT_CALLER_CONTEXT_HEADERS
) {
  const configured = process.env[CALLER_CONTEXT_ENV_OVERRIDES[headerName]]?.trim();
  return configured || DEFAULT_CALLER_CONTEXT_HEADERS[headerName];
}

export function resolveDefaultCallerContext() {
  return {
    actorId: defaultCallerContextValue("X-Actor-Id"),
    callerApplication: defaultCallerContextValue("X-Caller-Application"),
    tenantId: defaultCallerContextValue("X-Tenant-Id"),
    region: defaultCallerContextValue("X-Region"),
    bookingCenterCode: defaultCallerContextValue("X-Booking-Center-Code"),
    role: defaultCallerContextValue("X-Role"),
  };
}

export function resolveDefaultDpmContext() {
  return {
    mandateId:
      process.env.WORKBENCH_DPM_MANDATE_ID?.trim() ||
      DEFAULT_DPM_CONTEXT.mandateId,
    modelPortfolioId:
      process.env.WORKBENCH_DPM_MODEL_PORTFOLIO_ID?.trim() ||
      DEFAULT_DPM_CONTEXT.modelPortfolioId,
    bookingCenterCode:
      process.env.WORKBENCH_DPM_BOOKING_CENTER_CODE?.trim() ||
      DEFAULT_DPM_CONTEXT.bookingCenterCode,
    sourceAsOfDate:
      process.env.WORKBENCH_DPM_SOURCE_AS_OF_DATE?.trim() ||
      DEFAULT_DPM_CONTEXT.sourceAsOfDate,
    commandCenterTenantId:
      process.env.WORKBENCH_DPM_COMMAND_CENTER_TENANT_ID?.trim() ||
      DEFAULT_DPM_CONTEXT.commandCenterTenantId,
    commandCenterPortfolioManagerId:
      process.env.WORKBENCH_DPM_COMMAND_CENTER_PORTFOLIO_MANAGER_ID?.trim() ||
      DEFAULT_DPM_CONTEXT.commandCenterPortfolioManagerId,
    commandCenterBookId:
      process.env.WORKBENCH_DPM_COMMAND_CENTER_BOOK_ID?.trim() ||
      DEFAULT_DPM_CONTEXT.commandCenterBookId,
    commandCenterAsOfDate:
      process.env.WORKBENCH_DPM_COMMAND_CENTER_AS_OF_DATE?.trim() ||
      DEFAULT_DPM_CONTEXT.commandCenterAsOfDate,
  };
}

export function applyDefaultCallerContextHeaders(headers: Headers) {
  for (const headerName of Object.keys(DEFAULT_CALLER_CONTEXT_HEADERS) as Array<
    keyof typeof DEFAULT_CALLER_CONTEXT_HEADERS
  >) {
    if (!headers.get(headerName)?.trim()) {
      headers.set(headerName, defaultCallerContextValue(headerName));
    }
  }
}

export function applyIdeaRouteCallerContextHeaders(
  headers: Headers,
  request: { method: string; upstreamPath: string },
): IdeaAuthorityResolution {
  if (!request.upstreamPath.startsWith("api/v1/ideas/")) {
    return { status: "not_applicable" };
  }

  stripBrowserSuppliedAuthorityHeaders(headers);

  const capability = resolveIdeaRouteCapability(request);
  if (!capability) {
    return { status: "rejected", reason: "unsupported_idea_route" };
  }

  const authorityMode = resolveIdeaAuthorityMode();
  if (authorityMode !== "development_configured") {
    return authorityMode === "authenticated_session"
      ? { status: "rejected", reason: "authenticated_principal_required" }
      : { status: "rejected", reason: authorityMode };
  }

  const defaultContext = resolveDefaultCallerContext();
  headers.set("X-Actor-Id", defaultContext.actorId);
  headers.set("X-Caller-Application", defaultContext.callerApplication);
  headers.set("X-Tenant-Id", defaultContext.tenantId);
  headers.set("X-Region", defaultContext.region);
  headers.set("X-Booking-Center-Code", defaultContext.bookingCenterCode);
  headers.set("X-Role", defaultContext.role);
  headers.set("X-Caller-Subject", configuredIdeaCallerSubject());
  headers.set(
    "X-Caller-Roles",
    process.env[IDEA_CALLER_CONTEXT_ENV_OVERRIDES.roles]?.trim() ||
      DEFAULT_IDEA_CALLER_CONTEXT.roles,
  );
  headers.set("X-Caller-Capabilities", capability);
  headers.set(
    "X-Caller-Portfolio-Ids",
    process.env[IDEA_CALLER_CONTEXT_ENV_OVERRIDES.portfolioIds]?.trim() ||
      DEFAULT_IDEA_CALLER_CONTEXT.portfolioIds,
  );

  return { status: "applied", mode: authorityMode };
}

function configuredIdeaCallerSubject(): string {
  return (
    process.env[IDEA_CALLER_CONTEXT_ENV_OVERRIDES.subject]?.trim() ||
    DEFAULT_IDEA_CALLER_CONTEXT.subject
  );
}

export function applyReportOrderingRouteCallerContextHeaders(
  headers: Headers,
  request: {
    method: string;
    upstreamPath: string;
    searchParams: URLSearchParams;
    bodyText?: string;
  },
): ReportingAuthorityResolution {
  if (!isReportOrderingWorkspaceRoute(request.method, request.upstreamPath)) {
    return { status: "not_applicable" };
  }

  stripBrowserSuppliedAuthorityHeaders(headers);

  const authorityMode = resolveConfiguredAuthorityMode(REPORTING_AUTH_MODE_ENV);
  if (authorityMode !== "development_configured") {
    return authorityMode === "authenticated_session"
      ? { status: "rejected", reason: "authenticated_principal_required" }
      : { status: "rejected", reason: authorityMode };
  }

  const role =
    process.env[REPORTING_CALLER_CONTEXT_ENV_OVERRIDES.role]?.trim() ||
    DEFAULT_REPORTING_CALLER_CONTEXT.role;
  if (role !== "client_advisor" && role !== "portfolio_manager") {
    return { status: "rejected", reason: "invalid_reporting_configuration" };
  }

  const portfolioIds = configuredReportingPortfolioIds();
  if (portfolioIds.length === 0) {
    return { status: "rejected", reason: "invalid_reporting_configuration" };
  }

  const requestPosture = validateReportingWorkspaceRequest(request, new Set(portfolioIds));
  if (requestPosture !== "ready") {
    return { status: "rejected", reason: requestPosture };
  }

  const context = resolveDefaultCallerContext();
  headers.set("X-Actor-Id", context.actorId);
  headers.set("X-Caller-Application", context.callerApplication);
  headers.set("X-Tenant-Id", context.tenantId);
  headers.set("X-Region", context.region);
  headers.set("X-Booking-Center-Code", context.bookingCenterCode);
  headers.set("X-Role", role);
  headers.set("X-Caller-Portfolio-Ids", portfolioIds.join(","));

  return { status: "applied", mode: authorityMode };
}

function resolveIdeaAuthorityMode():
  | "development_configured"
  | "authenticated_session"
  | "development_authority_not_allowed"
  | "invalid_authority_mode" {
  return resolveConfiguredAuthorityMode(IDEA_AUTH_MODE_ENV);
}

function isReportOrderingWorkspaceRoute(method: string, upstreamPath: string): boolean {
  return (
    (method === "GET" && upstreamPath === "api/v1/report-ordering/options") ||
    (method === "POST" && upstreamPath === "api/v1/reports/portfolio-reviews") ||
    (method === "GET" && upstreamPath === "api/v1/report-jobs")
  );
}

function configuredReportingPortfolioIds(): string[] {
  const configured =
    process.env[REPORTING_CALLER_CONTEXT_ENV_OVERRIDES.portfolioIds]?.trim() ||
    DEFAULT_REPORTING_CALLER_CONTEXT.portfolioIds;
  return [...new Set(configured.split(",").map((item) => item.trim()).filter(Boolean))];
}

function validateReportingWorkspaceRequest(
  request: {
    method: string;
    upstreamPath: string;
    searchParams: URLSearchParams;
    bodyText?: string;
  },
  entitledPortfolioIds: ReadonlySet<string>,
): "ready" | "invalid_reporting_request" | "reporting_scope_not_entitled" {
  if (request.upstreamPath === "api/v1/report-ordering/options") {
    const scopeType = request.searchParams.get("scopeType");
    const scopeId = request.searchParams.get("scopeId")?.trim();
    if (scopeType !== "portfolio" || !scopeId) {
      return "invalid_reporting_request";
    }
    return entitledPortfolioIds.has(scopeId) ? "ready" : "reporting_scope_not_entitled";
  }

  if (request.upstreamPath === "api/v1/report-jobs") {
    const portfolioId = request.searchParams.get("portfolioId")?.trim();
    const reportType = request.searchParams.get("reportType")?.trim();
    if (!portfolioId || reportType !== "portfolio_review") {
      return "invalid_reporting_request";
    }
    return entitledPortfolioIds.has(portfolioId)
      ? "ready"
      : "reporting_scope_not_entitled";
  }

  const submittedPortfolioIds = readSubmittedPortfolioIds(request.bodyText);
  if (!submittedPortfolioIds || submittedPortfolioIds.length !== 1) {
    return "invalid_reporting_request";
  }
  return submittedPortfolioIds.every((portfolioId) => entitledPortfolioIds.has(portfolioId))
    ? "ready"
    : "reporting_scope_not_entitled";
}

function readSubmittedPortfolioIds(bodyText: string | undefined): string[] | null {
  if (!bodyText) {
    return null;
  }
  try {
    const body = JSON.parse(bodyText) as Record<string, unknown>;
    const portfolioScope = body.portfolio_scope;
    if (!portfolioScope || typeof portfolioScope !== "object" || Array.isArray(portfolioScope)) {
      return null;
    }
    const portfolioIds = (portfolioScope as Record<string, unknown>).portfolio_ids;
    if (
      !Array.isArray(portfolioIds) ||
      portfolioIds.some((portfolioId) => typeof portfolioId !== "string" || !portfolioId.trim())
    ) {
      return null;
    }
    return portfolioIds.map((portfolioId) => String(portfolioId).trim());
  } catch {
    return null;
  }
}

function resolveIdeaRouteCapability({
  method,
  upstreamPath,
}: {
  method: string;
  upstreamPath: string;
}): string | undefined {
  if (
    method === "GET" &&
    upstreamPath === "api/v1/ideas/review-queues/advisor"
  ) {
    return "idea.review.queue.read";
  }

  if (
    method === "GET" &&
    /^api\/v1\/ideas\/candidates\/[^/]+$/.test(upstreamPath)
  ) {
    return "idea.candidate.detail.read";
  }

  const actionCapability = {
    "review-actions": "idea.review.record",
    feedback: "idea.feedback.record",
    "conversion-intents": "idea.conversion.intent.record",
  } as const;
  const actionMatch = upstreamPath.match(
    /^api\/v1\/ideas\/candidates\/[^/]+\/(review-actions|feedback|conversion-intents)$/,
  );
  return method === "POST" && actionMatch
    ? actionCapability[actionMatch[1] as keyof typeof actionCapability]
    : undefined;
}
