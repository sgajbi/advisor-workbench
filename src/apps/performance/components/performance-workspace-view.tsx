import {
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
  getActiveWeightRows,
  getBottomPositionContributionRows,
  getBottomContributionRows,
  getTopPositionContributionRows,
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
  const topPositionContributors = workspace ? getTopPositionContributionRows(workspace) : [];
  const bottomPositionContributors = workspace ? getBottomPositionContributionRows(workspace) : [];
  const topContributors = workspace ? getTopContributionRows(workspace) : [];
  const bottomContributors = workspace ? getBottomContributionRows(workspace) : [];
  const activeWeightRows = workspace ? getActiveWeightRows(workspace) : [];
  const topAttributionEffectRows = workspace ? getTopAttributionEffectRows(workspace) : [];
  const contributorScale = Math.max(
    0.01,
    ...(hasPositionRanking ? topPositionContributors : topContributors).map((row) =>
      Math.abs(row.contribution_pct)
    ),
    ...(hasPositionRanking ? bottomPositionContributors : bottomContributors).map((row) =>
      Math.abs(row.contribution_pct)
    )
  );
  const selectedBenchmarkCode = workspace?.benchmark_code ?? benchmark ?? undefined;
  const selectedBenchmarkLabel = workspace
    ? getBenchmarkLabel(workspace, selectedBenchmarkCode)
    : undefined;
  const selectedPerformance =
    workspace && detailBasis === "GROSS" ? workspace.gross_performance : workspace?.net_performance;
  const activeWeightScale = Math.max(
    0.01,
    ...activeWeightRows.map((row) => Math.abs(row.active_weight_pct))
  );
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
              <div className="performance-summary-stage-header">
                <div className="performance-hero-title">
                  <h2>{workspace.portfolio.portfolio_id}</h2>
                  <div className="performance-observation-strip">
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
                  </div>
                </div>
                <div className="performance-summary-stage-context">
                  <div className="performance-context-block">
                    <span>Benchmark</span>
                    <strong>{selectedBenchmarkLabel ?? "Unassigned"}</strong>
                  </div>
                  <div className="performance-context-block">
                    <span>Primary Contributor</span>
                    <strong>{primaryDriver ? formatLabel(primaryDriver.key_label) : "N/A"}</strong>
                  </div>
                </div>
              </div>

              <div className="performance-summary-grid">
                <div className="performance-summary-card performance-summary-card-primary">
                  <span>{detailBasis === "GROSS" ? "Gross Return" : "Net Return"}</span>
                  <strong>{formatPct(selectedPerformance?.portfolio_return_pct ?? null)}</strong>
                  <p>
                    {hasBenchmark
                      ? `Active ${formatCompactPct(selectedPerformance?.active_return_pct ?? null)} versus benchmark`
                      : "Absolute performance for the selected mandate and horizon"}
                  </p>
                </div>

                <div className="performance-summary-card">
                  <span>Benchmark Comparison</span>
                  <div className="performance-summary-metrics">
                    <div>
                      <label>Portfolio</label>
                      <strong>{formatPct(selectedPerformance?.portfolio_return_pct ?? null)}</strong>
                    </div>
                    <div>
                      <label>Benchmark</label>
                      <strong>{formatPct(selectedPerformance?.benchmark_return_pct ?? null)}</strong>
                    </div>
                    <div>
                      <label>Active</label>
                      <strong>{formatPct(selectedPerformance?.active_return_pct ?? null)}</strong>
                    </div>
                    <div>
                      <label>Annualized</label>
                      <strong>{formatPct(selectedPerformance?.annualized_return_pct ?? null)}</strong>
                    </div>
                  </div>
                </div>

                <div className="performance-summary-card">
                  <span>Economic Context</span>
                  <div className="performance-summary-metrics">
                    <div>
                      <label>Start MV</label>
                      <strong>
                        {formatCurrency(
                          selectedPerformance?.begin_market_value ?? null,
                          workspace.portfolio.base_currency
                        )}
                      </strong>
                    </div>
                    <div>
                      <label>End MV</label>
                      <strong>
                        {formatCurrency(
                          selectedPerformance?.end_market_value ?? workspace.overview.market_value_base,
                          workspace.portfolio.base_currency
                        )}
                      </strong>
                    </div>
                    <div>
                      <label>Net Cash Flow</label>
                      <strong>
                        {formatCurrency(
                          selectedPerformance?.net_cash_flow ?? null,
                          workspace.portfolio.base_currency
                        )}
                      </strong>
                    </div>
                    <div>
                      <label>Cash Weight</label>
                      <strong>{formatPct(workspace.overview.cash_weight_pct)}</strong>
                    </div>
                  </div>
                </div>

                <div className="performance-summary-card">
                  <span>Mandate Context</span>
                  <div className="performance-summary-metrics">
                    <div>
                      <label>Money-Weighted</label>
                      <strong>
                        {workspace.money_weighted_return
                          ? formatPct(workspace.money_weighted_return.money_weighted_return_pct)
                          : "N/A"}
                      </strong>
                    </div>
                    <div>
                      <label>Position Count</label>
                      <strong>{workspace.overview.position_count}</strong>
                    </div>
                    <div>
                      <label>Market Value</label>
                      <strong>
                        {formatCurrency(
                          workspace.overview.market_value_base,
                          workspace.portfolio.base_currency
                        )}
                      </strong>
                    </div>
                    <div>
                      <label>Basis</label>
                      <strong>{detailBasis}</strong>
                    </div>
                  </div>
                  {hasMoneyWeightedReturn ? (
                    <p className="performance-summary-footnote">
                      {workspace.money_weighted_return?.annualized_return_pct != null
                        ? `MWR annualized ${formatCompactPct(
                            workspace.money_weighted_return.annualized_return_pct
                          )}`
                        : workspace.money_weighted_return?.method ?? "MWR"}
                      {suspiciousMoneyWeightedReturn ? " • review cash-flow timing" : ""}
                    </p>
                  ) : null}
                </div>
              </div>
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
              <Panel className="performance-contributors-panel performance-detail-panel-compact">
                <div className="performance-section-heading">
                  <h3>Top / Bottom Contributors</h3>
                  <span>{workspace.period}</span>
                </div>
                {hasContribution ? (
                  hasPositionRanking ? (
                    <div className="performance-contributors-grid">
                      <div>
                        <div className="performance-ranked-heading">
                          <strong>Highest</strong>
                          <span>Contribution</span>
                        </div>
                        <div className="performance-ranked-list">
                          {topPositionContributors.map((row) => (
                            <div
                              key={`top-position-${row.position_id}`}
                              className="performance-ranked-row"
                            >
                              <div className="performance-ranked-meta">
                                <strong>{row.position_id}</strong>
                                <span>Avg. Weight {formatPct(row.weight_avg_pct)}</span>
                              </div>
                              <div className="performance-ranked-bar-track">
                                <div
                                  className="performance-ranked-bar performance-ranked-bar-positive"
                                  style={{
                                    width: `${(Math.abs(row.contribution_pct) / contributorScale) * 100}%`,
                                  }}
                                />
                              </div>
                              <div className="performance-ranked-value">
                                {formatPct(row.contribution_pct)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="performance-ranked-heading">
                          <strong>Lowest</strong>
                          <span>Contribution</span>
                        </div>
                        <div className="performance-ranked-list">
                          {bottomPositionContributors.map((row) => (
                            <div
                              key={`bottom-position-${row.position_id}`}
                              className="performance-ranked-row"
                            >
                              <div className="performance-ranked-meta">
                                <strong>{row.position_id}</strong>
                                <span>Avg. Weight {formatPct(row.weight_avg_pct)}</span>
                              </div>
                              <div className="performance-ranked-bar-track">
                                <div
                                  className="performance-ranked-bar performance-ranked-bar-negative"
                                  style={{
                                    width: `${(Math.abs(row.contribution_pct) / contributorScale) * 100}%`,
                                  }}
                                />
                              </div>
                              <div className="performance-ranked-value">
                                {formatPct(row.contribution_pct)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
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
              </Panel>

              <Panel id="performance-attribution" className="performance-detail-panel-compact">
                <div className="performance-section-heading">
                  <h3>Attribution Detail</h3>
                  <div className="performance-section-heading-meta">
                    <label className="performance-inline-select">
                      <span>Segment</span>
                      <select
                        aria-label="Attribution Segment"
                        value={attributionDimension}
                        onChange={(event) =>
                          onRequestChange?.({
                            attributionDimension: event.currentTarget.value,
                          })
                        }
                        disabled={isUpdating}
                      >
                        {ATTRIBUTION_DIMENSION_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {formatLabel(option)}
                          </option>
                        ))}
                      </select>
                    </label>
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
                    <div className="performance-mini-module">
                      <div className="performance-mini-module-header">
                        <strong>Active Weights</strong>
                        <span>Portfolio minus benchmark</span>
                      </div>
                      <div className="performance-comparative-list">
                        {activeWeightRows.map((row) => (
                          <div
                            key={`active-weight-${row.key_label}`}
                            className="performance-comparative-row"
                          >
                            <div className="performance-comparative-meta">
                              <strong>{formatLabel(row.key_label)}</strong>
                              <span>
                                Port {formatPct(row.portfolio_weight_avg_pct)} / Bmk{" "}
                                {formatPct(row.benchmark_weight_avg_pct)}
                              </span>
                            </div>
                            <div className="performance-comparative-bar-track">
                              <div className="performance-comparative-bar-axis" />
                              <div
                                className={`performance-comparative-bar ${
                                  row.active_weight_pct >= 0
                                    ? "performance-comparative-bar-positive"
                                    : "performance-comparative-bar-negative"
                                }`}
                                style={{
                                  width: `${(Math.abs(row.active_weight_pct) / activeWeightScale) * 50}%`,
                                  marginLeft:
                                    row.active_weight_pct >= 0
                                      ? "50%"
                                      : `${50 - (Math.abs(row.active_weight_pct) / activeWeightScale) * 50}%`,
                                }}
                              />
                            </div>
                            <div className="performance-comparative-value">
                              {formatPct(row.active_weight_pct)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="performance-mini-module">
                      <div className="performance-mini-module-header">
                        <strong>Total Effect Ranking</strong>
                        <span>Largest benchmark-relative effects</span>
                      </div>
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
                    </div>
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
                      <div className="performance-effect-strip">
                        {level.rows.map((row) => (
                          <div key={`effect-${level.dimension}-${row.key_label}`} className="performance-effect-row">
                            <div className="performance-effect-label">{row.key_label}</div>
                            <div className="performance-effect-bars">
                              <div
                                className="performance-effect-bar performance-effect-bar-allocation"
                                style={{ width: `${Math.min(Math.abs(row.allocation_pct) * 18, 100)}%` }}
                              />
                              <div
                                className="performance-effect-bar performance-effect-bar-selection"
                                style={{ width: `${Math.min(Math.abs(row.selection_pct) * 18, 100)}%` }}
                              />
                              <div
                                className="performance-effect-bar performance-effect-bar-interaction"
                                style={{ width: `${Math.min(Math.abs(row.interaction_pct) * 18, 100)}%` }}
                              />
                            </div>
                            <div className="performance-effect-total">
                              {formatPct(row.total_effect_pct)}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="table-wrap">
                        <table className="position-table">
                          <thead>
                            <tr>
                              <th align="left">Bucket</th>
                              <th align="right">Port Wt</th>
                              <th align="right">Bmk Wt</th>
                              <th align="right">Port Return</th>
                              <th align="right">Bmk Return</th>
                              <th align="right">Allocation</th>
                              <th align="right">Selection</th>
                              <th align="right">Interaction</th>
                              <th align="right">Total Effect</th>
                            </tr>
                          </thead>
                          <tbody>
                            {level.rows.map((row) => (
                              <tr key={`${level.dimension}-${row.key_label}`}>
                                <td>{row.key_label}</td>
                                <td align="right">
                                  {formatPct(row.portfolio_weight_avg_pct)}
                                </td>
                                <td align="right">
                                  {formatPct(row.benchmark_weight_avg_pct)}
                                </td>
                                <td align="right">{formatPct(row.portfolio_return_pct)}</td>
                                <td align="right">{formatPct(row.benchmark_return_pct)}</td>
                                <td align="right">{formatPct(row.allocation_pct)}</td>
                                <td align="right">{formatPct(row.selection_pct)}</td>
                                <td align="right">{formatPct(row.interaction_pct)}</td>
                                <td align="right">{formatPct(row.total_effect_pct)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td>Total</td>
                              <td align="right">
                                {formatPct(getAttributionTotals(level).portfolioWeightAvgPct)}
                              </td>
                              <td align="right">
                                {formatPct(getAttributionTotals(level).benchmarkWeightAvgPct)}
                              </td>
                              <td align="right">
                                {formatPct(getAttributionTotals(level).portfolioReturnPct)}
                              </td>
                              <td align="right">
                                {formatPct(getAttributionTotals(level).benchmarkReturnPct)}
                              </td>
                              <td align="right">
                                {formatPct(
                                  level.allocation_total_pct ??
                                    getAttributionTotals(level).allocationPct
                                )}
                              </td>
                              <td align="right">
                                {formatPct(
                                  level.selection_total_pct ??
                                    getAttributionTotals(level).selectionPct
                                )}
                              </td>
                              <td align="right">
                                {formatPct(
                                  level.interaction_total_pct ??
                                    getAttributionTotals(level).interactionPct
                                )}
                              </td>
                              <td align="right">
                                {formatPct(
                                  getAttributionTotals(level).totalEffectPct ??
                                    level.total_effect_pct
                                )}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
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
                  <label className="performance-inline-select">
                    <span>Segment</span>
                    <select
                      aria-label="Contribution Segment"
                      value={contributionDimension}
                      onChange={(event) =>
                        onRequestChange?.({
                          contributionDimension: event.currentTarget.value,
                        })
                      }
                      disabled={isUpdating}
                    >
                      {CONTRIBUTION_DIMENSION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {formatLabel(option)}
                        </option>
                      ))}
                    </select>
                  </label>
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
                          <div className="table-wrap">
                            <table className="position-table">
                              <thead>
                                <tr>
                                  <th align="left">Bucket</th>
                                  <th align="right">Contribution</th>
                                  <th align="right">Avg. Weight</th>
                                  <th align="right">Return</th>
                                  {showLocalFxColumns ? <th align="right">Local</th> : null}
                                  {showLocalFxColumns ? <th align="right">FX</th> : null}
                                </tr>
                              </thead>
                              <tbody>
                                {level.rows.map((row) => (
                                  <tr key={`${level.name}-${row.key_label}`}>
                                    <td>{row.key_label}</td>
                                    <td align="right">{formatPct(row.contribution_pct)}</td>
                                    <td align="right">{formatPct(row.weight_avg_pct)}</td>
                                    <td align="right">{formatPct(row.total_return_pct)}</td>
                                    {showLocalFxColumns ? (
                                      <td align="right">{formatPct(row.local_contribution_pct)}</td>
                                    ) : null}
                                    {showLocalFxColumns ? (
                                      <td align="right">{formatPct(row.fx_contribution_pct)}</td>
                                    ) : null}
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td>Total</td>
                                  <td align="right">
                                    {formatPct(
                                      getContributionTotals(workspace, level)
                                        ?.portfolioContributionPct ??
                                        level.total_contribution_pct
                                    )}
                                  </td>
                                  <td align="right">
                                    {formatPct(
                                      level.total_weight_avg_pct ??
                                        getContributionTotals(workspace, level)?.weightAvgPct ??
                                        null
                                    )}
                                  </td>
                                  <td align="right">
                                    {formatPct(
                                      level.total_portfolio_return_pct ??
                                        workspace.contribution?.total_portfolio_return_pct ??
                                        null
                                    )}
                                  </td>
                                  {showLocalFxColumns ? (
                                    <td align="right">
                                      {formatPct(
                                        getContributionTotals(workspace, level)
                                          ?.localContributionPct ?? null
                                      )}
                                    </td>
                                  ) : null}
                                  {showLocalFxColumns ? (
                                    <td align="right">
                                      {formatPct(
                                        getContributionTotals(workspace, level)
                                          ?.fxContributionPct ?? null
                                      )}
                                    </td>
                                  ) : null}
                                </tr>
                              </tfoot>
                            </table>
                          </div>
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
