import PerformanceWorkspaceView from "./components/performance-workspace-view";
import { getWorkbenchPerformanceWorkspace } from "@/features/workbench/api";

const BFF_BASE_URL = process.env.BFF_BASE_URL ?? "http://localhost:8100";

type LookupEnvelope = {
  items?: Array<{ id: string; label: string }>;
};

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
    chartFrequency?: string;
    benchmark?: string;
  }>;
}) {
  const resolvedSearch = await searchParams;
  const portfolios = await getPortfolioOptions();
  const selectedPortfolioId = resolvedSearch.portfolioId?.trim() || portfolios[0]?.id || null;
  const period = resolvedSearch.period?.trim() || "YTD";
  const detailBasis = resolvedSearch.detailBasis?.trim() || "NET";
  const detailDimension = resolvedSearch.detailDimension?.trim() || "asset_class";
  const chartFrequency = resolvedSearch.chartFrequency?.trim() || "monthly";
  const benchmark = resolvedSearch.benchmark?.trim() || undefined;

  let workspace = null;
  if (selectedPortfolioId) {
    try {
      workspace = await getWorkbenchPerformanceWorkspace(selectedPortfolioId, {
        period,
        chartFrequency,
        detailDimension,
        detailBasis,
        benchmark,
      });
    } catch {
      workspace = null;
    }
  }

  return (
    <main className="page-container">
      <PerformanceWorkspaceView
        portfolios={portfolios}
        selectedPortfolioId={selectedPortfolioId}
        workspace={workspace}
        period={period}
        detailBasis={detailBasis}
        detailDimension={detailDimension}
        chartFrequency={chartFrequency}
        benchmark={benchmark}
      />
    </main>
  );
}
