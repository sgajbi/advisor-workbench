import {
  ActionLink,
  DegradedStatePanel,
  MetricRow,
  Panel,
  SectionLabel,
  StatusChip,
  WorkspaceGrid,
  WorkspaceLayout,
  WorkspaceMain,
  WorkspaceSide,
} from "@/design-system";

import { formatBooleanFlag, formatCurrency, formatDate, formatPct, formatQuantity } from "../formatters";
import type { PortfolioWorkspace } from "../types";
import {
  getCoverageWarningLabel,
  getEvidenceServiceLabel,
  getWorkflowActionLabel,
  getWorkflowTaskLabel,
  mapWorkflowHref,
  WORKFLOW_DISPLAY_ORDER,
} from "../workspace-config";
import PortfolioRail from "./portfolio-rail";

export default function PortfolioWorkspaceView({
  portfolios,
  selectedPortfolioId,
  workspace,
}: {
  portfolios: Array<{
    portfolio_id: string;
    display_name: string;
    base_currency: string;
    client_id: string | null;
    booking_center_code: string | null;
  }>;
  selectedPortfolioId: string | null;
  workspace: PortfolioWorkspace | null;
}) {
  const orderedWorkflowCues = workspace
    ? [...workspace.workflow_cues].sort((left, right) => {
        const leftOrder = WORKFLOW_DISPLAY_ORDER.indexOf(
          left.key as (typeof WORKFLOW_DISPLAY_ORDER)[number]
        );
        const rightOrder = WORKFLOW_DISPLAY_ORDER.indexOf(
          right.key as (typeof WORKFLOW_DISPLAY_ORDER)[number]
        );
        return (leftOrder === -1 ? Number.MAX_SAFE_INTEGER : leftOrder) -
          (rightOrder === -1 ? Number.MAX_SAFE_INTEGER : rightOrder);
      })
    : [];

  return (
    <WorkspaceLayout>
      <PortfolioRail portfolios={portfolios} selectedPortfolioId={selectedPortfolioId} />

      <WorkspaceMain>
        {!workspace ? (
          <DegradedStatePanel
            title="Portfolio context unavailable"
            status="Workspace unavailable"
            actions={[
              { href: "/performance", label: "Open Performance" },
              { href: "/recommendations", label: "Open Recommendations" },
            ]}
          >
            <p className="error-text">We could not load the selected portfolio briefing.</p>
          </DegradedStatePanel>
        ) : (
          <>
            <Panel className="portfolio-hero">
              <div>
                <SectionLabel>Portfolio Summary</SectionLabel>
                <h2>{workspace.portfolio.display_name}</h2>
                <div className="page-meta-strip">
                  <StatusChip>{workspace.portfolio.portfolio_id}</StatusChip>
                  {workspace.portfolio.client_id ? (
                    <StatusChip>{workspace.portfolio.client_id}</StatusChip>
                  ) : null}
                  {workspace.portfolio.booking_center_code ? (
                    <StatusChip>{workspace.portfolio.booking_center_code}</StatusChip>
                  ) : null}
                </div>
              </div>
              <div className="portfolio-hero-actions">
                {orderedWorkflowCues.map((cue) => (
                  <ActionLink
                    key={cue.key}
                    href={mapWorkflowHref(cue.key, workspace.portfolio.portfolio_id)}
                  >
                    {getWorkflowActionLabel(cue.key)}
                  </ActionLink>
                ))}
              </div>
            </Panel>

            <WorkspaceGrid>
              <Panel>
                <h3>Mandate</h3>
                <MetricRow label="Status" value={workspace.profile.status ?? "N/A"} />
                <MetricRow label="Portfolio type" value={workspace.profile.portfolio_type ?? "N/A"} />
                <MetricRow label="Risk profile" value={workspace.profile.risk_exposure ?? "N/A"} />
                <MetricRow
                  label="Investment horizon"
                  value={workspace.profile.investment_time_horizon ?? "N/A"}
                />
                <MetricRow label="Objective" value={workspace.profile.objective ?? "N/A"} />
                <MetricRow
                  label="Leverage allowed"
                  value={formatBooleanFlag(workspace.profile.is_leverage_allowed)}
                />
              </Panel>

              <Panel>
                <h3>Performance Review</h3>
                <MetricRow label="Performance period" value={workspace.performance?.period ?? "N/A"} />
                <MetricRow
                  label="Portfolio return"
                  value={formatPct(workspace.performance?.return_pct)}
                />
                <MetricRow label="Monitoring status" value={workspace.rebalance?.status ?? "N/A"} />
                <MetricRow
                  label="Last review timestamp"
                  value={workspace.rebalance?.last_run_at_utc ?? "N/A"}
                />
                <MetricRow
                  label="Review reference"
                  value={workspace.rebalance?.last_rebalance_run_id ?? "N/A"}
                />
              </Panel>

              <Panel>
                <h3>Cash and Liquidity</h3>
                <MetricRow
                  label="Cash balance"
                  value={formatCurrency(
                    workspace.summary.total_cash_base,
                    workspace.portfolio.base_currency
                  )}
                />
                <MetricRow
                  label="Cash weight"
                  value={formatPct(workspace.summary.cash_weight_pct)}
                />
                <MetricRow
                  label="Projected net cashflow"
                  value={formatCurrency(
                    workspace.cashflow_outlook?.total_net_cashflow_base,
                    workspace.portfolio.base_currency
                  )}
                />
                <MetricRow
                  label="Projection horizon"
                  value={
                    workspace.cashflow_outlook
                      ? `${workspace.cashflow_outlook.projection_days} days`
                      : "N/A"
                  }
                />
                <MetricRow label="Base currency" value={workspace.portfolio.base_currency} />
                <MetricRow
                  label="Booking center"
                  value={workspace.portfolio.booking_center_code ?? "N/A"}
                />
              </Panel>
            </WorkspaceGrid>

            {workspace.warnings.length ? (
              <Panel className="warn-banner">
                <h3>Coverage Notes</h3>
                <div className="portfolio-warning-list">
                  {workspace.warnings.map((warning) => (
                    <StatusChip key={warning} tone="warn">
                      {getCoverageWarningLabel(warning)}
                    </StatusChip>
                  ))}
                </div>
              </Panel>
            ) : null}

            <WorkspaceGrid>
              <Panel>
                <h3>Positions</h3>
                {workspace.positions.length ? (
                  <div className="table-wrap">
                    <table className="position-table">
                      <thead>
                        <tr>
                          <th align="left">Instrument</th>
                          <th align="left">Asset Class</th>
                          <th align="right">Quantity</th>
                          <th align="right">Cost</th>
                          <th align="right">Market Value</th>
                          <th align="right">Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workspace.positions.map((position) => (
                          <tr key={position.security_id}>
                            <td>{position.instrument_name}</td>
                            <td>{position.asset_class ?? "N/A"}</td>
                            <td align="right">{formatQuantity(position.quantity)}</td>
                            <td align="right">
                              {formatCurrency(
                                position.cost_basis_base,
                                workspace.portfolio.base_currency
                              )}
                            </td>
                            <td align="right">
                              {formatCurrency(
                                position.market_value_base,
                                workspace.portfolio.base_currency
                              )}
                            </td>
                            <td align="right">{formatPct(position.weight_pct)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">Position detail is not available yet for this portfolio.</p>
                )}
              </Panel>

              <Panel>
                <h3>Recent Transactions</h3>
                {workspace.recent_transactions.length ? (
                  <div className="table-wrap">
                    <table className="position-table">
                      <thead>
                        <tr>
                          <th align="left">Date</th>
                          <th align="left">Type</th>
                          <th align="left">Instrument</th>
                          <th align="right">Quantity</th>
                          <th align="right">Gross</th>
                          <th align="right">Net Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workspace.recent_transactions.map((transaction) => (
                          <tr key={transaction.transaction_id}>
                            <td>{formatDate(transaction.transaction_date)}</td>
                            <td>{transaction.transaction_type}</td>
                            <td>{transaction.instrument_id}</td>
                            <td align="right">{formatQuantity(transaction.quantity)}</td>
                            <td align="right">
                              {formatCurrency(
                                transaction.gross_amount,
                                transaction.currency ?? workspace.portfolio.base_currency
                              )}
                            </td>
                            <td align="right">
                              {formatCurrency(
                                transaction.net_cost_base,
                                workspace.portfolio.base_currency
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">Recent transactions are not available right now.</p>
                )}
              </Panel>
            </WorkspaceGrid>

            <WorkspaceGrid>
              <Panel>
                <h3>Allocation Shape</h3>
                {workspace.allocations.length ? (
                  <div className="table-wrap">
                    <table className="position-table">
                      <thead>
                        <tr>
                          <th align="left">Asset Class</th>
                          <th align="right">Positions</th>
                          <th align="right">Market Value</th>
                          <th align="right">Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workspace.allocations.map((bucket) => (
                          <tr key={bucket.asset_class}>
                            <td>{bucket.asset_class}</td>
                            <td align="right">{bucket.position_count}</td>
                            <td align="right">
                              {formatCurrency(
                                bucket.market_value_base,
                                workspace.portfolio.base_currency
                              )}
                            </td>
                            <td align="right">{formatPct(bucket.weight_pct)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">Allocation data is not available yet for this portfolio.</p>
                )}
              </Panel>

              <Panel>
                <h3>Top Positions</h3>
                {workspace.top_positions.length ? (
                  <div className="table-wrap">
                    <table className="position-table">
                      <thead>
                        <tr>
                          <th align="left">Position</th>
                          <th align="left">Asset Class</th>
                          <th align="right">Quantity</th>
                          <th align="right">Market Value</th>
                          <th align="right">Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workspace.top_positions.map((position) => (
                          <tr key={position.security_id}>
                            <td>{position.instrument_name}</td>
                            <td>{position.asset_class ?? "N/A"}</td>
                            <td align="right">{formatQuantity(position.quantity)}</td>
                            <td align="right">
                              {formatCurrency(
                                position.market_value_base,
                                workspace.portfolio.base_currency
                              )}
                            </td>
                            <td align="right">{formatPct(position.weight_pct)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">Position detail is not available yet for this portfolio.</p>
                )}
              </Panel>
            </WorkspaceGrid>

            {workspace.cashflow_outlook ? (
              <Panel>
                <h3>Cashflow Outlook</h3>
                <div className="table-wrap">
                  <table className="position-table">
                    <thead>
                      <tr>
                        <th align="left">Date</th>
                        <th align="right">Net Cashflow</th>
                        <th align="right">Cumulative</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workspace.cashflow_outlook.upcoming_points.map((point) => (
                        <tr key={point.projection_date}>
                          <td>{formatDate(point.projection_date)}</td>
                          <td align="right">
                            {formatCurrency(
                              point.net_cashflow_base,
                              workspace.portfolio.base_currency
                            )}
                          </td>
                          <td align="right">
                            {formatCurrency(
                              point.projected_cumulative_cashflow_base,
                              workspace.portfolio.base_currency
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            ) : null}
          </>
        )}
      </WorkspaceMain>

      <WorkspaceSide>
        {workspace ? (
          <>
            <Panel className="portfolio-side-card">
              <h3>Portfolio Snapshot</h3>
              <MetricRow label="As of date" value={workspace.as_of_date} />
              <MetricRow label="Open date" value={formatDate(workspace.profile.open_date)} />
              <MetricRow
                label="Market value"
                value={formatCurrency(
                  workspace.summary.market_value_base,
                  workspace.portfolio.base_currency
                )}
              />
              <MetricRow
                label="Cash balance"
                value={formatCurrency(
                  workspace.summary.total_cash_base,
                  workspace.portfolio.base_currency
                )}
              />
              <MetricRow label="Positions" value={workspace.summary.position_count} />
            </Panel>

            <Panel className="portfolio-side-card">
              <h3>Review Readiness</h3>
              <MetricRow
                label="Holdings available"
                value={workspace.readiness.has_positions ? "Ready" : "Pending"}
              />
              <MetricRow label="Reporting state" value={workspace.readiness.reporting.status} />
              <MetricRow label="Report rows" value={workspace.readiness.reporting.row_count} />
              <MetricRow
                label="Reporting generated"
                value={workspace.readiness.reporting.generated_at_utc ?? "N/A"}
              />
              <MetricRow
                label="Cashflow horizon"
                value={workspace.cashflow_outlook?.range_end_date ?? "N/A"}
              />
            </Panel>

            {workspace.partial_failures.length ? (
              <Panel className="portfolio-side-card">
                <h3>Data Coverage</h3>
                <MetricRow label="Active exceptions" value={workspace.partial_failures.length} />
                <div className="portfolio-guidance-list">
                  {workspace.partial_failures.map((failure) => (
                    <div
                      key={`${failure.source_service}-${failure.error_code}`}
                      className="portfolio-guidance-item"
                    >
                      <strong>{getEvidenceServiceLabel(failure.source_service)}</strong>
                      <span className="portfolio-evidence-meta">{failure.error_code}</span>
                      <p className="portfolio-evidence-copy">{failure.detail}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}

            <Panel className="portfolio-side-card">
              <h3>Next Actions</h3>
              <div className="portfolio-guidance-list">
                {orderedWorkflowCues.map((cue) => (
                  <div key={cue.key} className="portfolio-guidance-item">
                    <strong>{getWorkflowTaskLabel(cue.key)}</strong>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        ) : (
          <Panel className="portfolio-side-card">
            <h3>Available Work Areas</h3>
            <div className="toolbar">
              <ActionLink href="/recommendations">Open Recommendations</ActionLink>
              <ActionLink href="/performance">Open Performance</ActionLink>
              <ActionLink href="/workbench">Open Operations</ActionLink>
            </div>
          </Panel>
        )}
      </WorkspaceSide>
    </WorkspaceLayout>
  );
}
