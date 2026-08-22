import { isBusinessDateValue } from "@/design-system/utils/financial-formatters";

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
        | "date_not_configured"
        | "invalid_development_configuration";
    };

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

  return isBusinessDateValue(configured)
    ? {
        status: "confirmed",
        value: configured,
        source: "development_configured",
      }
    : {
        status: "not_confirmed",
        reason: "invalid_development_configuration",
      };
}
