import { getWorkbenchOverview } from "@/features/workbench/api";
import OverviewCards from "@/features/workbench/components/overview-cards";
import PartialFailureBanner from "@/features/workbench/components/partial-failure-banner";
import PerformanceSnapshot from "@/features/workbench/components/performance-snapshot";
import PositionsGrid from "@/features/workbench/components/positions-grid";
import RebalanceStatus from "@/features/workbench/components/rebalance-status";
import Link from "next/link";

export default async function WorkbenchPage({
  params,
}: {
  params: Promise<{ portfolioId: string }>;
}) {
  const { portfolioId } = await params;

  let data;
  try {
    data = await getWorkbenchOverview(portfolioId);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return (
      <main className="page-container">
        <section className="page-header">
          <h1 className="page-title">Advisor Workbench</h1>
          <p className="page-subtitle">Decision context is temporarily unavailable for {portfolioId}.</p>
        </section>
        <section className="section-card">
          <p className="error-text">
            Unable to load workbench overview for {portfolioId}. {detail}
          </p>
          <div className="toolbar">
            <Link href="/proposals" className="nav-link">
              Open Proposal Workspace
            </Link>
            <Link href="/pas/intake" className="nav-link">
              Open Portfolio Intake
            </Link>
            <Link href="/suite" className="nav-link">
              Return To Command Center
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-container">
      <section className="page-header">
        <h1 className="page-title">Advisor Workbench: {data.portfolio.portfolio_id}</h1>
        <p className="page-subtitle">As of: {data.as_of_date}</p>
      </section>

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
