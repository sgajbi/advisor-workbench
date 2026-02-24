import { getPortfolio360 } from "@/features/workbench/api";
import OverviewCards from "@/features/workbench/components/overview-cards";
import PartialFailureBanner from "@/features/workbench/components/partial-failure-banner";
import PerformanceSnapshot from "@/features/workbench/components/performance-snapshot";
import PositionsGrid from "@/features/workbench/components/positions-grid";
import RebalanceStatus from "@/features/workbench/components/rebalance-status";
import SandboxControls from "@/features/workbench/components/sandbox-controls";
import Link from "next/link";

export default async function WorkbenchPage({
  params,
  searchParams,
}: {
  params: Promise<{ portfolioId: string }>;
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { portfolioId } = await params;
  const resolvedSearch = await searchParams;
  const sessionId = resolvedSearch.sessionId?.trim() || undefined;

  let data: Awaited<ReturnType<typeof getPortfolio360>>;
  try {
    data = await getPortfolio360(portfolioId, sessionId);
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

      <SandboxControls portfolioId={data.portfolio.portfolio_id} sessionId={data.active_session_id} />

      {data.projected_summary ? (
        <section className="section-card">
          <h3>Projected Summary</h3>
          <div className="suite-row">
            <span>Baseline Positions</span>
            <strong>{data.projected_summary.total_baseline_positions}</strong>
          </div>
          <div className="suite-row">
            <span>Proposed Positions</span>
            <strong>{data.projected_summary.total_proposed_positions}</strong>
          </div>
          <div className="suite-row">
            <span>Net Delta Quantity</span>
            <strong>{data.projected_summary.net_delta_quantity.toFixed(4)}</strong>
          </div>
        </section>
      ) : null}

      <section className="section-card">
        <h3>Portfolio 360 Current Positions</h3>
        {data.current_positions.length ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th align="left">Security</th>
                <th align="left">Instrument</th>
                <th align="left">Asset Class</th>
                <th align="right">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {data.current_positions.slice(0, 20).map((row) => (
                <tr key={row.security_id}>
                  <td>{row.security_id}</td>
                  <td>{row.instrument_name}</td>
                  <td>{row.asset_class ?? "N/A"}</td>
                  <td align="right">{row.quantity.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No current positions available in snapshot.</p>
        )}
      </section>

      {data.projected_positions.length ? (
        <section className="section-card">
          <h3>Live Sandbox Projected Positions</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th align="left">Security</th>
                <th align="left">Instrument</th>
                <th align="right">Baseline</th>
                <th align="right">Proposed</th>
                <th align="right">Delta</th>
              </tr>
            </thead>
            <tbody>
              {data.projected_positions.slice(0, 20).map((row) => (
                <tr key={row.security_id}>
                  <td>{row.security_id}</td>
                  <td>{row.instrument_name}</td>
                  <td align="right">{row.baseline_quantity.toFixed(4)}</td>
                  <td align="right">{row.proposed_quantity.toFixed(4)}</td>
                  <td align="right">{row.delta_quantity.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

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
