import {
  getWorkbenchPerformanceWorkspaceSummary,
  getWorkbenchApiErrorStatus,
  isWorkbenchPermissionBlockedError,
} from "@/features/workbench/api";
import { resolveGatewayBaseUrl } from "@/features/platform-runtime/service-addressing";
import { AppPageShell } from "@/design-system";
import {
  buildReviewContextHref,
  parseReviewContext,
} from "@/shell/review-context";
import ReviewContextRecovery from "@/shell/review-context-recovery";
import {
  normalizePerformanceWorkspaceMode,
} from "./performance-workspace-modes";
import PerformanceWorkspaceEntry from "./components/performance-workspace-entry";
import type { PerformanceWorkspaceLoadIssue } from "./components/performance-workspace-types";
import { isPerformanceSummarySourceCurrent } from "./performance-source-identity";

type LookupEnvelope = {
  items?: Array<{ id: string; label: string }>;
};

const DEFAULT_BENCHMARK_BY_PORTFOLIO: Record<string, string> = {
  PB_SG_GLOBAL_BAL_001: "BMK_PB_GLOBAL_BALANCED_60_40",
  DEMO_ADV_USD_001: "BMK_GLOBAL_BALANCED_60_40",
};
async function getPortfolioOptions(limit = 8): Promise<Array<{ id: string; label: string }>> {
  try {
    const response = await fetch(`${resolveGatewayBaseUrl()}/api/v1/lookups/portfolios?limit=${limit}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as LookupEnvelope;
    return payload.items ?? [];
  } catch {
    return [];
  }
}

export default async function PerformanceAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | readonly string[] | undefined>>;
}) {
  const resolvedSearch = await searchParams;
  const reviewContextResult = parseReviewContext(resolvedSearch);
  if (reviewContextResult.status === "invalid") {
    return (
      <AppPageShell pageKey="performance" className="performance-page portfolio-page">
        <ReviewContextRecovery
          body="The performance review address contains repeated or unsupported context. No portfolio analytics were requested."
          href="/performance"
          actionLabel="Reset review context"
        />
      </AppPageShell>
    );
  }

  const requestedPortfolioId = reviewContextResult.context.portfolioId;
  if (!requestedPortfolioId) {
    return (
      <AppPageShell pageKey="performance" className="performance-page portfolio-page">
        <ReviewContextRecovery
          body="Select a source-confirmed portfolio from My book before opening Performance. No default portfolio was substituted."
          href="/book"
          actionLabel="Open My book"
        />
      </AppPageShell>
    );
  }

  const portfolios = await getPortfolioOptions();
  const selectedPortfolioId = portfolios.some(
    (portfolio) => portfolio.id === requestedPortfolioId,
  )
    ? requestedPortfolioId
    : null;
  if (!selectedPortfolioId) {
    return (
      <AppPageShell pageKey="performance" className="performance-page portfolio-page">
        <ReviewContextRecovery
          body="The selected portfolio is not available in the source-confirmed portfolio catalogue. No alternative portfolio was substituted."
          href="/book"
          actionLabel="Choose another portfolio"
        />
      </AppPageShell>
    );
  }

  const requestedReportStartDate = getSearchParamValue(resolvedSearch, "reportStartDate");
  const requestedReportEndDate = getSearchParamValue(resolvedSearch, "reportEndDate");
  const hasRequestedDateWindow = Boolean(requestedReportStartDate || requestedReportEndDate);
  const period =
    reviewContextResult.context.period ||
    (hasRequestedDateWindow ? "EXPLICIT" : "YTD");
  const detailBasis = getSearchParamValue(resolvedSearch, "detailBasis") || "NET";
  const legacyDetailDimension = getSearchParamValue(resolvedSearch, "detailDimension");
  const contributionDimension =
    getSearchParamValue(resolvedSearch, "contributionDimension") ||
    legacyDetailDimension ||
    "asset_class";
  const attributionDimension =
    getSearchParamValue(resolvedSearch, "attributionDimension") ||
    legacyDetailDimension ||
    "asset_class";
  const chartFrequency = getSearchParamValue(resolvedSearch, "chartFrequency") || "monthly";
  const requestedMode = getSearchParamValue(resolvedSearch, "mode");
  const initialMode = normalizePerformanceWorkspaceMode(requestedMode) ?? "summary";
  const benchmark =
    getSearchParamValue(resolvedSearch, "benchmark") ||
    DEFAULT_BENCHMARK_BY_PORTFOLIO[selectedPortfolioId];
  const reportStartDate = requestedReportStartDate;
  const reportEndDate = requestedReportEndDate;
  const workspaceRequest = {
    period,
    chartFrequency,
    contributionDimension,
    attributionDimension,
    detailBasis,
    benchmark,
    reportStartDate,
    reportEndDate,
  };

  let workspaceSummary = null;
  let workspaceDetails = null;
  let workspaceLoadIssue: PerformanceWorkspaceLoadIssue | null = null;
  try {
    workspaceSummary = await getWorkbenchPerformanceWorkspaceSummary(
      selectedPortfolioId,
      workspaceRequest
    );
    workspaceDetails = null;
  } catch (error) {
    workspaceSummary = null;
    workspaceDetails = null;
    workspaceLoadIssue = {
      state: isWorkbenchPermissionBlockedError(error)
        ? "permission_blocked"
        : "unavailable",
      status: getWorkbenchApiErrorStatus(error) ?? undefined,
    };
  }

  if (
    workspaceSummary &&
    !isPerformanceSummarySourceCurrent(workspaceSummary, {
      portfolioId: selectedPortfolioId,
      asOfDate: reviewContextResult.context.asOfDate,
      reportingCurrency: reviewContextResult.context.reportingCurrency,
    })
  ) {
    return (
      <AppPageShell pageKey="performance" className="performance-page portfolio-page">
        <ReviewContextRecovery
          body="The selected portfolio, valuation date, or reporting currency is not confirmed by the performance source. No analytical detail was requested."
          href={buildReviewContextHref("/performance", {
            portfolioId: selectedPortfolioId,
            asOfDate: workspaceSummary.as_of_date,
            reportingCurrency: workspaceSummary.portfolio.base_currency,
          })}
          actionLabel="Use available performance context"
        />
      </AppPageShell>
    );
  }

  return (
    <AppPageShell pageKey="performance" className="performance-page portfolio-page">
      <PerformanceWorkspaceEntry
        initialSummary={workspaceSummary}
        initialDetails={workspaceDetails}
        initialLoadIssue={workspaceLoadIssue}
        initialPortfolioId={selectedPortfolioId}
        initialPeriod={period}
        initialDetailBasis={detailBasis}
        initialContributionDimension={contributionDimension}
        initialAttributionDimension={attributionDimension}
        initialChartFrequency={chartFrequency}
        initialMode={initialMode}
        initialBenchmark={benchmark}
        initialAsOfDate={reviewContextResult.context.asOfDate}
        initialReportingCurrency={reviewContextResult.context.reportingCurrency}
      />
    </AppPageShell>
  );
}

function getSearchParamValue(
  searchParams: Readonly<Record<string, string | readonly string[] | undefined>>,
  key: string,
): string | undefined {
  const value = searchParams[key];
  return typeof value === "string" ? value.trim() || undefined : undefined;
}
