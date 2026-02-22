import { getWorkbenchOverview } from "@/features/workbench/api";
import OverviewCards from "@/features/workbench/components/overview-cards";
import PartialFailureBanner from "@/features/workbench/components/partial-failure-banner";
import PerformanceSnapshot from "@/features/workbench/components/performance-snapshot";
import PositionsGrid from "@/features/workbench/components/positions-grid";
import RebalanceStatus from "@/features/workbench/components/rebalance-status";

export default async function WorkbenchPage({
  params,
}: {
  params: Promise<{ portfolioId: string }>;
}) {
  const { portfolioId } = await params;
  const data = await getWorkbenchOverview(portfolioId);

  return (
    <main>
      <h1>Advisor Workbench: {data.portfolio.portfolio_id}</h1>
      <p>As of: {data.as_of_date}</p>

      <PartialFailureBanner items={data.partial_failures} />

      <OverviewCards
        marketValueBase={data.overview.market_value_base}
        cashWeightPct={data.overview.cash_weight_pct}
        positionCount={data.overview.position_count}
        baseCurrency={data.portfolio.base_currency}
      />

      <PositionsGrid count={data.overview.position_count} />

      <PerformanceSnapshot
        period={data.performance_snapshot?.period ?? "YTD"}
        returnPct={data.performance_snapshot?.return_pct ?? null}
        benchmarkReturnPct={data.performance_snapshot?.benchmark_return_pct ?? null}
      />

      <RebalanceStatus
        status={data.rebalance_snapshot?.status ?? "UNKNOWN"}
        lastRunId={data.rebalance_snapshot?.last_rebalance_run_id ?? null}
      />
    </main>
  );
}
