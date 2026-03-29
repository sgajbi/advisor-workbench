import {
  getWorkbenchPerformanceWorkspaceDetails,
  getWorkbenchPerformanceWorkspaceSummary,
} from "@/features/workbench/api";
import { WorkstationPage } from "@/design-system";
import PerformanceWorkspaceEntry from "./components/performance-workspace-entry";

const BFF_BASE_URL = process.env.BFF_BASE_URL ?? "http://localhost:8100";

type LookupEnvelope = {
  items?: Array<{ id: string; label: string }>;
};

const DEFAULT_PORTFOLIO_ID = "DEMO_ADV_USD_001";
const DEFAULT_BENCHMARK_ID = "BMK_GLOBAL_BALANCED_60_40";

async function getPortfolioOptions(limit = 8): Promise<Array<{ id: string; label: string }>> {
  try {
    const response = await fetch(`${BFF_BASE_URL}/api/v1/lookups/portfolios?limit=${limit}`, {
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
    benchmark?: string;
    reportStartDate?: string;
    reportEndDate?: string;
  }>;
}) {
  const resolvedSearch = await searchParams;
  const portfolios = await getPortfolioOptions();
  const selectedPortfolioId =
    resolvedSearch.portfolioId?.trim() ||
    portfolios.find((portfolio) => portfolio.id === DEFAULT_PORTFOLIO_ID)?.id ||
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
  const benchmark =
    resolvedSearch.benchmark?.trim() ||
    (selectedPortfolioId === DEFAULT_PORTFOLIO_ID ? DEFAULT_BENCHMARK_ID : undefined);
  const reportStartDate = resolvedSearch.reportStartDate?.trim() || undefined;
  const reportEndDate = resolvedSearch.reportEndDate?.trim() || undefined;

  let workspaceSummary = null;
  let workspaceDetails = null;
  if (selectedPortfolioId) {
    try {
      [workspaceSummary, workspaceDetails] = await Promise.all([
        getWorkbenchPerformanceWorkspaceSummary(selectedPortfolioId, {
          period,
          chartFrequency,
          contributionDimension,
          attributionDimension,
          detailBasis,
          benchmark,
          reportStartDate,
          reportEndDate,
        }),
        getWorkbenchPerformanceWorkspaceDetails(selectedPortfolioId, {
          period,
          chartFrequency,
          contributionDimension,
          attributionDimension,
          detailBasis,
          benchmark,
          reportStartDate,
          reportEndDate,
        }),
      ]);
    } catch {
      workspaceSummary = null;
      workspaceDetails = null;
    }
  }

  return (
    <WorkstationPage className="performance-page">
      <PerformanceWorkspaceEntry
        initialSummary={workspaceSummary}
        initialDetails={workspaceDetails}
        initialPortfolioId={selectedPortfolioId}
        initialPeriod={period}
        initialDetailBasis={detailBasis}
        initialContributionDimension={contributionDimension}
        initialAttributionDimension={attributionDimension}
        initialChartFrequency={chartFrequency}
        initialBenchmark={benchmark}
      />
    </WorkstationPage>
  );
}
