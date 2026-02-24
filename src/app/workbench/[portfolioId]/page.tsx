import {
  getPortfolio360,
  getReportingSnapshot,
  getWorkbenchAnalytics,
} from "@/features/workbench/api";
import AnalyticsControls from "@/features/workbench/components/analytics-controls";
import AdvisorSummaryCard from "@/features/workbench/components/advisor-summary-card";
import BenchmarkKpiStrip from "@/features/workbench/components/benchmark-kpi-strip";
import DeltaAnalyticsPanel from "@/features/workbench/components/delta-analytics-panel";
import ExceptionQueue from "@/features/workbench/components/exception-queue";
import OverviewCards from "@/features/workbench/components/overview-cards";
import PartialFailureBanner from "@/features/workbench/components/partial-failure-banner";
import PerformanceSnapshot from "@/features/workbench/components/performance-snapshot";
import RebalanceStatus from "@/features/workbench/components/rebalance-status";
import ReportingSnapshotPanel from "@/features/workbench/components/reporting-snapshot-panel";
import SandboxControls from "@/features/workbench/components/sandbox-controls";
import Link from "next/link";

function formatCurrency(value: number | null | undefined, currency: string): string {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return value.toLocaleString(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
}

function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return `${value.toFixed(2)}%`;
}

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
  const groupBy =
    resolvedSearch.groupBy?.trim() === "SECURITY" ? "SECURITY" : "ASSET_CLASS";

  let data: Awaited<ReturnType<typeof getPortfolio360>>;
  let analytics: Awaited<ReturnType<typeof getWorkbenchAnalytics>> | null = null;
  let reportingSnapshot: Awaited<ReturnType<typeof getReportingSnapshot>> | null = null;
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

  try {
    analytics = await getWorkbenchAnalytics(portfolioId, {
      period,
      groupBy,
      benchmark,
      sessionId,
    });
  } catch {
    analytics = null;
  }

  try {
    reportingSnapshot = await getReportingSnapshot(portfolioId, data.as_of_date);
  } catch {
    reportingSnapshot = null;
  }

  const projectedCoveragePct =
    data.projected_summary &&
    data.projected_summary.total_baseline_positions > 0
      ? (data.projected_summary.total_proposed_positions /
          data.projected_summary.total_baseline_positions) *
        100
      : 0;
  const hasValuationData =
    data.overview.market_value_base > 0 ||
    data.current_positions.some((row) => row.market_value_base !== null);

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
      {!hasValuationData ? (
        <section className="section-card">
          <p className="muted">
            Valuation is not available for this portfolio yet. Load market prices and rerun PAS
            valuation to unlock position-level values and weights.
          </p>
        </section>
      ) : null}

      <AnalyticsControls
        sessionId={data.active_session_id}
        period={period}
        groupBy={groupBy}
        benchmark={benchmark}
        preset={preset}
      />

      <BenchmarkKpiStrip
        returnPct={analytics?.portfolio_return_pct ?? null}
        benchmarkReturnPct={analytics?.benchmark_return_pct ?? null}
        activeReturnPct={analytics?.active_return_pct ?? null}
        projectedCoveragePct={projectedCoveragePct}
      />
      {analytics === null ? (
        <section className="section-card">
          <p className="muted">
            Backend analytics endpoint is unavailable. Portfolio analytics panels will populate once
            the API is online.
          </p>
        </section>
      ) : null}

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
                      <th align="right">Market Value</th>
                      <th align="right">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.current_positions.map((row) => (
                      <tr key={row.security_id}>
                        <td>{row.security_id}</td>
                        <td>{row.instrument_name}</td>
                        <td>{row.asset_class ?? "N/A"}</td>
                        <td align="right">{row.quantity.toFixed(4)}</td>
                        <td align="right">
                          {formatCurrency(row.market_value_base, data.portfolio.base_currency)}
                        </td>
                        <td align="right">{formatPct(row.weight_pct)}</td>
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

          {reportingSnapshot ? (
            <ReportingSnapshotPanel
              asOfDate={reportingSnapshot.asOfDate}
              sourceService={reportingSnapshot.sourceService}
              rows={reportingSnapshot.rows}
            />
          ) : (
            <section className="section-card">
              <h3>Reporting Snapshot</h3>
              <p className="muted">
                Reporting service is unavailable. This panel will populate when reporting
                aggregation is online.
              </p>
            </section>
          )}
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
            buckets={analytics?.allocation_buckets ?? []}
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
    </main>
  );
}
