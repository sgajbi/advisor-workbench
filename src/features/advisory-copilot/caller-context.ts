import { resolveConfiguredAuthorityMode } from "@/features/workbench/authority-mode";
import {
  resolveDefaultCallerContext,
  stripBrowserSuppliedAuthorityHeaders,
} from "@/features/workbench/caller-context";

const ADVISORY_COPILOT_AUTH_MODE_ENV = "WORKBENCH_ADVISORY_COPILOT_AUTH_MODE";
const REVIEW_CAPABILITY = "advisory.copilot.review";
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const DEFAULT_DEVELOPMENT_REVIEW_AUTHORITY = {
  actorId: "desk_head_sg_001",
  tenantId: "tenant-sg-001",
  legalEntityCode: "PB_SG",
  role: "ADVISORY_SUPERVISOR",
  principalStatus: "ACTIVE",
} as const;

const AUTHORITY_BODY_FIELDS = new Set([
  "actor_id",
  "authorized_portfolio_id",
  "authorized_proposal_id",
  "capabilities",
  "legal_entity_code",
  "principal_status",
  "role",
  "tenant_id",
]);

type AdvisoryCopilotAuthorityRejection =
  | "authenticated_principal_required"
  | "development_authority_not_allowed"
  | "invalid_authority_mode"
  | "invalid_advisory_copilot_configuration"
  | "invalid_advisory_copilot_request";

export type AdvisoryCopilotAuthorityResolution =
  | { status: "not_applicable" }
  | { status: "applied"; mode: "development_configured" }
  | { status: "rejected"; reason: AdvisoryCopilotAuthorityRejection };

export function applyAdvisoryCopilotCallerContextHeaders(
  headers: Headers,
  request: {
    method: string;
    upstreamPath: string;
    bodyText?: string;
  },
): AdvisoryCopilotAuthorityResolution {
  if (!isAdvisoryCopilotReviewRoute(request.method, request.upstreamPath)) {
    return { status: "not_applicable" };
  }

  stripBrowserSuppliedAuthorityHeaders(headers);
  if (request.bodyText && containsAuthorityBodyField(request.bodyText)) {
    return { status: "rejected", reason: "invalid_advisory_copilot_request" };
  }

  const authorityMode = resolveConfiguredAuthorityMode(ADVISORY_COPILOT_AUTH_MODE_ENV);
  if (authorityMode !== "development_configured") {
    return authorityMode === "authenticated_session"
      ? { status: "rejected", reason: "authenticated_principal_required" }
      : { status: "rejected", reason: authorityMode };
  }

  const context = resolveAdvisoryCopilotDevelopmentContext();
  if (!context) {
    return {
      status: "rejected",
      reason: "invalid_advisory_copilot_configuration",
    };
  }

  headers.set("X-Actor-Id", context.actorId);
  headers.set("X-Caller-Application", context.callerApplication);
  headers.set("X-Tenant-Id", context.tenantId);
  headers.set("X-Region", context.region);
  headers.set("X-Booking-Center-Code", context.bookingCenterCode);
  headers.set("X-Legal-Entity-Code", context.legalEntityCode);
  headers.set("X-Role", context.role);
  headers.set("X-Caller-Capabilities", REVIEW_CAPABILITY);
  headers.set("X-Principal-Status", context.principalStatus);

  return { status: "applied", mode: authorityMode };
}

function isAdvisoryCopilotReviewRoute(method: string, upstreamPath: string): boolean {
  return (
    method === "POST" &&
    /^api\/v1\/advisory-copilot\/actions\/[^/]+\/reviews$/.test(upstreamPath)
  );
}

function containsAuthorityBodyField(bodyText: string): boolean {
  try {
    return hasAuthorityField(JSON.parse(bodyText));
  } catch {
    return true;
  }
}

function hasAuthorityField(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some(hasAuthorityField);
  }
  return Object.entries(value).some(
    ([key, nestedValue]) =>
      AUTHORITY_BODY_FIELDS.has(key.toLowerCase()) || hasAuthorityField(nestedValue),
  );
}

function resolveAdvisoryCopilotDevelopmentContext() {
  const defaults = resolveDefaultCallerContext();
  const context = {
    actorId:
      process.env.WORKBENCH_ADVISORY_COPILOT_ACTOR_ID?.trim() ||
      DEFAULT_DEVELOPMENT_REVIEW_AUTHORITY.actorId,
    callerApplication: defaults.callerApplication,
    tenantId:
      process.env.WORKBENCH_ADVISORY_COPILOT_TENANT_ID?.trim() ||
      DEFAULT_DEVELOPMENT_REVIEW_AUTHORITY.tenantId,
    region: defaults.region,
    bookingCenterCode: defaults.bookingCenterCode,
    legalEntityCode:
      process.env.WORKBENCH_ADVISORY_COPILOT_LEGAL_ENTITY_CODE?.trim() ||
      DEFAULT_DEVELOPMENT_REVIEW_AUTHORITY.legalEntityCode,
    role:
      process.env.WORKBENCH_ADVISORY_COPILOT_ROLE?.trim() ||
      DEFAULT_DEVELOPMENT_REVIEW_AUTHORITY.role,
    principalStatus:
      process.env.WORKBENCH_ADVISORY_COPILOT_PRINCIPAL_STATUS?.trim().toUpperCase() ||
      DEFAULT_DEVELOPMENT_REVIEW_AUTHORITY.principalStatus,
  };

  if (
    Object.values(context).some((value) => !IDENTIFIER_PATTERN.test(value)) ||
    context.principalStatus !== "ACTIVE"
  ) {
    return null;
  }
  return {
    ...context,
    legalEntityCode: context.legalEntityCode.toUpperCase(),
    role: context.role.toUpperCase(),
  };
}
