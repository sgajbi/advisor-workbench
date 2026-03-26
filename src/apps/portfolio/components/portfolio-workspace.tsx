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

import { formatCurrency, formatPct } from "../formatters";
import type { PortfolioWorkspace } from "../types";
import { getWorkflowActionLabel, mapWorkflowHref } from "../workspace-config";
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
                {workspace.workflow_cues.map((cue) => (
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
                      {warning}
                    </StatusChip>
                  ))}
                </div>
              </Panel>
            ) : null}

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
            </WorkspaceGrid>
          </>
        )}
      </WorkspaceMain>

      <WorkspaceSide>
        {workspace ? (
          <>
            <Panel className="portfolio-side-card">
              <h3>Portfolio Snapshot</h3>
              <MetricRow label="As of date" value={workspace.as_of_date} />
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
            </Panel>

            <Panel className="portfolio-side-card">
              <h3>Next Actions</h3>
              <div className="portfolio-guidance-list">
                <div className="portfolio-guidance-item">
                  <strong>Review performance</strong>
                </div>
                <div className="portfolio-guidance-item">
                  <strong>Review suitability</strong>
                </div>
                <div className="portfolio-guidance-item">
                  <strong>Prepare recommendation</strong>
                </div>
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
