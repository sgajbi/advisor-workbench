import { Box, Divider, FormControl, MenuItem, Select, Stack, Typography } from "@mui/material";

import {
  AnalyticsEffectStrip,
  AnalyticsModule,
  AnalyticsRankedList,
  AnalyticsSectionHeader,
  AnalyticsStat,
  AnalyticsTable,
  Panel,
  StatusChip,
  WorkspaceGrid,
  WorkspaceLayout,
  WorkspaceMain,
} from "@/design-system";
import type { WorkbenchPerformanceWorkspace } from "@/features/workbench/types";

import { formatCompactPct, formatCurrency, formatDate, formatLabel, formatPct } from "../formatters";
import {
  ATTRIBUTION_DIMENSION_OPTIONS,
  CONTRIBUTION_DIMENSION_OPTIONS,
} from "../navigation";
import {
  getBottomContributionRows,
  getNegativePositionContributionRows,
  getPositivePositionContributionRows,
  getRelativeSegmentRows,
  getTopAttributionEffectRows,
  getPrimaryContributionRow,
  getTopContributionRows,
  isMoneyWeightedReturnSuspicious,
  hasBenchmarkContext,
  hasMeaningfulHistory,
  hasPositionContributionRanking,
  hasUsableAttribution,
  hasUsableContribution,
} from "../view-model";
import PerformanceChartPanel from "./performance-chart-panel";
import PerformanceMultiHorizonPanel from "./performance-multi-horizon-panel";
import PerformanceRelativeSegmentPanel from "./performance-relative-segment-panel";

