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
  getBottomPositionContributionRows,
  getBottomContributionRows,
  getTopPositionContributionRows,
  getPrimaryContributionRow,
  getTopContributionRows,
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
}) {
  const hasBenchmark = workspace ? hasBenchmarkContext(workspace) : false;
  const contributionLevels = workspace?.contribution?.levels ?? [];
  const attributionLevels = workspace?.attribution?.levels ?? [];
  const hasAttribution = workspace ? hasUsableAttribution(workspace) : false;
  const hasContribution = workspace ? hasUsableContribution(workspace) : false;
  const hasHistory = workspace ? hasMeaningfulHistory(workspace.net_chart) : false;
  const primaryDriver = workspace ? getPrimaryContributionRow(workspace) : null;
  const hasPositionRanking = workspace ? hasPositionContributionRanking(workspace) : false;
  const topPositionContributors = workspace ? getTopPositionContributionRows(workspace) : [];
  const bottomPositionContributors = workspace ? getBottomPositionContributionRows(workspace) : [];
  const topContributors = workspace ? getTopContributionRows(workspace) : [];
  const bottomContributors = workspace ? getBottomContributionRows(workspace) : [];
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
            <Panel className="performance-hero">
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
                reportStartDate={workspace.report_start_date}
                reportEndDate={workspace.report_end_date}
                onRequestChange={onRequestChange ?? (() => undefined)}
                isUpdating={isUpdating}
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
                ) : (
                  <p className="muted">Contributor ranking is not available for the current selection.</p>
                )}
              </Panel>

              <Panel id="performance-drivers">
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
                                      getContributionTotals(workspace, level)?.weightAvgPct ??
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
                ) : (
                  <p className="muted">Contribution detail is not available for the current selection.</p>
                )}
              </Panel>

              <Panel id="performance-attribution">
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
                          <tfoot>
                            <tr>
                              <td>Total</td>
                              <td align="right">
                                {formatPct(getAttributionTotals(level).allocationPct)}
                              </td>
                              <td align="right">
                                {formatPct(getAttributionTotals(level).selectionPct)}
                              </td>
                              <td align="right">
                                {formatPct(getAttributionTotals(level).interactionPct)}
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
  allocationPct: number;
  selectionPct: number;
  interactionPct: number;
  totalEffectPct: number | null;
} {
  const rows = level.rows;
  return {
    allocationPct: rows.reduce((sum, row) => sum + row.allocation_pct, 0),
    selectionPct: rows.reduce((sum, row) => sum + row.selection_pct, 0),
    interactionPct: rows.reduce((sum, row) => sum + row.interaction_pct, 0),
    totalEffectPct: level.total_effect_pct ?? rows.reduce((sum, row) => sum + row.total_effect_pct, 0),
  };
}
