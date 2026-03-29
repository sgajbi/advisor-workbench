import { Box, Divider, Stack, Typography } from "@mui/material";

import {
  AnalyticsModule,
  AnalyticsRankedList,
  AnalyticsSectionHeader,
  AnalyticsStat,
  Panel,
  StatusChip,
  WorkspaceGrid,
} from "@/design-system";
import type { WorkbenchPerformanceWorkspace } from "@/features/workbench/types";

import { formatCompactPct, formatCurrency, formatDate, formatLabel, formatPct } from "../formatters";
import PerformanceChartPanel from "./performance-chart-panel";
import PerformanceMultiHorizonPanel from "./performance-multi-horizon-panel";
import { summaryLabelSx } from "./performance-workspace-view-helpers";

type ContributionRow = {
  position_id: string;
  weight_avg_pct: number | null;
  contribution_pct: number;
};

type GenericContributionRow = {
  key_label: string;
  weight_avg_pct: number | null;
  contribution_pct: number;
};

export default function PerformanceSummaryMode({
  workspace,
  period,
  detailBasis,
  contributionDimension,
  attributionDimension,
  chartFrequency,
  benchmark,
  onRequestChange,
  isUpdating,
  isDetailsPending,
  hasBenchmark,
  hasHistory,
  selectedBenchmarkCode,
  selectedBenchmarkLabel,
  selectedPerformance,
  primaryDriver,
  hasMoneyWeightedReturn,
  suspiciousMoneyWeightedReturn,
  hasContribution,
  hasPositionRanking,
  contributorScale,
  positivePositionContributors,
  negativePositionContributors,
}: {
  workspace: WorkbenchPerformanceWorkspace;
  period: string;
  detailBasis: string;
  contributionDimension: string;
  attributionDimension: string;
  chartFrequency: string;
  benchmark?: string;
  onRequestChange?: (patch: {
    period?: string;
    detailBasis?: string;
    contributionDimension?: string;
    attributionDimension?: string;
    chartFrequency?: string;
    benchmark?: string;
    reportStartDate?: string;
    reportEndDate?: string;
  }) => void;
  isUpdating: boolean;
  isDetailsPending: boolean;
  hasBenchmark: boolean;
  hasHistory: boolean;
  selectedBenchmarkCode?: string;
  selectedBenchmarkLabel?: string | null;
  selectedPerformance: WorkbenchPerformanceWorkspace["net_performance"] | WorkbenchPerformanceWorkspace["gross_performance"] | undefined;
  primaryDriver: GenericContributionRow | null;
  hasMoneyWeightedReturn: boolean;
  suspiciousMoneyWeightedReturn: boolean;
  hasContribution: boolean;
  hasPositionRanking: boolean;
  contributorScale: number;
  positivePositionContributors: ContributionRow[];
  negativePositionContributors: ContributionRow[];
}) {
  return (
    <>
      <Panel id="performance-overview" className="performance-summary-stage">
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", xl: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", xl: "flex-start" }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <AnalyticsSectionHeader
                title={workspace.portfolio.portfolio_id}
                subtitle="Benchmark-aware performance summary for first paint and mandate context"
              />
              <Box className="performance-observation-strip" sx={{ mt: 1 }}>
                <StatusChip>As of {formatDate(workspace.as_of_date)}</StatusChip>
                <StatusChip>{workspace.portfolio.base_currency}</StatusChip>
                {hasHistory ? (
                  <StatusChip>{workspace.net_chart.length} observations</StatusChip>
                ) : (
                  <StatusChip>Limited history</StatusChip>
                )}
                {hasBenchmark ? (
                  <StatusChip>Relative measurement</StatusChip>
                ) : (
                  <StatusChip>
                    {selectedBenchmarkCode ? "Benchmark unavailable" : "No benchmark assigned"}
                  </StatusChip>
                )}
              </Box>
            </Box>
            <Box
              sx={{
                minWidth: { xl: 320 },
                width: { xs: "100%", xl: "auto" },
                p: 2,
                borderRadius: 3,
                border: "1px solid rgba(31, 39, 51, 0.08)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(247,248,250,0.92) 100%)",
              }}
            >
              <Stack spacing={1.5}>
                <AnalyticsStat label="Benchmark" value={selectedBenchmarkLabel ?? "Unassigned"} />
                <Divider flexItem />
                <AnalyticsStat
                  label="Primary Contributor"
                  value={primaryDriver ? formatLabel(primaryDriver.key_label) : "N/A"}
                />
              </Stack>
            </Box>
          </Stack>

          <Box
            className="performance-summary-grid"
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "minmax(240px, 1.15fr) repeat(3, minmax(0, 1fr))",
              },
              gap: 1.25,
            }}
          >
            <AnalyticsStat
              label={detailBasis === "GROSS" ? "Gross Return" : "Net Return"}
              value={formatPct(selectedPerformance?.portfolio_return_pct ?? null)}
              support={
                hasBenchmark
                  ? `Active ${formatCompactPct(selectedPerformance?.active_return_pct ?? null)} versus benchmark`
                  : "Absolute performance for the selected mandate and horizon"
              }
              emphasize
            />

            <Box className="performance-summary-card">
              <Typography component="span" sx={summaryLabelSx}>
                Benchmark Comparison
              </Typography>
              <Box className="performance-summary-metrics">
                <AnalyticsStat
                  label="Portfolio"
                  value={formatPct(selectedPerformance?.portfolio_return_pct ?? null)}
                />
                <AnalyticsStat
                  label="Benchmark"
                  value={formatPct(selectedPerformance?.benchmark_return_pct ?? null)}
                />
                <AnalyticsStat
                  label="Active"
                  value={formatPct(selectedPerformance?.active_return_pct ?? null)}
                />
                <AnalyticsStat
                  label="Annualized"
                  value={formatPct(selectedPerformance?.annualized_return_pct ?? null)}
                />
              </Box>
            </Box>

            <Box className="performance-summary-card">
              <Typography component="span" sx={summaryLabelSx}>
                Economic Context
              </Typography>
              <Box className="performance-summary-metrics">
                <AnalyticsStat
                  label="Start MV"
                  value={formatCurrency(
                    selectedPerformance?.begin_market_value ?? null,
                    workspace.portfolio.base_currency
                  )}
                />
                <AnalyticsStat
                  label="End MV"
                  value={formatCurrency(
                    selectedPerformance?.end_market_value ?? workspace.overview.market_value_base,
                    workspace.portfolio.base_currency
                  )}
                />
                <AnalyticsStat
                  label="Net Cash Flow"
                  value={formatCurrency(
                    selectedPerformance?.net_cash_flow ?? null,
                    workspace.portfolio.base_currency
                  )}
                />
                <AnalyticsStat
                  label="Cash Weight"
                  value={formatPct(workspace.overview.cash_weight_pct)}
                />
              </Box>
            </Box>

            <Box className="performance-summary-card">
              <Typography component="span" sx={summaryLabelSx}>
                Mandate Context
              </Typography>
              <Box className="performance-summary-metrics">
                <AnalyticsStat
                  label="Money-Weighted"
                  value={
                    workspace.money_weighted_return
                      ? formatPct(workspace.money_weighted_return.money_weighted_return_pct)
                      : "N/A"
                  }
                />
                <AnalyticsStat label="Position Count" value={workspace.overview.position_count} />
                <AnalyticsStat
                  label="Market Value"
                  value={formatCurrency(
                    workspace.overview.market_value_base,
                    workspace.portfolio.base_currency
                  )}
                />
                <AnalyticsStat label="Basis" value={detailBasis} />
              </Box>
              {hasMoneyWeightedReturn ? (
                <Typography className="performance-summary-footnote">
                  {workspace.money_weighted_return?.annualized_return_pct != null
                    ? `MWR annualized ${formatCompactPct(
                        workspace.money_weighted_return.annualized_return_pct
                      )}`
                    : workspace.money_weighted_return?.method ?? "MWR"}
                  {suspiciousMoneyWeightedReturn ? " • review cash-flow timing" : ""}
                </Typography>
              ) : null}
            </Box>
          </Box>
        </Stack>
      </Panel>

      <WorkspaceGrid className="performance-chart-grid">
        <PerformanceChartPanel
          title={detailBasis === "GROSS" ? "Gross Return Path" : "Net Return Path"}
          points={detailBasis === "GROSS" ? workspace.gross_chart : workspace.net_chart}
          summary={detailBasis === "GROSS" ? workspace.gross_performance : workspace.net_performance}
          portfolioId={workspace.portfolio.portfolio_id}
          period={period}
          detailBasis={detailBasis}
          contributionDimension={contributionDimension}
          attributionDimension={attributionDimension}
          chartFrequency={chartFrequency}
          benchmark={benchmark}
          benchmarkOptions={workspace.benchmark_options ?? []}
          reportStartDate={workspace.report_start_date}
          reportEndDate={workspace.report_end_date}
          onRequestChange={onRequestChange ?? (() => undefined)}
          isUpdating={isUpdating}
          isDetailsPending={isDetailsPending}
          id="performance-trend"
        />
      </WorkspaceGrid>

      <WorkspaceGrid className="performance-detail-grid">
        <PerformanceMultiHorizonPanel
          portfolioId={workspace.portfolio.portfolio_id}
          detailBasis={detailBasis}
          benchmark={workspace.benchmark_code ?? benchmark}
          chartFrequency={chartFrequency}
          benchmarkOptions={workspace.benchmark_options ?? []}
        />
        <AnalyticsModule title="Top / Bottom Contributors" subtitle={`${workspace.period} position ranking`}>
          {hasContribution ? (
            hasPositionRanking ? (
              <div className="performance-contributors-grid">
                <AnalyticsRankedList
                  title="Highest"
                  label="Contribution"
                  scale={contributorScale}
                  rows={positivePositionContributors.map((row) => ({
                    key: `top-position-${row.position_id}`,
                    title: row.position_id,
                    subtitle: `Avg. Weight ${formatPct(row.weight_avg_pct)}`,
                    value: formatPct(row.contribution_pct),
                    magnitudePct: row.contribution_pct,
                    tone: "positive" as const,
                  }))}
                  emptyMessage="No positive contributors are present for the selected analytical slice."
                />
                <AnalyticsRankedList
                  title="Lowest"
                  label="Contribution"
                  scale={contributorScale}
                  rows={negativePositionContributors.map((row) => ({
                    key: `bottom-position-${row.position_id}`,
                    title: row.position_id,
                    subtitle: `Avg. Weight ${formatPct(row.weight_avg_pct)}`,
                    value: formatPct(row.contribution_pct),
                    magnitudePct: row.contribution_pct,
                    tone: "negative" as const,
                  }))}
                  emptyMessage="No detractors are present for the selected analytical slice."
                />
              </div>
            ) : (
              <p className="muted">
                Position-level contributor ranking is not available from the current analytics
                contract.
              </p>
            )
          ) : isDetailsPending ? (
            <p className="muted">Loading contributor ranking for the selected analytical slice.</p>
          ) : (
            <p className="muted">Contributor ranking is not available for the current selection.</p>
          )}
        </AnalyticsModule>
      </WorkspaceGrid>
    </>
  );
}