export default function PerformanceWorkspaceView({
  workspace,
  period,
  detailBasis,
  contributionDimension,
  attributionDimension,
  chartFrequency,
  benchmark,
  onRequestChange,
  isUpdating = false,
  isDetailsPending = false,
}: {
  workspace: WorkbenchPerformanceWorkspace | null;
  period: string;
  detailBasis: string;
  contributionDimension: string;
  attributionDimension: string;
  chartFrequency: string;
  benchmark?: string;
  onRequestChange?: (patch: {
    portfolioId?: string;
    period?: string;
    detailBasis?: string;
    contributionDimension?: string;
    attributionDimension?: string;
    chartFrequency?: string;
    benchmark?: string;
    reportStartDate?: string;
    reportEndDate?: string;
  }) => void;
  isUpdating?: boolean;
  isDetailsPending?: boolean;
}) {
  const hasBenchmark = workspace ? hasBenchmarkContext(workspace) : false;
  const contributionLevels = workspace?.contribution?.levels ?? [];
  const attributionLevels = workspace?.attribution?.levels ?? [];
  const hasAttribution = workspace ? hasUsableAttribution(workspace) : false;
  const hasContribution = workspace ? hasUsableContribution(workspace) : false;
  const hasHistory = workspace ? hasMeaningfulHistory(workspace.net_chart) : false;
  const primaryDriver = workspace ? getPrimaryContributionRow(workspace) : null;
  const hasPositionRanking = workspace ? hasPositionContributionRanking(workspace) : false;
  const hasMoneyWeightedReturn = Boolean(
    workspace?.money_weighted_return?.money_weighted_return_pct !== null &&
      workspace?.money_weighted_return?.money_weighted_return_pct !== undefined
  );
  const suspiciousMoneyWeightedReturn = workspace
    ? isMoneyWeightedReturnSuspicious(workspace)
    : false;
  const positivePositionContributors = workspace
    ? getPositivePositionContributionRows(workspace)
    : [];
  const negativePositionContributors = workspace
    ? getNegativePositionContributionRows(workspace)
    : [];
  const topContributors = workspace ? getTopContributionRows(workspace) : [];
  const bottomContributors = workspace ? getBottomContributionRows(workspace) : [];
  const relativeSegmentRows = workspace ? getRelativeSegmentRows(workspace) : [];
  const topAttributionEffectRows = workspace ? getTopAttributionEffectRows(workspace) : [];
  const contributorScale = Math.max(
    0.01,
    ...(hasPositionRanking ? positivePositionContributors : topContributors).map((row) =>
      Math.abs(row.contribution_pct)
    ),
    ...(hasPositionRanking ? negativePositionContributors : bottomContributors).map((row) =>
      Math.abs(row.contribution_pct)
    )
  );
  const selectedBenchmarkCode = workspace?.benchmark_code ?? benchmark ?? undefined;
  const selectedBenchmarkLabel = workspace
    ? getBenchmarkLabel(workspace, selectedBenchmarkCode)
    : undefined;
  const selectedPerformance =
    workspace && detailBasis === "GROSS" ? workspace.gross_performance : workspace?.net_performance;
  const attributionEffectScale = Math.max(
    0.01,
    ...topAttributionEffectRows.map((row) => Math.abs(row.total_effect_pct))
  );

  return (
    <WorkspaceLayout className="performance-layout">
      <WorkspaceMain className="performance-main">
        {!workspace ? (
          <Panel className="degraded-state-panel">
            <h2>Performance data unavailable</h2>
            <p className="error-text">
              The selected portfolio could not be loaded from the performance workspace contract.
            </p>
          </Panel>
        ) : (
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
                      <AnalyticsStat
                        label="Benchmark"
                        value={selectedBenchmarkLabel ?? "Unassigned"}
                      />
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
                      <AnalyticsStat
                        label="Position Count"
                        value={workspace.overview.position_count}
                      />
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
                summary={
                  detailBasis === "GROSS" ? workspace.gross_performance : workspace.net_performance
                }
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
              <AnalyticsModule
                title="Top / Bottom Contributors"
                subtitle={`${workspace.period} position ranking`}
              >
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
                      Position-level contributor ranking is not available from the current
                      analytics contract.
                    </p>
                  )
                ) : isDetailsPending ? (
                  <p className="muted">
                    Loading contributor ranking for the selected analytical slice.
                  </p>
                ) : (
                  <p className="muted">Contributor ranking is not available for the current selection.</p>
                )}
              </AnalyticsModule>

              <Panel id="performance-attribution" className="performance-detail-panel-compact">
                <div className="performance-section-heading">
                  <h3>Attribution Detail</h3>
                  <div className="performance-section-heading-meta">
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <Typography component="label" sx={inlineControlLabelSx}>
                        Segment
                      </Typography>
                      <Select
                        aria-label="Attribution Segment"
                        value={attributionDimension}
                        onChange={(event) =>
                          onRequestChange?.({
                            attributionDimension: event.target.value,
                          })
                        }
                        disabled={isUpdating}
                      >
                        {ATTRIBUTION_DIMENSION_OPTIONS.map((option) => (
                          <MenuItem key={option} value={option}>
                            {formatLabel(option)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {workspace.attribution?.benchmark_id ? (
                      <span className="performance-section-benchmark">
                        Versus {formatLabel(workspace.attribution.benchmark_id)}
                      </span>
                    ) : null}
                  </div>
                </div>
                {workspace.attribution?.benchmark_id ? (
                  <div className="performance-attribution-summary-strip">
                    <div>
                      <span>Benchmark</span>
                      <strong>{formatLabel(workspace.attribution.benchmark_id)}</strong>
                    </div>
                    <div>
                      <span>Active Return</span>
                      <strong>{formatPct(workspace.attribution.active_return_pct)}</strong>
                    </div>
                    <div>
                      <span>Effects Sum</span>
                      <strong>{formatPct(workspace.attribution.sum_of_effects_pct)}</strong>
                    </div>
                    <div>
                      <span>Residual</span>
                      <strong>{formatPct(workspace.attribution.residual_pct)}</strong>
                    </div>
                  </div>
                ) : null}
                {hasAttribution ? (
                  <div className="performance-analytic-duo-grid">
                    <PerformanceRelativeSegmentPanel rows={relativeSegmentRows} />

                    <AnalyticsModule
                      title="Total Effect Ranking"
                      subtitle="Largest benchmark-relative effects"
                    >
                      <div className="performance-comparative-list">
                        {topAttributionEffectRows.map((row) => (
                          <div
                            key={`effect-ranking-${row.key_label}`}
                            className="performance-comparative-row"
                          >
                            <div className="performance-comparative-meta">
                              <strong>{formatLabel(row.key_label)}</strong>
                              <span>
                                Alloc {formatCompactPct(row.allocation_pct)} / Select{" "}
                                {formatCompactPct(row.selection_pct)}
                              </span>
                            </div>
                            <div className="performance-comparative-bar-track">
                              <div className="performance-comparative-bar-axis" />
                              <div
                                className={`performance-comparative-bar ${
                                  row.total_effect_pct >= 0
                                    ? "performance-comparative-bar-positive"
                                    : "performance-comparative-bar-negative"
                                }`}
                                style={{
                                  width: `${(Math.abs(row.total_effect_pct) / attributionEffectScale) * 50}%`,
                                  marginLeft:
                                    row.total_effect_pct >= 0
                                      ? "50%"
                                      : `${50 - (Math.abs(row.total_effect_pct) / attributionEffectScale) * 50}%`,
                                }}
                              />
                            </div>
                            <div className="performance-comparative-value">
                              {formatPct(row.total_effect_pct)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AnalyticsModule>
                  </div>
                ) : null}
                <div className="performance-effect-legend" aria-label="Attribution effect legend">
                  <span className="performance-effect-legend-item">
                    <i className="performance-effect-legend-swatch performance-effect-bar-allocation" />
                    Allocation
                  </span>
                  <span className="performance-effect-legend-item">
                    <i className="performance-effect-legend-swatch performance-effect-bar-selection" />
                    Selection
                  </span>
                  <span className="performance-effect-legend-item">
                    <i className="performance-effect-legend-swatch performance-effect-bar-interaction" />
                    Interaction
                  </span>
                </div>
                {hasAttribution ? (
                  attributionLevels.map((level) => (
                    <div
                      key={`${level.dimension}-${level.total_effect_pct}`}
                      className="performance-detail-block"
                    >
                      <div className="performance-level-heading">
                        <strong>{formatLabel(level.dimension)}</strong>
                      </div>
                      <AnalyticsEffectStrip
                        rows={level.rows.map((row) => ({
                          key: `effect-${level.dimension}-${row.key_label}`,
                          label: row.key_label,
                          allocationPct: row.allocation_pct,
                          selectionPct: row.selection_pct,
                          interactionPct: row.interaction_pct,
                          totalPct: formatPct(row.total_effect_pct),
                        }))}
                      />
                      <AnalyticsTable
                        ariaLabel={`${formatLabel(level.dimension)} attribution table`}
                        columns={[
                          { key: "bucket", label: "Bucket" },
                          { key: "portWt", label: "Port Wt", align: "right" },
                          { key: "bmkWt", label: "Bmk Wt", align: "right" },
                          { key: "portRet", label: "Port Return", align: "right" },
                          { key: "bmkRet", label: "Bmk Return", align: "right" },
                          { key: "allocation", label: "Allocation", align: "right" },
                          { key: "selection", label: "Selection", align: "right" },
                          { key: "interaction", label: "Interaction", align: "right" },
                          { key: "total", label: "Total Effect", align: "right" },
                        ]}
                        rows={level.rows.map((row) => ({
                          key: `${level.dimension}-${row.key_label}`,
                          cells: [
                            row.key_label,
                            formatPct(row.portfolio_weight_avg_pct),
                            formatPct(row.benchmark_weight_avg_pct),
                            formatPct(row.portfolio_return_pct),
                            formatPct(row.benchmark_return_pct),
                            formatPct(row.allocation_pct),
                            formatPct(row.selection_pct),
                            formatPct(row.interaction_pct),
                            formatPct(row.total_effect_pct),
                          ],
                        }))}
                        footer={[
                          "Total",
                          formatPct(getAttributionTotals(level).portfolioWeightAvgPct),
                          formatPct(getAttributionTotals(level).benchmarkWeightAvgPct),
                          formatPct(getAttributionTotals(level).portfolioReturnPct),
                          formatPct(getAttributionTotals(level).benchmarkReturnPct),
                          formatPct(
                            level.allocation_total_pct ?? getAttributionTotals(level).allocationPct
                          ),
                          formatPct(
                            level.selection_total_pct ?? getAttributionTotals(level).selectionPct
                          ),
                          formatPct(
                            level.interaction_total_pct ??
                              getAttributionTotals(level).interactionPct
                          ),
                          formatPct(
                            getAttributionTotals(level).totalEffectPct ?? level.total_effect_pct
                          ),
                        ]}
                      />
                    </div>
                  ))
                ) : isDetailsPending ? (
                  <p className="muted">
                    Loading attribution effects and benchmark-relative decomposition.
                  </p>
                ) : (
                  <p className="muted">Attribution detail is not available for the current selection.</p>
                )}
              </Panel>

              <Panel id="performance-drivers" className="performance-detail-panel-wide">
                <div className="performance-section-heading">
                  <h3>Contribution Detail</h3>
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <Typography component="label" sx={inlineControlLabelSx}>
                      Segment
                    </Typography>
                    <Select
                      aria-label="Contribution Segment"
                      value={contributionDimension}
                      onChange={(event) =>
                        onRequestChange?.({
                          contributionDimension: event.target.value,
                        })
                      }
                      disabled={isUpdating}
                    >
                      {CONTRIBUTION_DIMENSION_OPTIONS.map((option) => (
                        <MenuItem key={option} value={option}>
                          {formatLabel(option)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
                {hasContribution ? (
                  contributionLevels.map((level) => (
                    (() => {
                      const showLocalFxColumns = shouldShowContributionLocalFx(level, workspace);
                      return (
                        <div key={`${level.level}-${level.name}`} className="performance-detail-block">
                          <div className="performance-level-heading">
                            <strong>{formatLabel(level.name)}</strong>
                          </div>
                          <AnalyticsTable
                            ariaLabel={`${formatLabel(level.name)} contribution table`}
                            columns={[
                              { key: "bucket", label: "Bucket" },
                              { key: "contribution", label: "Contribution", align: "right" },
                              { key: "weight", label: "Avg. Weight", align: "right" },
                              { key: "return", label: "Return", align: "right" },
                              ...(showLocalFxColumns
                                ? [
                                    { key: "local", label: "Local", align: "right" as const },
                                    { key: "fx", label: "FX", align: "right" as const },
                                  ]
                                : []),
                            ]}
                            rows={level.rows.map((row) => ({
                              key: `${level.name}-${row.key_label}`,
                              cells: [
                                row.key_label,
                                formatPct(row.contribution_pct),
                                formatPct(row.weight_avg_pct),
                                formatPct(row.total_return_pct),
                                ...(showLocalFxColumns
                                  ? [
                                      formatPct(row.local_contribution_pct),
                                      formatPct(row.fx_contribution_pct),
                                    ]
                                  : []),
                              ],
                            }))}
                            footer={[
                              "Total",
                              formatPct(
                                getContributionTotals(workspace, level)?.portfolioContributionPct ??
                                  level.total_contribution_pct
                              ),
                              formatPct(
                                level.total_weight_avg_pct ??
                                  getContributionTotals(workspace, level)?.weightAvgPct ??
                                  null
                              ),
                              formatPct(
                                level.total_portfolio_return_pct ??
                                  workspace.contribution?.total_portfolio_return_pct ??
                                  null
                              ),
                              ...(showLocalFxColumns
                                ? [
                                    formatPct(
                                      getContributionTotals(workspace, level)
                                        ?.localContributionPct ?? null
                                    ),
                                    formatPct(
                                      getContributionTotals(workspace, level)?.fxContributionPct ??
                                        null
                                    ),
                                  ]
                                : []),
                            ]}
                          />
                        </div>
                      );
                    })()
                  ))
                ) : isDetailsPending ? (
                  <p className="muted">
                    Loading contribution detail for the selected segment and horizon.
                  </p>
                ) : (
                  <p className="muted">Contribution detail is not available for the current selection.</p>
                )}
              </Panel>
            </WorkspaceGrid>
          </>
        )}
      </WorkspaceMain>

    </WorkspaceLayout>
  );
}

function shouldShowContributionLocalFx(
  level: NonNullable<WorkbenchPerformanceWorkspace["contribution"]>["levels"][number],
  workspace: WorkbenchPerformanceWorkspace
): boolean {
  if (
    workspace.contribution?.portfolio_local_contribution_pct !== null &&
    workspace.contribution?.portfolio_local_contribution_pct !== undefined
  ) {
    return true;
  }
  if (
    workspace.contribution?.portfolio_fx_contribution_pct !== null &&
    workspace.contribution?.portfolio_fx_contribution_pct !== undefined
  ) {
    return true;
  }
  return level.rows.some(
    (row) => row.local_contribution_pct != null || row.fx_contribution_pct != null
  );
}

function getBenchmarkLabel(
  workspace: WorkbenchPerformanceWorkspace,
  benchmarkCode?: string
): string | null {
  if (!benchmarkCode) {
    return null;
  }
  return (
    workspace.benchmark_options?.find((option) => option.benchmark_code === benchmarkCode)
      ?.benchmark_name ??
    formatLabel(benchmarkCode)
  );
}

function getContributionTotals(
  workspace: WorkbenchPerformanceWorkspace,
  level: NonNullable<WorkbenchPerformanceWorkspace["contribution"]>["levels"][number]
): {
  portfolioContributionPct: number | null;
  weightAvgPct: number | null;
  localContributionPct: number | null;
  fxContributionPct: number | null;
} | null {
  if (!workspace.contribution) {
    return null;
  }
  return {
    portfolioContributionPct: workspace.contribution.portfolio_contribution_pct,
    weightAvgPct: level.rows.reduce((sum, row) => sum + (row.weight_avg_pct ?? 0), 0),
    localContributionPct: workspace.contribution.portfolio_local_contribution_pct,
    fxContributionPct: workspace.contribution.portfolio_fx_contribution_pct,
  };
}

function getAttributionTotals(
  level: NonNullable<WorkbenchPerformanceWorkspace["attribution"]>["levels"][number]
): {
  portfolioWeightAvgPct: number | null;
  benchmarkWeightAvgPct: number | null;
  portfolioReturnPct: number | null;
  benchmarkReturnPct: number | null;
  allocationPct: number;
  selectionPct: number;
  interactionPct: number;
  totalEffectPct: number | null;
} {
  const rows = level.rows;
  return {
    portfolioWeightAvgPct: sumOptional(rows.map((row) => row.portfolio_weight_avg_pct)),
    benchmarkWeightAvgPct: sumOptional(rows.map((row) => row.benchmark_weight_avg_pct)),
    portfolioReturnPct: null,
    benchmarkReturnPct: null,
    allocationPct: rows.reduce((sum, row) => sum + row.allocation_pct, 0),
    selectionPct: rows.reduce((sum, row) => sum + row.selection_pct, 0),
    interactionPct: rows.reduce((sum, row) => sum + row.interaction_pct, 0),
    totalEffectPct: level.total_effect_pct ?? rows.reduce((sum, row) => sum + row.total_effect_pct, 0),
  };
}

function sumOptional(values: Array<number | null | undefined>): number | null {
  const numericValues = values.filter((value): value is number => value != null);
  if (!numericValues.length) {
    return null;
  }
  return numericValues.reduce((sum, value) => sum + value, 0);
}

const summaryLabelSx = {
  display: "block",
  mb: 1,
  fontSize: "0.6875rem",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "text.secondary",
} as const;

const inlineControlLabelSx = {
  display: "block",
  mb: 0.5,
  fontSize: "0.6875rem",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "text.secondary",
} as const;
