import {
  getWorkbenchPerformanceWorkspaceSummary,
  getWorkbenchApiErrorStatus,
  isWorkbenchPermissionBlockedError,
} from "@/features/workbench/api";
import { resolveGatewayBaseUrl } from "@/features/platform-runtime/service-addressing";
import { AppPageShell } from "@/design-system";
import {
  normalizePerformanceWorkspaceMode,
} from "./performance-workspace-modes";
import PerformanceWorkspaceEntry from "./components/performance-workspace-entry";
import type { PerformanceWorkspaceLoadIssue } from "./components/performance-workspace-types";

type LookupEnvelope = {
  items?: Array<{ id: string; label: string }>;
};

const PREFERRED_DEFAULT_PORTFOLIO_IDS = ["PB_SG_GLOBAL_BAL_001", "DEMO_ADV_USD_001"] as const;
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
  searchParams: Promise<{
    portfolioId?: string;
    period?: string;
    detailBasis?: string;
    detailDimension?: string;
    contributionDimension?: string;
    attributionDimension?: string;
    chartFrequency?: string;
    mode?: string;
    benchmark?: string;
    reportStartDate?: string;
    reportEndDate?: string;
  }>;
}) {
  const resolvedSearch = await searchParams;
  const portfolios = await getPortfolioOptions();
  const defaultPortfolioId = PREFERRED_DEFAULT_PORTFOLIO_IDS.find((candidate) =>
    portfolios.some((portfolio) => portfolio.id === candidate)
  );
  const selectedPortfolioId =
    resolvedSearch.portfolioId?.trim() ||
    defaultPortfolioId ||
    portfolios[0]?.id ||
    null;
  const period = resolvedSearch.period?.trim() || "YTD";
  const detailBasis = resolvedSearch.detailBasis?.trim() || "NET";
  const legacyDetailDimension = resolvedSearch.detailDimension?.trim();
  const contributionDimension =
    resolvedSearch.contributionDimension?.trim() || legacyDetailDimension || "asset_class";
  const attributionDimension =
    resolvedSearch.attributionDimension?.trim() || legacyDetailDimension || "asset_class";
  const chartFrequency = resolvedSearch.chartFrequency?.trim() || "monthly";
  const requestedMode = resolvedSearch.mode?.trim();
  const initialMode = normalizePerformanceWorkspaceMode(requestedMode) ?? "summary";
  const benchmark =
    resolvedSearch.benchmark?.trim() ||
    (selectedPortfolioId ? DEFAULT_BENCHMARK_BY_PORTFOLIO[selectedPortfolioId] : undefined);
  const reportStartDate = resolvedSearch.reportStartDate?.trim() || undefined;
  const reportEndDate = resolvedSearch.reportEndDate?.trim() || undefined;
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
  if (selectedPortfolioId) {
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
  }

  return (
    <AppPageShell pageKey="performance" className="performance-page">
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
      />
    </AppPageShell>
  );
}
