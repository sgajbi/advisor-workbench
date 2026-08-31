import type { PortfolioTimeWindow } from "./view-model";

export type PortfolioPerformanceWindowRequest = Readonly<{
  timeWindow: PortfolioTimeWindow;
  reportStartDate: string;
  reportEndDate: string;
  usesCustomDateRange?: boolean;
}>;

export type PortfolioPerformanceWindowEvidence = Readonly<{
  period: string;
  report_start_date?: string | null;
  report_end_date?: string | null;
}>;

function usesExplicitPerformanceWindow(request: PortfolioPerformanceWindowRequest): boolean {
  return (
    Boolean(request.usesCustomDateRange) ||
    request.timeWindow === "7D" ||
    request.timeWindow === "30D"
  );
}

export function buildPortfolioPerformanceWindowQuery(
  request: PortfolioPerformanceWindowRequest
): URLSearchParams {
  const query = new URLSearchParams();
  const usesExplicitWindow = usesExplicitPerformanceWindow(request);

  query.set("period", usesExplicitWindow ? "EXPLICIT" : request.timeWindow);
  query.set("report_end_date", request.reportEndDate);

  if (usesExplicitWindow) {
    query.set("report_start_date", request.reportStartDate);
  }

  return query;
}

/**
 * Verifies the exact performance-window vocabulary sent to the source. The
 * Workbench presets 7D and 30D are represented by an EXPLICIT source request,
 * so those responses are identified by their echoed start and end dates.
 */
export function isPortfolioPerformanceWindowCurrent(
  evidence: PortfolioPerformanceWindowEvidence,
  request: PortfolioPerformanceWindowRequest
): boolean {
  const query = buildPortfolioPerformanceWindowQuery(request);
  const requestedPeriod = query.get("period");

  if (evidence.period !== requestedPeriod) {
    return false;
  }

  if (evidence.report_end_date !== query.get("report_end_date")) {
    return false;
  }

  if (requestedPeriod !== "EXPLICIT") {
    return true;
  }

  return evidence.report_start_date === query.get("report_start_date");
}
