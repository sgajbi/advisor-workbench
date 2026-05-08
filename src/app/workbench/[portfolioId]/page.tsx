import {
  getDpmCommandCenter,
  getDpmCommandCenterExceptions,
  getDpmMandateByPortfolio,
  getDpmMandateHealth,
  getDpmOutcomeReviews,
  getDpmPortfolioMemory,
  listDpmWaves,
  getPortfolio360,
  getReportingSnapshot,
  getWorkbenchAnalytics,
} from "@/features/workbench/api";
import {
  AnalyticsTable,
  DegradedStatePanel,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  WorkbenchPageFrame,
  WorkbenchSectionStack,
  WorkbenchSummaryMetricStrip,
} from "@/design-system";
import AnalyticsControls from "@/features/workbench/components/analytics-controls";
import AdvisorSummaryCard from "@/features/workbench/components/advisor-summary-card";
import BenchmarkKpiStrip from "@/features/workbench/components/benchmark-kpi-strip";
import ConstructionAlternativesPanel from "@/features/workbench/components/construction-alternatives-panel";
import DeltaAnalyticsPanel from "@/features/workbench/components/delta-analytics-panel";
import DecisionReadinessPanel from "@/features/workbench/components/decision-readiness-panel";
import DpmCommandCenterPanel from "@/features/workbench/components/dpm-command-center-panel";
import DpmWaveCommandCenterPanel from "@/features/workbench/components/dpm-wave-command-center-panel";
import ExceptionQueue from "@/features/workbench/components/exception-queue";
import OverviewCards from "@/features/workbench/components/overview-cards";
import OutcomeReviewPanel from "@/features/workbench/components/outcome-review-panel";
import PartialFailureBanner from "@/features/workbench/components/partial-failure-banner";
import PerformanceSnapshot from "@/features/workbench/components/performance-snapshot";
import PortfolioMemoryPanel from "@/features/workbench/components/portfolio-memory-panel";
import ProofPackPanel from "@/features/workbench/components/proof-pack-panel";
import RebalanceStatus from "@/features/workbench/components/rebalance-status";
import ReportBatchOperationsPanel from "@/features/workbench/components/report-batch-operations-panel";
import ReportingSnapshotPanel from "@/features/workbench/components/reporting-snapshot-panel";
import SandboxControls from "@/features/workbench/components/sandbox-controls";

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
    asOfDate?: string;
  }>;
}) {
  const { portfolioId } = await params;
  const resolvedSearch = await searchParams;
  const sessionId = resolvedSearch.sessionId?.trim() || undefined;
  const period = resolvedSearch.period?.trim() || "YTD";
  const benchmark = resolvedSearch.benchmark?.trim() || "MODEL_60_40";
  const preset = resolvedSearch.preset?.trim() || "EXEC_SUMMARY";
  const requestedAsOfDate = resolvedSearch.asOfDate?.trim() || undefined;
  const groupBy =
    resolvedSearch.groupBy?.trim() === "SECURITY" ? "SECURITY" : "ASSET_CLASS";

  let data: Awaited<ReturnType<typeof getPortfolio360>>;
  let analytics: Awaited<ReturnType<typeof getWorkbenchAnalytics>> | null = null;
  let reportingSnapshot: Awaited<ReturnType<typeof getReportingSnapshot>> | null = null;
  let dpmCommandCenter: Awaited<ReturnType<typeof getDpmCommandCenter>> | null = null;
  let dpmCommandCenterExceptions: Awaited<ReturnType<typeof getDpmCommandCenterExceptions>> | null = null;
  let dpmMandate: Awaited<ReturnType<typeof getDpmMandateByPortfolio>> | null = null;
  let dpmMandateHealth: Awaited<ReturnType<typeof getDpmMandateHealth>> | null = null;
  let dpmCommandCenterError: string | null = null;
  let portfolioMemory: Awaited<ReturnType<typeof getDpmPortfolioMemory>> | null = null;
  let portfolioMemoryError: string | null = null;
  let dpmWaves: Awaited<ReturnType<typeof listDpmWaves>> | null = null;
  let dpmWavesError: string | null = null;
  let outcomeReviews: Awaited<ReturnType<typeof getDpmOutcomeReviews>> | null = null;
  let outcomeReviewError: string | null = null;
  try {
    data = await getPortfolio360(portfolioId, sessionId);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return (
      <main className="page-container">
        <WorkbenchPageFrame
          title="Advisor Workbench"
          subtitle={`Decision context is temporarily unavailable for ${portfolioId}.`}
        >
          <DegradedStatePanel
            label="Operational status"
            title={`Unable to load workbench overview for ${portfolioId}.`}
            tone="danger"
            status="Unavailable"
            actions={[
              { href: `/performance?portfolioId=${encodeURIComponent(portfolioId)}`, label: "Open Performance Workspace" },
              { href: "/intake", label: "Open Portfolio Intake" },
              { href: "/suite", label: "Return To Command Center" },
            ]}
          >
            {detail}
          </DegradedStatePanel>
        </WorkbenchPageFrame>
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
    reportingSnapshot = await getReportingSnapshot(
      portfolioId,
      requestedAsOfDate ?? data.as_of_date
    );
  } catch {
    reportingSnapshot = null;
  }

  try {
    dpmCommandCenter = await getDpmCommandCenter({ limit: 25 });
  } catch (error) {
    dpmCommandCenter = null;
    dpmCommandCenterError =
      error instanceof Error ? error.message : "DPM command-center endpoint unavailable.";
  }

  try {
    dpmCommandCenterExceptions = await getDpmCommandCenterExceptions({
      state: "ACTIVE",
      limit: 25,
    });
  } catch {
    dpmCommandCenterExceptions = null;
  }

  try {
    dpmMandate = await getDpmMandateByPortfolio(data.portfolio.portfolio_id);
    const mandateId =
      typeof dpmMandate.data.mandate_id === "string"
        ? dpmMandate.data.mandate_id
        : null;
    dpmMandateHealth = mandateId ? await getDpmMandateHealth(mandateId) : null;
  } catch {
    dpmMandate = null;
    dpmMandateHealth = null;
  }

  try {
    portfolioMemory = await getDpmPortfolioMemory({
      portfolioId: data.portfolio.portfolio_id,
      limit: 100,
    });
  } catch (error) {
    portfolioMemory = null;
    portfolioMemoryError =
      error instanceof Error ? error.message : "Portfolio-memory endpoint unavailable.";
  }

  try {
    dpmWaves = await listDpmWaves({
      triggerType: "EXPLICIT_PORTFOLIO_LIST",
      limit: 10,
    });
  } catch (error) {
    dpmWaves = null;
    dpmWavesError =
      error instanceof Error ? error.message : "DPM wave endpoint unavailable.";
  }

  try {
    outcomeReviews = await getDpmOutcomeReviews({
      portfolioId: data.portfolio.portfolio_id,
      limit: 10,
    });
  } catch (error) {
    outcomeReviews = null;
    outcomeReviewError =
      error instanceof Error ? error.message : "Outcome review endpoint unavailable.";
  }

  const dpmMandateId = readDpmMandateId(dpmMandate?.data ?? null);
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
  const hasAnalytics = analytics !== null;
  const hasReporting = reportingSnapshot !== null;
  const warnings = [...data.warnings, ...(analytics?.warnings ?? [])];
  const partialFailures = [
    ...data.partial_failures,
    ...(analytics?.partial_failures ?? []),
  ];
  const reportingAsOfDate = requestedAsOfDate ?? data.as_of_date;
  const pageSubtitle =
    reportingAsOfDate === data.as_of_date
      ? `As of: ${data.as_of_date}`
      : `Portfolio data as of: ${data.as_of_date} | Report date: ${reportingAsOfDate}`;

  return (
    <main className="page-container">
      <WorkbenchPageFrame
        title={`Advisor Workbench: ${data.portfolio.portfolio_id}`}
        subtitle={pageSubtitle}
        actions={
          <>
            <SemanticBadge tone={partialFailures.length > 0 ? "warn" : "success"}>
              {partialFailures.length > 0 ? "Partial upstream coverage" : "Operationally ready"}
            </SemanticBadge>
            <SemanticBadge>{data.active_session_id ? "Sandbox active" : "Sandbox idle"}</SemanticBadge>
          </>
        }
      >
        <WorkbenchSectionStack>
          <PartialFailureBanner items={partialFailures} />

          <OverviewCards
            marketValueBase={data.overview.market_value_base}
            cashWeightPct={data.overview.cash_weight_pct}
            positionCount={data.overview.position_count}
            baseCurrency={data.portfolio.base_currency}
          />
          {!hasValuationData ? (
            <ScreenStatePanel
              kind="empty"
              title="Valuation is not available for this portfolio yet"
              body="Load market prices and rerun lotus-core valuation to unlock position-level values and weights."
            />
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
            <ScreenStatePanel
              kind="partial"
              title="Backend analytics endpoint is unavailable"
              body="Portfolio analytics panels will populate once the API is online."
            />
          ) : null}

          <section className="workbench-split">
            <div className="workbench-col">
              <SectionBlock title="Portfolio 360 Baseline Positions">
                <AnalyticsTable
                  ariaLabel="Portfolio 360 baseline positions"
                  variant="portfolio"
                  density="comfortable"
                  columns={[
                    { key: "security", label: "Security" },
                    { key: "instrument", label: "Instrument" },
                    { key: "asset-class", label: "Asset Class" },
                    { key: "quantity", label: "Quantity", align: "right" },
                    { key: "market-value", label: "Market Value", align: "right" },
                    { key: "weight", label: "Weight", align: "right" },
                  ]}
                  rows={data.current_positions.map((row) => ({
                    key: row.security_id,
                    cells: [
                      row.security_id,
                      row.instrument_name,
                      row.asset_class ?? "N/A",
                      row.quantity.toFixed(4),
                      formatCurrency(row.market_value_base, data.portfolio.base_currency),
                      formatPct(row.weight_pct),
                    ],
                  }))}
                  emptyState={{
                    title: "No current positions available",
                    body: "No current positions are available in the latest portfolio snapshot.",
                  }}
                />
              </SectionBlock>

              <PerformanceSnapshot
                period={data.performance_snapshot?.period ?? "YTD"}
                returnPct={data.performance_snapshot?.return_pct ?? null}
                benchmarkReturnPct={data.performance_snapshot?.benchmark_return_pct ?? null}
              />

              <RebalanceStatus
                snapshot={data.rebalance_snapshot}
              />

              <DpmCommandCenterPanel
                commandCenter={dpmCommandCenter}
                exceptions={dpmCommandCenterExceptions}
                mandate={dpmMandate}
                mandateHealth={dpmMandateHealth}
                errorMessage={dpmCommandCenterError}
              />

              <PortfolioMemoryPanel
                response={portfolioMemory}
                errorMessage={portfolioMemoryError}
              />

              <ConstructionAlternativesPanel portfolio={data} />

              <DpmWaveCommandCenterPanel
                portfolioId={data.portfolio.portfolio_id}
                waveList={dpmWaves}
                errorMessage={dpmWavesError}
              />

              <ProofPackPanel
                portfolioId={data.portfolio.portfolio_id}
                mandateId={dpmMandateId}
                outcomeReviews={outcomeReviews}
                rebalanceSnapshot={data.rebalance_snapshot}
                initialProofPack={null}
                errorMessage={null}
              />

              <OutcomeReviewPanel
                portfolioId={data.portfolio.portfolio_id}
                response={outcomeReviews}
                errorMessage={outcomeReviewError}
              />

              {reportingSnapshot ? (
                <ReportingSnapshotPanel
                  asOfDate={reportingSnapshot.asOfDate}
                  sourceService={reportingSnapshot.sourceService}
                  rows={reportingSnapshot.rows}
                />
              ) : (
                <ScreenStatePanel
                  kind="partial"
                  title="Reporting service is unavailable"
                  body="This panel will populate when reporting aggregation is online."
                />
              )}

              <ReportBatchOperationsPanel
                portfolioId={data.portfolio.portfolio_id}
                asOfDate={reportingAsOfDate}
                reportingCurrency={data.portfolio.base_currency}
                bookingCenterCode={data.portfolio.booking_center_code}
                benchmarkCode={benchmark}
              />
            </div>

            <div className="workbench-col">
              <SandboxControls
                portfolioId={data.portfolio.portfolio_id}
                sessionId={data.active_session_id}
                warnings={warnings}
              />

              {data.projected_summary ? (
                <SectionBlock title="Projected Summary">
                  <WorkbenchSummaryMetricStrip
                    ariaLabel="Projected summary"
                    items={[
                      { key: "baseline", label: "Baseline Positions", value: data.projected_summary.total_baseline_positions },
                      { key: "proposed", label: "Proposed Positions", value: data.projected_summary.total_proposed_positions },
                      { key: "net-delta", label: "Net Delta Quantity", value: data.projected_summary.net_delta_quantity.toFixed(4) },
                    ]}
                  />
                </SectionBlock>
              ) : null}

              <SectionBlock title="Live Sandbox Projected Positions">
                <AnalyticsTable
                  ariaLabel="Live sandbox projected positions"
                  variant="analysis"
                  density="comfortable"
                  columns={[
                    { key: "security", label: "Security" },
                    { key: "instrument", label: "Instrument" },
                    { key: "baseline", label: "Baseline", align: "right" },
                    { key: "proposed", label: "Proposed", align: "right" },
                    { key: "delta", label: "Delta", align: "right" },
                  ]}
                  rows={data.projected_positions.map((row) => ({
                    key: row.security_id,
                    cells: [
                      row.security_id,
                      row.instrument_name,
                      row.baseline_quantity.toFixed(4),
                      row.proposed_quantity.toFixed(4),
                      row.delta_quantity.toFixed(4),
                    ],
                  }))}
                  emptyState={{
                    title: "No projected holdings yet",
                    body: "Create and update a sandbox session to see projected holdings.",
                  }}
                />
              </SectionBlock>

              <DeltaAnalyticsPanel
                buckets={analytics?.allocation_buckets ?? []}
                groupBy={groupBy}
              />

              <ExceptionQueue
                warnings={warnings}
                partialFailures={partialFailures}
              />

              <DecisionReadinessPanel
                hasValuationData={hasValuationData}
                hasAnalytics={hasAnalytics}
                hasReporting={hasReporting}
                hasActiveSandbox={Boolean(data.active_session_id)}
                warningCount={warnings.length}
                failureCount={partialFailures.length}
                riskWorkspaceHref={`/performance?portfolioId=${encodeURIComponent(
                  data.portfolio.portfolio_id
                )}&mode=risk`}
              />

              <AdvisorSummaryCard
                portfolioId={data.portfolio.portfolio_id}
                warningCount={warnings.length}
                failureCount={partialFailures.length}
                netDeltaQuantity={data.projected_summary?.net_delta_quantity ?? 0}
              />
            </div>
          </section>
        </WorkbenchSectionStack>
      </WorkbenchPageFrame>
    </main>
  );
}

function readDpmMandateId(data: Record<string, unknown> | null): string | null {
  if (!data) {
    return null;
  }
  if (typeof data.mandate_id === "string" && data.mandate_id.trim().length > 0) {
    return data.mandate_id;
  }
  const mandate = data.mandate;
  if (mandate && typeof mandate === "object" && !Array.isArray(mandate)) {
    const mandateId = (mandate as Record<string, unknown>).mandate_id;
    return typeof mandateId === "string" && mandateId.trim().length > 0 ? mandateId : null;
  }
  return null;
}
