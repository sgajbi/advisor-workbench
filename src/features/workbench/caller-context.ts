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

const IDEA_AUTHORITY_HEADERS = [
  "X-Caller-Subject",
  "X-Caller-Roles",
  "X-Caller-Capabilities",
  "X-Caller-Portfolio-Ids",
] as const;

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
) {
  if (!request.upstreamPath.startsWith("api/v1/ideas/")) {
    return;
  }

  for (const headerName of IDEA_AUTHORITY_HEADERS) {
    headers.delete(headerName);
  }

  const capability = resolveIdeaRouteCapability(request);
  if (!capability) {
    return;
  }

  headers.set(
    "X-Caller-Subject",
    process.env[IDEA_CALLER_CONTEXT_ENV_OVERRIDES.subject]?.trim() ||
      DEFAULT_IDEA_CALLER_CONTEXT.subject,
  );
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
