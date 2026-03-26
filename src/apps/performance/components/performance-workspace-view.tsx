import {
  MetricRow,
  Panel,
  SectionLabel,
  StatusChip,
  WorkspaceGrid,
  WorkspaceLayout,
  WorkspaceMain,
  WorkspaceSide,
} from "@/design-system";
import type { WorkbenchPerformanceWorkspace } from "@/features/workbench/types";

import { formatCompactPct, formatCurrency, formatDate, formatLabel, formatPct } from "../formatters";
import {
  getCoverageLabel,
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
import PerformanceControlStrip from "./performance-control-strip";
import PerformanceRail from "./performance-rail";

function contributionCoverageTone(coverage: number | null | undefined): "default" | "warn" | "success" {
  if (coverage === null || coverage === undefined) {
    return "default";
  }
  if (coverage >= 98) {
    return "success";
  }
  if (coverage >= 90) {
    return "warn";
  }
  return "default";
}

export default function PerformanceWorkspaceView({
  portfolios,
  selectedPortfolioId,
  workspace,
  period,
  detailBasis,
  detailDimension,
  benchmark,
}: {
  portfolios: Array<{ id: string; label: string }>;
  selectedPortfolioId: string | null;
  workspace: WorkbenchPerformanceWorkspace | null;
  period: string;
  detailBasis: string;
  detailDimension: string;
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
  const benchmarkUnavailable =
    Boolean(selectedBenchmarkCode) &&
    !hasBenchmark &&
    workspace?.warnings.some((warning) => warning.includes("PERFORMANCE_UNAVAILABLE") || warning.includes("ATTRIBUTION_UNAVAILABLE"));

  return (
    <WorkspaceLayout className="performance-layout">
      <PerformanceRail
        portfolios={portfolios}
        selectedPortfolioId={selectedPortfolioId}
        period={period}
        detailBasis={detailBasis}
        detailDimension={detailDimension}
        benchmark={benchmark}
      />

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
            <PerformanceControlStrip
              selectedPortfolioId={selectedPortfolioId}
              period={period}
              detailBasis={detailBasis}
              detailDimension={detailDimension}
              benchmark={benchmark}
            />

            {benchmarkUnavailable ? (
              <Panel className="warn-banner performance-benchmark-banner">
                <strong>{selectedBenchmarkCode}</strong> is selected, but no benchmark composition window is available for this mandate in the current seeded environment.
              </Panel>
            ) : null}

            <Panel className="performance-command-strip">
              <a href="#performance-overview" className="performance-command-link">Overview</a>
              <a href="#performance-trend" className="performance-command-link">Trend</a>
              <a href="#performance-drivers" className="performance-command-link">Drivers</a>
              <a href={hasAttribution ? "#performance-attribution" : "#performance-measurement"} className="performance-command-link">
                {hasAttribution ? "Attribution" : "Measurement"}
              </a>
            </Panel>

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
                  <StatusChip tone={contributionCoverageTone(workspace.contribution?.coverage_mv_pct)}>
                    {getCoverageLabel(workspace)}
                  </StatusChip>
                  {hasHistory ? <StatusChip>{workspace.net_chart.length} observations</StatusChip> : <StatusChip>Limited history</StatusChip>}
                  {hasBenchmark ? <StatusChip>Relative measurement</StatusChip> : <StatusChip>{selectedBenchmarkCode ? "Benchmark unavailable" : "No benchmark assigned"}</StatusChip>}
                  {workspace.partial_failures.length ? <StatusChip tone="warn">Partial service degradation</StatusChip> : null}
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

            <WorkspaceGrid className="performance-summary-grid">
              <Panel>
                <h3>{hasBenchmark ? "Net Relative Return" : "Net Return"}</h3>
                <MetricRow
                  label="Portfolio"
                  value={formatPct(workspace.net_performance.portfolio_return_pct)}
                />
                {hasBenchmark ? (
                  <MetricRow
                    label="Benchmark"
                    value={formatPct(workspace.net_performance.benchmark_return_pct)}
                  />
                ) : null}
                {hasBenchmark ? (
                  <MetricRow
                    label="Active"
                    value={formatPct(workspace.net_performance.active_return_pct)}
                  />
                ) : null}
                <MetricRow
                  label="Annualized"
                  value={formatPct(workspace.net_performance.annualized_return_pct)}
                />
              </Panel>

              {hasDistinctGross ? (
                <Panel>
                  <h3>{hasBenchmark ? "Gross Relative Return" : "Gross Return"}</h3>
                  <MetricRow
                    label="Portfolio"
                    value={formatPct(workspace.gross_performance.portfolio_return_pct)}
                  />
                  {hasBenchmark ? (
                    <MetricRow
                      label="Benchmark"
                      value={formatPct(workspace.gross_performance.benchmark_return_pct)}
                    />
                  ) : null}
                  {hasBenchmark ? (
                    <MetricRow
                      label="Active"
                      value={formatPct(workspace.gross_performance.active_return_pct)}
                    />
                  ) : null}
                  <MetricRow
                    label="Annualized"
                    value={formatPct(workspace.gross_performance.annualized_return_pct)}
                  />
                </Panel>
              ) : (
                <Panel>
                  <h3>Net / Gross Alignment</h3>
                  <MetricRow
                    label="Difference"
                    value={formatPct(
                      (workspace.gross_performance.portfolio_return_pct ?? 0) -
                        (workspace.net_performance.portfolio_return_pct ?? 0)
                    )}
                  />
                  <MetricRow label="Interpretation" value="No material fee drag in the selected window" />
                  <MetricRow label="Gross Basis" value={workspace.gross_performance.metric_basis} />
                  <MetricRow label="Net Basis" value={workspace.net_performance.metric_basis} />
                </Panel>
              )}

              <Panel>
                <h3>Contribution</h3>
                <MetricRow
                  label="Portfolio"
                  value={formatPct(workspace.contribution?.portfolio_contribution_pct)}
                />
                <MetricRow
                  label="Total Return"
                  value={formatPct(workspace.contribution?.total_portfolio_return_pct)}
                />
                <MetricRow
                  label="Coverage"
                  value={formatPct(workspace.contribution?.coverage_mv_pct)}
                />
                <MetricRow
                  label="Weighting"
                  value={workspace.contribution?.weighting_scheme ?? "N/A"}
                />
              </Panel>

              <Panel>
                <h3>Attribution</h3>
                {hasAttribution ? (
                  <>
                    <MetricRow
                      label="Active"
                      value={formatPct(workspace.attribution?.active_return_pct)}
                    />
                    <MetricRow
                      label="Effects"
                      value={formatPct(workspace.attribution?.sum_of_effects_pct)}
                    />
                    <MetricRow
                      label="Residual"
                      value={formatPct(workspace.attribution?.residual_pct)}
                    />
                    <MetricRow
                      label="Model"
                      value={workspace.attribution?.model ?? "N/A"}
                    />
                  </>
                ) : (
                  <p className="muted performance-unavailable-copy">
                    Attribution is available when benchmark-linked measurement is present.
                  </p>
                )}
              </Panel>
            </WorkspaceGrid>

            <WorkspaceGrid className="performance-chart-grid">
              <PerformanceChartPanel
                title="Net Return Path"
                points={workspace.net_chart}
                tone="net"
                id="performance-trend"
              />
              {hasDistinctGross ? (
                <PerformanceChartPanel
                  title="Gross Return Path"
                  points={workspace.gross_chart}
                  tone="gross"
                />
              ) : (
                <Panel id="performance-measurement" className="performance-measurement-panel">
                  <div className="performance-section-heading">
                    <h3>Measurement Notes</h3>
                    <span>{workspace.period}</span>
                  </div>
                  <div className="performance-note-list">
                    <div className="performance-note-item">
                      <strong>Benchmark</strong>
                      <span>
                        {hasBenchmark
                          ? workspace.benchmark_code ??
                            workspace.net_performance.benchmark_id ??
                            workspace.gross_performance.benchmark_id ??
                            workspace.attribution?.benchmark_id
                          : "No benchmark assigned"}
                      </span>
                    </div>
                    <div className="performance-note-item">
                      <strong>Attribution</strong>
                      <span>
                        {hasAttribution
                          ? "Attribution effects available below"
                          : "Benchmark-linked attribution is not available for this mandate"}
                      </span>
                    </div>
                    <div className="performance-note-item">
                      <strong>Cash-flow Return</strong>
                      <span>
                        {suspiciousMoneyWeighted
                          ? "Money-weighted return is distorted by the current cash-flow window"
                          : `${workspace.money_weighted_return?.method ?? "Return"} calculated successfully`}
                      </span>
                    </div>
                    <div className="performance-note-item">
                      <strong>Driver</strong>
                      <span>
                        {primaryDriver
                          ? `${formatLabel(primaryDriver.key_label)} contributes ${formatPct(primaryDriver.contribution_pct)}`
                          : "Contribution detail not available"}
                      </span>
                    </div>
                  </div>
                </Panel>
              )}
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

      <WorkspaceSide className="performance-side">
        {workspace ? (
          <>
            <Panel className="portfolio-side-card">
              <h3>Measurement</h3>
              <MetricRow label="As of" value={formatDate(workspace.as_of_date)} />
              <MetricRow
                label="Benchmark"
                value={
                  workspace.benchmark_code ??
                  workspace.net_performance.benchmark_id ??
                  workspace.gross_performance.benchmark_id ??
                  workspace.attribution?.benchmark_id ??
                  "Not assigned"
                }
              />
              <MetricRow label="Breakdown" value={formatLabel(workspace.detail_dimension)} />
              <MetricRow label="Basis" value={workspace.detail_basis} />
              <MetricRow label="Cash Weight" value={formatPct(workspace.overview.cash_weight_pct)} />
            </Panel>

            <Panel className="portfolio-side-card">
              <h3>Money-Weighted Return</h3>
              <MetricRow
                label="Return"
                value={formatPct(workspace.money_weighted_return?.money_weighted_return_pct)}
              />
              <MetricRow
                label="Annualized"
                value={formatPct(workspace.money_weighted_return?.annualized_return_pct)}
              />
              <MetricRow label="Method" value={workspace.money_weighted_return?.method ?? "N/A"} />
              <MetricRow
                label="Window Start"
                value={formatDate(workspace.money_weighted_return?.start_date)}
              />
              <MetricRow
                label="Window End"
                value={formatDate(workspace.money_weighted_return?.end_date)}
              />
            </Panel>

            <Panel className="portfolio-side-card">
              <h3>Coverage</h3>
              <div className="portfolio-warning-list">
                <StatusChip tone={contributionCoverageTone(workspace.contribution?.coverage_mv_pct)}>
                  {getCoverageLabel(workspace)}
                </StatusChip>
                <StatusChip>
                  Positions {workspace.overview.position_count}
                </StatusChip>
                {hasBenchmark ? <StatusChip>Benchmark-linked</StatusChip> : <StatusChip>No benchmark</StatusChip>}
              </div>
            </Panel>

            {workspace.partial_failures.length ? (
              <Panel className="portfolio-side-card">
                <h3>Exceptions</h3>
                <div className="portfolio-guidance-list">
                  {workspace.partial_failures.map((failure) => (
                    <div
                      key={`${failure.source_service}-${failure.error_code}`}
                      className="portfolio-guidance-item"
                    >
                      <strong>{failure.source_service}</strong>
                      <span className="portfolio-evidence-meta">{failure.error_code}</span>
                      <p className="portfolio-evidence-copy">{failure.detail}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}
          </>
        ) : null}
      </WorkspaceSide>
    </WorkspaceLayout>
  );
}
