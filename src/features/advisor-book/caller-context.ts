import { resolveConfiguredAuthorityMode } from "@/features/workbench/authority-mode";
import {
  resolveDefaultCallerContext,
  SERVER_DERIVED_CALLER_AUTHORITY_HEADERS,
} from "@/features/workbench/caller-context";

const ADVISOR_BOOK_ROUTE = "api/v1/advisor-book/portfolios";
const ADVISOR_BOOK_AUTH_MODE_ENV = "WORKBENCH_ADVISOR_BOOK_AUTH_MODE";
const ADVISOR_BOOK_READ_CAPABILITY = "advisor.book.read";
const SUPPORTED_ADVISOR_BOOK_ROLES = new Set([
  "ADVISOR",
  "RELATIONSHIP_MANAGER",
  "PORTFOLIO_MANAGER",
]);

export type AdvisorBookAuthorityResolution =
  | { status: "not_applicable" }
  | { status: "applied"; mode: "development_configured" }
  | {
      status: "rejected";
      reason:
        | "authenticated_principal_required"
        | "development_authority_not_allowed"
        | "invalid_authority_mode"
        | "invalid_advisor_book_configuration";
    };

export function applyAdvisorBookCallerContextHeaders(
  headers: Headers,
  request: { method: string; upstreamPath: string },
): AdvisorBookAuthorityResolution {
  if (request.method !== "GET" || request.upstreamPath !== ADVISOR_BOOK_ROUTE) {
    return { status: "not_applicable" };
  }

  for (const headerName of SERVER_DERIVED_CALLER_AUTHORITY_HEADERS) {
    headers.delete(headerName);
  }

  const authorityMode = resolveConfiguredAuthorityMode(ADVISOR_BOOK_AUTH_MODE_ENV);
  if (authorityMode !== "development_configured") {
    return authorityMode === "authenticated_session"
      ? { status: "rejected", reason: "authenticated_principal_required" }
      : { status: "rejected", reason: authorityMode };
  }

  const context = resolveAdvisorBookDevelopmentContext();
  if (!context) {
    return { status: "rejected", reason: "invalid_advisor_book_configuration" };
  }

  headers.set("X-Actor-Id", context.actorId);
  headers.set("X-Caller-Application", context.callerApplication);
  headers.set("X-Tenant-Id", context.tenantId);
  headers.set("X-Region", context.region);
  headers.set("X-Booking-Center-Code", context.bookingCenterCode);
  headers.set("X-Role", context.role);
  headers.set("X-Caller-Capabilities", ADVISOR_BOOK_READ_CAPABILITY);

  return { status: "applied", mode: authorityMode };
}

function resolveAdvisorBookDevelopmentContext() {
  const defaults = resolveDefaultCallerContext();
  const context = {
    actorId: process.env.WORKBENCH_ADVISOR_BOOK_ACTOR_ID?.trim() || "PM_SG_001",
    callerApplication: defaults.callerApplication,
    tenantId: process.env.WORKBENCH_ADVISOR_BOOK_TENANT_ID?.trim() || defaults.tenantId,
    region: process.env.WORKBENCH_ADVISOR_BOOK_REGION?.trim() || defaults.region,
    bookingCenterCode:
      process.env.WORKBENCH_ADVISOR_BOOK_BOOKING_CENTER_CODE?.trim() || "Singapore",
    role: process.env.WORKBENCH_ADVISOR_BOOK_ROLE?.trim() || "ADVISOR",
  };

  if (
    Object.values(context).some((value) => !value) ||
    !SUPPORTED_ADVISOR_BOOK_ROLES.has(context.role)
  ) {
    return null;
  }

  return context;
}
