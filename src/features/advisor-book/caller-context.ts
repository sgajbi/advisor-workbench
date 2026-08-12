import { resolveConfiguredAuthorityMode } from "@/features/workbench/authority-mode";
import {
  resolveAdvisorBookDevelopmentContext,
  stripBrowserSuppliedAuthorityHeaders,
} from "@/features/workbench/caller-context";

const ADVISOR_BOOK_ROUTE = "api/v1/advisor-book/portfolios";
const ADVISOR_BOOK_AUTH_MODE_ENV = "WORKBENCH_ADVISOR_BOOK_AUTH_MODE";
const ADVISOR_BOOK_READ_CAPABILITY = "advisor.book.read";

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

  stripBrowserSuppliedAuthorityHeaders(headers);

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

