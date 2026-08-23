import {
  getWorkbenchPerformanceWorkspaceSummary,
  getWorkbenchApiErrorStatus,
  isWorkbenchPermissionBlockedError,
} from "@/features/workbench/api";
import {
  AppPageShell,
  buildWorkbenchSourceContextNotice,
} from "@/design-system";
import { getPortfolioWorkspaceShell } from "@/apps/portfolio/api";
import {
  parseReviewContext,
} from "@/shell/review-context";
import ReviewContextRecovery from "@/shell/review-context-recovery";
import {
  normalizePerformanceWorkspaceMode,
} from "./performance-workspace-modes";
import PerformanceWorkspaceEntry from "./components/performance-workspace-entry";
import type { PerformanceWorkspaceLoadIssue } from "./components/performance-workspace-types";
import { isPerformanceSummarySourceCurrent } from "./performance-source-identity";
import { buildPerformanceReviewContextStrip } from "./performance-review-context-strip-view-model";

const DEFAULT_BENCHMARK_BY_PORTFOLIO: Record<string, string> = {
  PB_SG_GLOBAL_BAL_001: "BMK_PB_GLOBAL_BALANCED_60_40",
  DEMO_ADV_USD_001: "BMK_GLOBAL_BALANCED_60_40",
};
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

  // The Performance summary is the authoritative portfolio read. A bounded
  // lookup page must not reject a valid portfolio from a later Advisor Book page.
  const selectedPortfolioId = requestedPortfolioId;

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

  const [workspaceSummaryResult, portfolioContextResult] = await Promise.allSettled([
    getWorkbenchPerformanceWorkspaceSummary(selectedPortfolioId, workspaceRequest),
    getPortfolioWorkspaceShell(selectedPortfolioId),
  ]);
  let workspaceSummary = null;
  let workspaceDetails = null;
  let workspaceLoadIssue: PerformanceWorkspaceLoadIssue | null = null;
  if (workspaceSummaryResult.status === "fulfilled") {
    workspaceSummary = workspaceSummaryResult.value;
  } else {
    const error = workspaceSummaryResult.reason;
    workspaceSummary = null;
    workspaceDetails = null;
    workspaceLoadIssue = {
      state: isWorkbenchPermissionBlockedError(error)
        ? "permission_blocked"
        : "unavailable",
      status: getWorkbenchApiErrorStatus(error) ?? undefined,
    };
  }
  const portfolioContext =
    portfolioContextResult.status === "fulfilled" &&
    portfolioContextResult.value?.portfolio.portfolio_id === selectedPortfolioId
      ? portfolioContextResult.value
      : null;
  const sourceContextNotice = buildWorkbenchSourceContextNotice({
    title: "Performance source context",
    subject: "Performance",
    requestedAsOfDate: reviewContextResult.context.asOfDate,
    requestedReportingCurrency: reviewContextResult.context.reportingCurrency,
    sourceAsOfDate: workspaceSummary?.as_of_date,
    sourceCurrency: workspaceSummary?.portfolio.base_currency,
  });

  if (
    workspaceSummary &&
    !isPerformanceSummarySourceCurrent(workspaceSummary, {
      portfolioId: selectedPortfolioId,
      period,
      reportStartDate,
      reportEndDate,
    })
  ) {
    return (
      <AppPageShell
        pageKey="performance"
        className="performance-page portfolio-page"
        reviewContext={buildPerformanceReviewContextStrip({
          workspace: workspaceSummary,
          portfolioContext,
        })}
      >
        <ReviewContextRecovery
          body="The selected portfolio or performance period is not confirmed by the source response. No analytical detail was requested."
          href="/book"
          actionLabel="Choose a portfolio from My book"
        />
      </AppPageShell>
    );
  }

  return (
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
        initialContextNotice={sourceContextNotice}
        initialPortfolioContext={portfolioContext}
      />
  );
}

function getSearchParamValue(
  searchParams: Readonly<Record<string, string | readonly string[] | undefined>>,
  key: string,
): string | undefined {
  const value = searchParams[key];
  return typeof value === "string" ? value.trim() || undefined : undefined;
}
