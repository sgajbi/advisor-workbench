import { getPortfolio360 } from "@/features/workbench/api";
import { AnalyticsGroupBy, resolveBenchmarkReturn } from "@/features/workbench/analytics";
import AnalyticsControls from "@/features/workbench/components/analytics-controls";
import AdvisorSummaryCard from "@/features/workbench/components/advisor-summary-card";
import BenchmarkKpiStrip from "@/features/workbench/components/benchmark-kpi-strip";
import DeltaAnalyticsPanel from "@/features/workbench/components/delta-analytics-panel";
import ExceptionQueue from "@/features/workbench/components/exception-queue";
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
  searchParams: Promise<{
    sessionId?: string;
    period?: string;
    groupBy?: string;
    benchmark?: string;
    preset?: string;
  }>;
}) {
  const { portfolioId } = await params;
  const resolvedSearch = await searchParams;
  const sessionId = resolvedSearch.sessionId?.trim() || undefined;
  const period = resolvedSearch.period?.trim() || "YTD";
  const benchmark = resolvedSearch.benchmark?.trim() || "MODEL_60_40";
  const preset = resolvedSearch.preset?.trim() || "EXEC_SUMMARY";
  const groupBy: AnalyticsGroupBy =
    resolvedSearch.groupBy?.trim() === "SECURITY" ? "SECURITY" : "ASSET_CLASS";

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

  const benchmarkReturn = resolveBenchmarkReturn(
    benchmark,
    data.performance_snapshot?.benchmark_return_pct
  );
  const projectedCoveragePct =
    data.projected_summary &&
    data.projected_summary.total_baseline_positions > 0
      ? (data.projected_summary.total_proposed_positions /
          data.projected_summary.total_baseline_positions) *
        100
      : 0;

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

      <AnalyticsControls
        sessionId={data.active_session_id}
        period={period}
        groupBy={groupBy}
        benchmark={benchmark}
        preset={preset}
      />

      <BenchmarkKpiStrip
        returnPct={data.performance_snapshot?.return_pct ?? null}
        benchmarkReturnPct={benchmarkReturn}
        projectedCoveragePct={projectedCoveragePct}
      />

      <section className="workbench-split">
        <div className="workbench-col">
          <section className="section-card">
            <h3>Portfolio 360 Baseline Positions</h3>
            {data.current_positions.length ? (
              <div className="table-wrap">
                <table className="position-table">
                  <thead>
                    <tr>
                      <th align="left">Security</th>
                      <th align="left">Instrument</th>
                      <th align="left">Asset Class</th>
                      <th align="right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.current_positions.map((row) => (
                      <tr key={row.security_id}>
                        <td>{row.security_id}</td>
                        <td>{row.instrument_name}</td>
                        <td>{row.asset_class ?? "N/A"}</td>
                        <td align="right">{row.quantity.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No current positions available in snapshot.</p>
            )}
          </section>

          <PerformanceSnapshot
            period={data.performance_snapshot?.period ?? "YTD"}
            returnPct={data.performance_snapshot?.return_pct ?? null}
            benchmarkReturnPct={data.performance_snapshot?.benchmark_return_pct ?? null}
          />

          <RebalanceStatus
            status={data.rebalance_snapshot?.status ?? "UNKNOWN"}
            lastRunId={data.rebalance_snapshot?.last_rebalance_run_id ?? null}
          />
        </div>

        <div className="workbench-col">
          <SandboxControls
            portfolioId={data.portfolio.portfolio_id}
            sessionId={data.active_session_id}
            warnings={data.warnings}
          />

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
            <h3>Live Sandbox Projected Positions</h3>
            {data.projected_positions.length ? (
              <div className="table-wrap">
                <table className="position-table">
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
                    {data.projected_positions.map((row) => (
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
              </div>
            ) : (
              <p className="muted">Create and update a sandbox session to see projected holdings.</p>
            )}
          </section>

          <DeltaAnalyticsPanel
            currentPositions={data.current_positions}
            projectedPositions={data.projected_positions}
            groupBy={groupBy}
          />

          <ExceptionQueue
            warnings={data.warnings}
            partialFailures={data.partial_failures}
          />

          <AdvisorSummaryCard
            portfolioId={data.portfolio.portfolio_id}
            warningCount={data.warnings.length}
            failureCount={data.partial_failures.length}
            netDeltaQuantity={data.projected_summary?.net_delta_quantity ?? 0}
          />
        </div>
      </section>

      <PositionsGrid count={data.overview.position_count} />
    </main>
  );
}
