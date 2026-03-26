import {
  Panel,
  SectionLabel,
  StatusChip,
  WorkspaceGrid,
  WorkspaceLayout,
  WorkspaceMain,
} from "@/design-system";
import type { WorkbenchPerformanceWorkspace } from "@/features/workbench/types";

import { formatCompactPct, formatCurrency, formatDate, formatLabel, formatPct } from "../formatters";
import {
  getBottomContributionRows,
  getPrimaryContributionRow,
  getTopContributionRows,
  hasBenchmarkContext,
  hasDistinctGrossPerformance,
  hasMeaningfulHistory,
  hasUsableAttribution,
  hasUsableContribution,
  isMoneyWeightedReturnSuspicious,
} from "../view-model";
import PerformanceChartPanel from "./performance-chart-panel";

export default function PerformanceWorkspaceView({
  workspace,
  period,
  detailBasis,
  detailDimension,
  chartFrequency,
  benchmark,
}: {
  workspace: WorkbenchPerformanceWorkspace | null;
  period: string;
  detailBasis: string;
  detailDimension: string;
  chartFrequency: string;
  benchmark?: string;
}) {
  const hasBenchmark = workspace ? hasBenchmarkContext(workspace) : false;
  const contributionLevels = workspace?.contribution?.levels ?? [];
  const attributionLevels = workspace?.attribution?.levels ?? [];
  const hasAttribution = workspace ? hasUsableAttribution(workspace) : false;
  const hasContribution = workspace ? hasUsableContribution(workspace) : false;
  const hasDistinctGross = workspace ? hasDistinctGrossPerformance(workspace) : false;
  const hasHistory = workspace ? hasMeaningfulHistory(workspace.net_chart) : false;
  const primaryDriver = workspace ? getPrimaryContributionRow(workspace) : null;
  const topContributors = workspace ? getTopContributionRows(workspace) : [];
  const bottomContributors = workspace ? getBottomContributionRows(workspace) : [];
  const contributorScale = Math.max(
    0.01,
    ...topContributors.map((row) => Math.abs(row.contribution_pct)),
    ...bottomContributors.map((row) => Math.abs(row.contribution_pct))
  );
  const suspiciousMoneyWeighted = workspace ? isMoneyWeightedReturnSuspicious(workspace) : false;
  const selectedBenchmarkCode = workspace?.benchmark_code ?? benchmark ?? undefined;

  return (
    <WorkspaceLayout className="performance-layout">
      <WorkspaceMain className="performance-main">
        {!workspace ? (
          <Panel className="degraded-state-panel">
            <SectionLabel>Performance</SectionLabel>
            <h2>Performance data unavailable</h2>
            <p className="error-text">
              The selected portfolio could not be loaded from the performance workspace contract.
            </p>
          </Panel>
        ) : (
          <>
            <Panel className="performance-hero">
              <div className="performance-hero-title">
                <SectionLabel>Portfolio Performance</SectionLabel>
                <h2>{workspace.portfolio.portfolio_id}</h2>
                <div className="performance-meta-grid">
                  <div className="performance-meta-item">
                    <span>As of</span>
                    <strong>{formatDate(workspace.as_of_date)}</strong>
                  </div>
                  <div className="performance-meta-item">
                    <span>Period</span>
                    <strong>{workspace.period}</strong>
                  </div>
                  <div className="performance-meta-item">
                    <span>Basis</span>
                    <strong>{workspace.detail_basis}</strong>
                  </div>
                  <div className="performance-meta-item">
                    <span>Breakdown</span>
                    <strong>{formatLabel(workspace.detail_dimension)}</strong>
                  </div>
                  <div className="performance-meta-item">
                    <span>Frequency</span>
                    <strong>{formatLabel(workspace.chart_frequency)}</strong>
                  </div>
                  {hasBenchmark ? (
                    <div className="performance-meta-item">
                      <span>Benchmark</span>
                      <strong>
                        {workspace.benchmark_code ??
                          workspace.net_performance.benchmark_id ??
                          workspace.gross_performance.benchmark_id ??
                          workspace.attribution?.benchmark_id}
                      </strong>
                    </div>
                  ) : null}
                </div>
                <div className="performance-observation-strip">
                  {hasHistory ? <StatusChip>{workspace.net_chart.length} observations</StatusChip> : <StatusChip>Limited history</StatusChip>}
                  {hasBenchmark ? <StatusChip>Relative measurement</StatusChip> : <StatusChip>{selectedBenchmarkCode ? "Benchmark unavailable" : "No benchmark assigned"}</StatusChip>}
                </div>
              </div>
              <div className="performance-hero-metrics">
                <div className="performance-kpi">
                  <span>Net</span>
                  <strong>{formatPct(workspace.net_performance.portfolio_return_pct)}</strong>
                  <small>
                    {hasBenchmark
                      ? `Active ${formatCompactPct(workspace.net_performance.active_return_pct)}`
                      : `Period ${workspace.period}`}
                  </small>
                </div>
                <div className="performance-kpi">
                  <span>Gross</span>
                  <strong>{formatPct(workspace.gross_performance.portfolio_return_pct)}</strong>
                  <small>
                    {hasDistinctGross
                      ? `Fees impact ${formatCompactPct(
                          (workspace.gross_performance.portfolio_return_pct ?? 0) -
                            (workspace.net_performance.portfolio_return_pct ?? 0)
                        )}`
                      : "Aligned with net"}
                  </small>
                </div>
                <div className="performance-kpi">
                  <span>Money-weighted</span>
                  <strong>{formatPct(workspace.money_weighted_return?.money_weighted_return_pct)}</strong>
                  <small>
                    {suspiciousMoneyWeighted
                      ? "Review cash-flow window"
                      : workspace.money_weighted_return?.method ?? "Unavailable"}
                  </small>
                </div>
                <div className="performance-kpi">
                  <span>Market Value</span>
                  <strong>
                    {formatCurrency(
                      workspace.overview.market_value_base,
                      workspace.portfolio.base_currency
                    )}
                  </strong>
                  <small>As of {formatDate(workspace.as_of_date)}</small>
                </div>
              </div>
            </Panel>

            <Panel id="performance-overview" className="performance-overview-band">
              <div className="performance-overview-band-primary">
                <span className="performance-overview-band-label">Net Return</span>
                <div className="performance-overview-band-value">
                  {formatPct(workspace.net_performance.portfolio_return_pct)}
                </div>
                <p className="performance-overview-band-copy">
                  {hasBenchmark
                    ? `Active ${formatCompactPct(workspace.net_performance.active_return_pct)} versus assigned benchmark`
                    : "Absolute performance for the selected mandate and horizon"}
                </p>
              </div>

              <div className="performance-overview-band-stats">
                <div className="performance-overview-stat">
                  <span>Gross</span>
                  <strong>{formatPct(workspace.gross_performance.portfolio_return_pct)}</strong>
                </div>
                <div className="performance-overview-stat">
                  <span>Market Value</span>
                  <strong>
                    {formatCurrency(workspace.overview.market_value_base, workspace.portfolio.base_currency)}
                  </strong>
                </div>
                <div className="performance-overview-stat">
                  <span>Cash Weight</span>
                  <strong>{formatPct(workspace.overview.cash_weight_pct)}</strong>
                </div>
                <div className="performance-overview-stat">
                  <span>Primary Driver</span>
                  <strong>{primaryDriver ? formatLabel(primaryDriver.key_label) : "N/A"}</strong>
                </div>
                <div className="performance-overview-stat">
                  <span>Benchmark</span>
                  <strong>{hasBenchmark ? "Assigned" : "Not assigned"}</strong>
                </div>
                <div className="performance-overview-stat">
                  <span>Attribution</span>
                  <strong>{hasAttribution ? "Available" : "Unavailable"}</strong>
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
                detailDimension={detailDimension}
                chartFrequency={chartFrequency}
                benchmark={benchmark}
                id="performance-trend"
              />
            </WorkspaceGrid>

            <WorkspaceGrid className="performance-detail-grid">
              <Panel className="performance-contributors-panel">
                <div className="performance-section-heading">
                  <h3>Top / Bottom Contributors</h3>
                  <span>{workspace.period}</span>
                </div>
                {hasContribution ? (
                  <div className="performance-contributors-grid">
                    <div>
                      <div className="performance-ranked-heading">
                        <strong>Highest</strong>
                        <span>Contribution</span>
                      </div>
                      <div className="performance-ranked-list">
                        {topContributors.map((row) => (
                          <div key={`top-${row.key_label}`} className="performance-ranked-row">
                            <div className="performance-ranked-meta">
                              <strong>{row.key_label}</strong>
                              <span>Avg. Weight {formatPct(row.weight_avg_pct)}</span>
                            </div>
                            <div className="performance-ranked-bar-track">
                              <div
                                className="performance-ranked-bar performance-ranked-bar-positive"
                                style={{ width: `${(Math.abs(row.contribution_pct) / contributorScale) * 100}%` }}
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
                        {bottomContributors.map((row) => (
                          <div key={`bottom-${row.key_label}`} className="performance-ranked-row">
                            <div className="performance-ranked-meta">
                              <strong>{row.key_label}</strong>
                              <span>Avg. Weight {formatPct(row.weight_avg_pct)}</span>
                            </div>
                            <div className="performance-ranked-bar-track">
                              <div
                                className="performance-ranked-bar performance-ranked-bar-negative"
                                style={{ width: `${(Math.abs(row.contribution_pct) / contributorScale) * 100}%` }}
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
                  <p className="muted">Contributor ranking is not available for the current selection.</p>
                )}
              </Panel>

              <Panel id="performance-drivers">
                <div className="performance-section-heading">
                  <h3>Contribution Detail</h3>
                  <span>{formatLabel(workspace.detail_dimension)}</span>
                </div>
                {hasContribution ? (
                  contributionLevels.map((level) => (
                    <div key={`${level.level}-${level.name}`} className="performance-detail-block">
                      <div className="performance-level-heading">
                        <strong>{formatLabel(level.name)}</strong>
                        <span>{formatPct(level.total_contribution_pct)}</span>
                      </div>
                      <div className="table-wrap">
                        <table className="position-table">
                          <thead>
                            <tr>
                              <th align="left">Bucket</th>
                              <th align="right">Contribution</th>
                              <th align="right">Avg. Weight</th>
                              <th align="right">Local</th>
                              <th align="right">FX</th>
                            </tr>
                          </thead>
                          <tbody>
                            {level.rows.map((row) => (
                              <tr key={`${level.name}-${row.key_label}`}>
                                <td>{row.key_label}</td>
                                <td align="right">{formatPct(row.contribution_pct)}</td>
                                <td align="right">{formatPct(row.weight_avg_pct)}</td>
                                <td align="right">{formatPct(row.local_contribution_pct)}</td>
                                <td align="right">{formatPct(row.fx_contribution_pct)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">Contribution detail is not available for the current selection.</p>
                )}
              </Panel>

              <Panel id="performance-attribution">
                <div className="performance-section-heading">
                  <h3>Attribution Detail</h3>
                  <span>{formatLabel(workspace.detail_dimension)}</span>
                </div>
                {hasAttribution ? (
                  attributionLevels.map((level) => (
                    <div
                      key={`${level.dimension}-${level.total_effect_pct}`}
                      className="performance-detail-block"
                    >
                      <div className="performance-level-heading">
                        <strong>{formatLabel(level.dimension)}</strong>
                        <span>{formatPct(level.total_effect_pct)}</span>
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
                                <td align="right">{formatPct(row.allocation_pct)}</td>
                                <td align="right">{formatPct(row.selection_pct)}</td>
                                <td align="right">{formatPct(row.interaction_pct)}</td>
                                <td align="right">{formatPct(row.total_effect_pct)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">Attribution detail is not available for the current selection.</p>
                )}
              </Panel>
            </WorkspaceGrid>
          </>
        )}
      </WorkspaceMain>

    </WorkspaceLayout>
  );
}
