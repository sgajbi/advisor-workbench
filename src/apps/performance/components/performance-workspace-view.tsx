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
import PerformanceChartPanel from "./performance-chart-panel";
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
}: {
  portfolios: Array<{ id: string; label: string }>;
  selectedPortfolioId: string | null;
  workspace: WorkbenchPerformanceWorkspace | null;
  period: string;
  detailBasis: string;
  detailDimension: string;
}) {
  const hasBenchmark = Boolean(
    workspace?.benchmark_code ||
      workspace?.net_performance.benchmark_id ||
      workspace?.gross_performance.benchmark_id ||
      workspace?.attribution?.benchmark_id ||
      workspace?.net_performance.benchmark_return_pct !== null ||
      workspace?.gross_performance.benchmark_return_pct !== null
  );
  const contributionLevels = workspace?.contribution?.levels ?? [];
  const attributionLevels = workspace?.attribution?.levels ?? [];
  const hasAttribution = attributionLevels.length > 0;
  const hasContribution = contributionLevels.length > 0;

  return (
    <WorkspaceLayout>
      <PerformanceRail
        portfolios={portfolios}
        selectedPortfolioId={selectedPortfolioId}
        period={period}
        detailBasis={detailBasis}
        detailDimension={detailDimension}
      />

      <WorkspaceMain>
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
              </div>
              <div className="performance-hero-metrics">
                <div className="performance-kpi">
                  <span>Net</span>
                  <strong>{formatPct(workspace.net_performance.portfolio_return_pct)}</strong>
                  <small>Active {formatCompactPct(workspace.net_performance.active_return_pct)}</small>
                </div>
                <div className="performance-kpi">
                  <span>Gross</span>
                  <strong>{formatPct(workspace.gross_performance.portfolio_return_pct)}</strong>
                  <small>Active {formatCompactPct(workspace.gross_performance.active_return_pct)}</small>
                </div>
                <div className="performance-kpi">
                  <span>Money-weighted</span>
                  <strong>{formatPct(workspace.money_weighted_return?.money_weighted_return_pct)}</strong>
                  <small>{workspace.money_weighted_return?.method ?? "Unavailable"}</small>
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
              <PerformanceChartPanel title="Net Return Path" points={workspace.net_chart} tone="net" />
              <PerformanceChartPanel
                title="Gross Return Path"
                points={workspace.gross_chart}
                tone="gross"
              />
            </WorkspaceGrid>

            <WorkspaceGrid className="performance-detail-grid">
              <Panel>
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

              <Panel>
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

      <WorkspaceSide>
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
                  Contribution {formatPct(workspace.contribution?.coverage_mv_pct)}
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
