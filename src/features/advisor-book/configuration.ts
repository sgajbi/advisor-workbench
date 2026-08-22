import { isBusinessDateValue } from "@/design-system/utils/financial-formatters";
import { isDevelopmentAuthorityEnvironment } from "@/features/workbench/authority-mode";

export type AdvisorBookAsOfDateResolution =
  | {
      status: "confirmed";
      value: string;
      source: "requested" | "development_configured";
    }
  | {
      status: "not_confirmed";
      reason:
        | "invalid_requested_date"
        | "ambiguous_requested_date"
        | "date_not_configured"
        | "invalid_development_configuration"
        | "development_date_not_allowed";
    };

type SearchParamsReader = Pick<URLSearchParams, "getAll">;

function resolveWorkbenchBuildEnvironment(): string | undefined {
  return (
    process.env.WORKBENCH_BUILD_ENVIRONMENT ||
    (process.env.NODE_ENV === "test" ? "test" : undefined)
  );
}

export function resolveAdvisorBookAsOfDateFromSearchParams(
  searchParams: SearchParamsReader,
): AdvisorBookAsOfDateResolution {
  const requestedDates = searchParams.getAll("asOfDate");
  if (requestedDates.length > 1) {
    return { status: "not_confirmed", reason: "ambiguous_requested_date" };
  }

  return resolveAdvisorBookAsOfDate(requestedDates[0] ?? null);
}

export function resolveAdvisorBookAsOfDate(
  requested?: string | null,
): AdvisorBookAsOfDateResolution {
  if (requested !== null && requested !== undefined) {
    const candidate = requested.trim();
    return isBusinessDateValue(candidate)
      ? { status: "confirmed", value: candidate, source: "requested" }
      : { status: "not_confirmed", reason: "invalid_requested_date" };
  }

  const configured =
    process.env.NEXT_PUBLIC_WORKBENCH_ADVISOR_BOOK_AS_OF_DATE?.trim();
  if (!configured) {
    return { status: "not_confirmed", reason: "date_not_configured" };
  }

  if (!isBusinessDateValue(configured)) {
    return {
      status: "not_confirmed",
      reason: "invalid_development_configuration",
    };
  }

  if (
    !isDevelopmentAuthorityEnvironment(
      resolveWorkbenchBuildEnvironment(),
    )
  ) {
    return {
      status: "not_confirmed",
      reason: "development_date_not_allowed",
    };
  }

  return {
    status: "confirmed",
    value: configured,
    source: "development_configured",
  };
}
