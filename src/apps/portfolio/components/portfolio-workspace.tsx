import {
  ActionLink,
  AnalyticsModule,
  AnalyticsStat,
  AnalyticsTable,
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

import {
  formatBooleanFlag,
  formatCurrency,
  formatDate,
  formatPct,
  formatQuantity,
} from "../formatters";
import type { PortfolioPositionView, PortfolioTransactionView, PortfolioWorkspace } from "../types";
import {
  getCoverageWarningLabel,
  getEvidenceServiceLabel,
} from "../workspace-config";
import type { PortfolioWorkspaceContext } from "../view-model";
import {
  buildPortfolioReadinessIndicators,
  buildPortfolioWorkflowActions,
  getActivityDisplayCurrency,
  getBookReadinessStatus,
  getBookReadinessSupport,
  getBookReadinessTone,
  getIncomeDisplayCurrency,
  getInvestedAssetWeight,
  getNetFlowTone,
  getOrderedWorkflowCues,
  getReadinessTone,
  getRequestedWindowActivityAmount,
  getRequestedWindowActivityCount,
  getYearToDateActivityAmount,
  getYearToDateActivityCount,
} from "../view-model";
import PortfolioAllocationPanel from "./portfolio-allocation-panel";
import PortfolioRail from "./portfolio-rail";

export default function PortfolioWorkspaceView({
  portfolios,
  selectedPortfolioId,
  workspace,
  context,
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
  context: PortfolioWorkspaceContext;
}) {
  const orderedWorkflowCues = workspace ? getOrderedWorkflowCues(workspace) : [];
  const setupActions = workspace?.workflow_actions ?? (workspace ? buildPortfolioWorkflowActions(workspace) : []);
  const primaryWorkflowCue = orderedWorkflowCues.find((cue) => cue.key === "performance") ?? orderedWorkflowCues[0];
  const readinessIndicators = workspace
    ? workspace.readiness_indicators ?? buildPortfolioReadinessIndicators(workspace, context.viewMode)
    : [];
  const isSummaryView = context.viewMode === "summary";
  const isDetailedView = context.viewMode === "detailed";
  const showAttentionOnly = context.focusExceptions && Boolean(workspace?.partial_failures.length);
  const showInsights = !showAttentionOnly;
  const showChanges = isDetailedView && !showAttentionOnly;
  const showDrilldown = isDetailedView && !showAttentionOnly;
  const showPortfolioContext = isDetailedView;
  const showReadinessDetailGroup = isDetailedView;
  const showLiquidityModule = isDetailedView;
  const showPerformanceSnapshot = isDetailedView;
  const showAllocationModule = Boolean(workspace?.allocation_views?.length) || !context.hideEmptyModules;
  const showTopHoldingsModule = Boolean(workspace?.top_positions.length) || !context.hideEmptyModules;
  const showIncomeModule = Boolean(workspace?.income_summary) || !context.hideEmptyModules;
  const showActivityModule = Boolean(workspace?.activity_summary) || !context.hideEmptyModules;
  const showChangeHighlights = isSummaryView && !showAttentionOnly && (showIncomeModule || showActivityModule);
  const showDetailedHoldings = Boolean(workspace?.positions.length) || !context.hideEmptyModules;
  const showDetailedTransactions = Boolean(workspace?.recent_transactions.length) || !context.hideEmptyModules;
  const showProjectedCashflow = Boolean(workspace?.cashflow_outlook) || !context.hideEmptyModules;
  const incomeDisplayCurrency = getIncomeDisplayCurrency(
    workspace?.income_summary,
    context.selectedReportingCurrency,
    workspace?.portfolio.base_currency ?? "USD"
  );
  const activityDisplayCurrency = getActivityDisplayCurrency(
    workspace?.activity_summary,
    context.selectedReportingCurrency,
    workspace?.portfolio.base_currency ?? "USD"
  );

  return (
    <WorkspaceLayout>
      <PortfolioRail portfolios={portfolios} selectedPortfolioId={selectedPortfolioId} />

      <WorkspaceMain>
        {!workspace ? (
          <DegradedStatePanel
            title="Portfolio context unavailable"
            status="Workspace unavailable"
            actions={[
              { href: "/performance", label: "Performance" },
              { href: "/recommendations", label: "Open Recommendations" },
            ]}
          >
            <p className="error-text">We could not load the selected portfolio briefing.</p>
          </DegradedStatePanel>
        ) : (
          <>
            <section id="portfolio-summary" className="portfolio-workspace-section">
            <Panel className="portfolio-hero portfolio-book-hero">
              <div className="portfolio-hero-content">
                <SectionLabel>Portfolio Book</SectionLabel>
                <h2>{workspace.portfolio.display_name}</h2>
                <p className="portfolio-section-copy">
                  Relationship, mandate, and book identity for rapid front-office orientation.
                </p>
                <div className="portfolio-hero-meta">
                  <span>{workspace.portfolio.base_currency}</span>
                  {workspace.portfolio.client_id ? <span>{workspace.portfolio.client_id}</span> : null}
                  {workspace.portfolio.booking_center_code ? (
                    <span>{workspace.portfolio.booking_center_code}</span>
                  ) : null}
                  {workspace.profile.status ? (
                    <StatusChip className="portfolio-hero-status">{workspace.profile.status}</StatusChip>
                  ) : null}
                </div>
              </div>
              <div className="portfolio-hero-actions portfolio-hero-toolbar">
                {orderedWorkflowCues.map((cue) => (
                  <ActionLink
                    key={cue.key}
                    href={cue.href}
                    className={
                      cue.key === primaryWorkflowCue?.key
                        ? "portfolio-action-link portfolio-action-link-primary"
                        : "portfolio-action-link portfolio-action-link-secondary"
                    }
                  >
                    {cue.label}
                  </ActionLink>
                ))}
              </div>
            </Panel>

            {showPortfolioContext ? (
            <Panel className="portfolio-header-context">
              <div className="portfolio-card-header">
                <h3 className="portfolio-side-card-title">Portfolio Context</h3>
                <p className="portfolio-card-subtitle">
                  Private-banking relationship, booking location, and mandate ownership.
                </p>
              </div>
              <div className="portfolio-header-context-grid">
                {renderDefinitionGroup([
                  { label: "Portfolio", value: workspace.portfolio.portfolio_id },
                  { label: "Client", value: workspace.portfolio.client_id ?? "N/A" },
                  {
                    label: "Booking Centre",
                    value: workspace.portfolio.booking_center_code ?? "N/A",
                  },
                ])}
                {renderDefinitionGroup([
                  { label: "Base Currency", value: workspace.portfolio.base_currency },
                  { label: "Relationship Manager", value: workspace.profile.advisor_id ?? "N/A" },
                  { label: "Opened", value: formatDate(workspace.profile.open_date) },
                ])}
              </div>
            </Panel>
            ) : null}

            <div className="portfolio-summary-band">
              <AnalyticsStat
                label="AUM"
                value={formatCurrency(
                  workspace.summary.market_value_base,
                  workspace.portfolio.base_currency
                )}
                definition="Total portfolio market value in the portfolio base currency as of the selected date."
                support={`As of ${formatDate(context.selectedAsOfDate)}`}
              />
              <AnalyticsStat
                label="Invested Assets"
                value={formatCurrency(
                  workspace.summary.invested_market_value_base,
                  workspace.portfolio.base_currency
                )}
                definition="Market value currently invested in funded holdings, excluding operational cash inventory."
                support={`${formatPct(getInvestedAssetWeight(workspace))} of AUM`}
              />
              <AnalyticsStat
                label="Available Cash"
                value={formatCurrency(
                  workspace.summary.total_cash_base,
                  workspace.portfolio.base_currency
                )}
                definition="Available cash inventory in the portfolio base currency across published cash balances."
                support={`${formatPct(workspace.summary.cash_weight_pct)} cash allocation`}
              />
              <AnalyticsStat
                label="Holdings"
                value={workspace.summary.position_count}
                definition="Number of currently valued holdings in the portfolio book."
                support={`${workspace.summary.position_count} holdings`}
              />
              <AnalyticsStat
                label="30D Net Flow"
                value={formatCurrency(
                  getRequestedWindowActivityAmount(workspace),
                  activityDisplayCurrency
                )}
                definition="Net booked portfolio activity across the requested 30-day reporting window, including funding, fees, and other ledger movements."
                support={`${getRequestedWindowActivityCount(workspace)} booked events`}
                valueTone={getNetFlowTone(workspace)}
              />
              <AnalyticsStat
                label="Book Readiness"
                value={getBookReadinessStatus(workspace)}
                definition="Operational readiness based on holdings coverage, reporting status, publish eligibility, and active blocking exceptions."
                support={getBookReadinessSupport(workspace)}
                valueTone={getBookReadinessTone(workspace)}
              />
            </div>

            <div className="portfolio-readiness-strip" aria-label="Portfolio readiness indicators">
              {readinessIndicators.map((indicator) => (
                <a
                  key={indicator.key}
                  href={indicator.href}
                  className="portfolio-readiness-indicator"
                >
                  <span className="portfolio-readiness-label">{indicator.label}</span>
                  <span
                    className={`portfolio-readiness-chip portfolio-readiness-chip-${getReadinessTone(indicator.status)}`}
                  >
                    {indicator.status}
                  </span>
                </a>
              ))}
            </div>

            <nav className="portfolio-workspace-nav" aria-label="Portfolio workspace sections">
              <a href="#portfolio-summary">1. What is this portfolio?</a>
              <a href="#portfolio-health">2. Is it healthy, investable, reportable?</a>
              {showChanges ? <a href="#portfolio-changes">3. What changed over time?</a> : null}
              <a href="#portfolio-attention">4. What needs attention?</a>
              {showDrilldown ? <a href="#portfolio-drilldown">5. Where can I drill down?</a> : null}
            </nav>
            </section>

            <section id="portfolio-health" className="portfolio-workspace-section">
              <div className="portfolio-section-header">
                <h3>Portfolio Health Snapshot</h3>
                <p className="portfolio-section-copy">
                  Assess investability, reporting readiness, and missing data in one glance.
                </p>
              </div>
              <WorkspaceGrid className="portfolio-primary-grid">
                {isDetailedView ? (
                  <AnalyticsModule
                    title="Mandate Overview"
                    subtitle="Mandate fit, risk posture, and strategic operating characteristics."
                  >
                    <div className="portfolio-mandate-grid">
                      <MetricRow label="Status" value={workspace.profile.status ?? "N/A"} />
                      <MetricRow
                        label="Portfolio type"
                        value={workspace.profile.portfolio_type ?? "N/A"}
                      />
                      <MetricRow
                        label="Risk profile"
                        value={workspace.profile.risk_exposure ?? "N/A"}
                      />
                      <MetricRow
                        label="Investment horizon"
                        value={workspace.profile.investment_time_horizon ?? "N/A"}
                      />
                      <MetricRow
                        label="Objective"
                        value={workspace.profile.objective ?? "N/A"}
                        className="portfolio-objective-row"
                      />
                      <MetricRow
                        label="Leverage allowed"
                        value={formatBooleanFlag(workspace.profile.is_leverage_allowed)}
                      />
                    </div>
                  </AnalyticsModule>
                ) : null}

                <AnalyticsModule
                  title="Health and Coverage"
                  subtitle="Readiness indicators, source coverage, and active exceptions."
                >
                  <div className="portfolio-mandate-grid">
                    <MetricRow
                      label="Holdings Coverage"
                      value={workspace.readiness.has_positions ? "Ready" : "Pending"}
                    />
                    <MetricRow
                      label="Reporting Status"
                      value={workspace.readiness.reporting.status}
                    />
                    <MetricRow
                      label="Publishing Allowed"
                      value={formatBooleanFlag(workspace.operations?.publish_allowed)}
                    />
                    <MetricRow
                      label="Exceptions"
                      value={workspace.partial_failures.length}
                    />
                  </div>
                  {workspace.warnings.length ? (
                    <div className="portfolio-warning-list">
                      {workspace.warnings.map((warning) => (
                        <StatusChip key={warning} tone="warn">
                          {getCoverageWarningLabel(warning)}
                        </StatusChip>
                      ))}
                    </div>
                  ) : null}
                </AnalyticsModule>
              </WorkspaceGrid>
            </section>

            {showInsights ? (
            <section className="portfolio-workspace-section">
              <div className="portfolio-section-header">
                <h3>Portfolio Insights</h3>
                <p className="portfolio-section-copy">
                  Understand current allocations, largest holdings, liquidity posture, and recent
                  economic activity before moving into operational detail.
                </p>
              </div>
              {showLiquidityModule || showPerformanceSnapshot ? (
                <WorkspaceGrid className="portfolio-primary-grid">
                  {showLiquidityModule ? (
                    <AnalyticsModule
                      title="Liquidity and Projected Cash"
                      subtitle="Current liquidity inventory and short-horizon projected cash movement."
                    >
                      <div className="portfolio-mandate-grid">
                        <MetricRow
                          label="Available Cash"
                          value={formatCurrency(
                            workspace.summary.total_cash_base,
                            workspace.portfolio.base_currency
                          )}
                        />
                        <MetricRow
                          label="Cash Allocation"
                          value={formatPct(workspace.summary.cash_weight_pct)}
                        />
                        <MetricRow
                          label="Projected Net Flow"
                          value={formatCurrency(
                            workspace.cashflow_outlook?.total_net_cashflow_base,
                            workspace.portfolio.base_currency
                          )}
                        />
                        <MetricRow
                          label="Forecast Horizon"
                          value={
                            workspace.cashflow_outlook
                              ? `${workspace.cashflow_outlook.projection_days} days`
                              : "N/A"
                          }
                        />
                      </div>
                    </AnalyticsModule>
                  ) : null}
                  {showPerformanceSnapshot ? (
                    <AnalyticsModule
                      title="Performance Snapshot"
                      subtitle="Most recent available performance context for the current book."
                    >
                      <div className="portfolio-mandate-grid">
                        <MetricRow label="Period" value={workspace.performance?.period ?? "N/A"} />
                        <MetricRow
                          label="Return"
                          value={formatPct(workspace.performance?.return_pct)}
                        />
                        <MetricRow
                          label="Reporting rows"
                          value={workspace.readiness.reporting.row_count}
                        />
                        <MetricRow
                          label="Rebalance status"
                          value={workspace.rebalance?.status ?? "N/A"}
                        />
                      </div>
                    </AnalyticsModule>
                  ) : null}
                </WorkspaceGrid>
              ) : null}
              <WorkspaceGrid className="portfolio-primary-grid">
                {showAllocationModule ? (
                <AnalyticsModule
                  title="Portfolio Allocation"
                  subtitle="Portfolio composition by core reporting dimensions."
                >
                {workspace.allocation_views?.length ? (
                  <PortfolioAllocationPanel
                    allocationViews={workspace.allocation_views}
                    baseCurrency={workspace.portfolio.base_currency}
                  />
                ) : (
                  <div className="portfolio-empty-state portfolio-empty-state-illustrated">
                    <div className="portfolio-empty-illustration" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                    <strong>No allocation data yet</strong>
                    <p className="muted">
                      Allocation becomes available once funded holdings are valued.
                    </p>
                    <p className="muted">
                      Book positions and publish prices to generate allocation views.
                    </p>
                  </div>
                )}
              </AnalyticsModule>
                ) : null}

                {showTopHoldingsModule ? (
                <AnalyticsModule
                  title="Top Holdings"
                  subtitle="Largest positions by current market value."
                >
                {workspace.top_positions.length ? (
                  <AnalyticsTable
                    ariaLabel="Top positions"
                    columns={[
                      { key: "instrument", label: "Instrument" },
                      { key: "assetClass", label: "Asset Class" },
                      { key: "quantity", label: "Quantity", align: "right" },
                      { key: "value", label: "Market Value", align: "right" },
                      { key: "weight", label: "Weight", align: "right" },
                    ]}
                    rows={workspace.top_positions.map((position) => ({
                      key: position.security_id,
                      cells: [
                        position.instrument_name,
                        position.asset_class ?? "N/A",
                        formatQuantity(position.quantity),
                        formatCurrency(
                          position.market_value_base,
                          workspace.portfolio.base_currency
                        ),
                        formatPct(position.weight_pct),
                      ],
                    }))}
                  />
                ) : (
                  <div className="portfolio-empty-state portfolio-empty-state-centered portfolio-empty-state-illustrated">
                    <div className="portfolio-empty-illustration" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                    <strong>No holdings yet</strong>
                    <p className="muted">
                      Holdings will appear once positions are funded and priced.
                    </p>
                    <p className="muted">
                      Add funding, book a trade, and publish pricing.
                    </p>
                  </div>
                )}
                </AnalyticsModule>
                ) : null}
              </WorkspaceGrid>
              {showChangeHighlights ? (
                <WorkspaceGrid className="portfolio-primary-grid">
                  {workspace.income_summary && showIncomeModule ? (
                    <AnalyticsModule
                      title="Income"
                      subtitle={`Key income totals in ${incomeDisplayCurrency} for ${context.timeWindow}.`}
                    >
                      <div className="portfolio-mandate-grid">
                        <MetricRow
                          label="Window net"
                          value={formatCurrency(
                            workspace.income_summary.totals_requested_window.net.reporting_currency_amount,
                            incomeDisplayCurrency
                          )}
                        />
                        <MetricRow
                          label="YTD net"
                          value={formatCurrency(
                            workspace.income_summary.totals_year_to_date.net.reporting_currency_amount,
                            incomeDisplayCurrency
                          )}
                        />
                        <MetricRow
                          label="Window gross"
                          value={formatCurrency(
                            workspace.income_summary.totals_requested_window.gross.reporting_currency_amount,
                            incomeDisplayCurrency
                          )}
                        />
                        <MetricRow
                          label="Transactions"
                          value={workspace.income_summary.totals_requested_window.net.transaction_count}
                        />
                      </div>
                    </AnalyticsModule>
                  ) : null}

                  {workspace.activity_summary && showActivityModule ? (
                    <AnalyticsModule
                      title="Activity"
                      subtitle={`Key booked activity in ${activityDisplayCurrency} for ${context.timeWindow}.`}
                    >
                      <div className="portfolio-mandate-grid">
                        <MetricRow
                          label="Window amount"
                          value={formatCurrency(
                            getRequestedWindowActivityAmount(workspace),
                            activityDisplayCurrency
                          )}
                        />
                        <MetricRow
                          label="YTD amount"
                          value={formatCurrency(
                            getYearToDateActivityAmount(workspace),
                            activityDisplayCurrency
                          )}
                        />
                        <MetricRow
                          label="Window transactions"
                          value={getRequestedWindowActivityCount(workspace)}
                        />
                        <MetricRow
                          label="YTD transactions"
                          value={getYearToDateActivityCount(workspace)}
                        />
                      </div>
                    </AnalyticsModule>
                  ) : null}
                </WorkspaceGrid>
              ) : null}
            </section>
            ) : null}

            {showChanges ? (
            <section id="portfolio-changes" className="portfolio-workspace-section">
              <div className="portfolio-section-header">
                <h3>What changed over time?</h3>
                <p className="portfolio-section-copy">
                  Review income, activity, and movement patterns for the selected {context.timeWindow}
                  {" "}window ending {formatDate(context.selectedAsOfDate)}.
                </p>
              </div>
            {showIncomeModule || showActivityModule ? (
              <WorkspaceGrid className="portfolio-primary-grid">
                {workspace.income_summary && showIncomeModule ? (
                  <AnalyticsModule
                    title="Income"
                    subtitle={`Shown in ${incomeDisplayCurrency} for ${context.timeWindow}. Source window ${formatDate(workspace.income_summary.window_start_date)} to ${formatDate(workspace.income_summary.window_end_date)}.`}
                  >
                    <AnalyticsTable
                      ariaLabel="Income summary"
                      columns={[
                        { key: "category", label: "Income Type" },
                        { key: "windowNet", label: "Window Net", align: "right" },
                        { key: "ytdNet", label: "YTD Net", align: "right" },
                        { key: "windowGross", label: "Window Gross", align: "right" },
                        { key: "txns", label: "Window Txns", align: "right" },
                      ]}
                      rows={[
                        {
                          key: "total",
                          cells: [
                            "Total",
                            formatCurrency(
                              workspace.income_summary.totals_requested_window.net.reporting_currency_amount,
                              incomeDisplayCurrency
                            ),
                            formatCurrency(
                              workspace.income_summary.totals_year_to_date.net.reporting_currency_amount,
                              incomeDisplayCurrency
                            ),
                            formatCurrency(
                              workspace.income_summary.totals_requested_window.gross.reporting_currency_amount,
                              incomeDisplayCurrency
                            ),
                            workspace.income_summary.totals_requested_window.net.transaction_count,
                          ],
                        },
                        ...workspace.income_summary.income_types.map((item) => ({
                          key: item.income_type,
                          cells: [
                            formatIncomeTypeLabel(item.income_type),
                            formatCurrency(
                              item.requested_window.net.reporting_currency_amount,
                              incomeDisplayCurrency
                            ),
                            formatCurrency(
                              item.year_to_date.net.reporting_currency_amount,
                              incomeDisplayCurrency
                            ),
                            formatCurrency(
                              item.requested_window.gross.reporting_currency_amount,
                              incomeDisplayCurrency
                            ),
                            item.requested_window.net.transaction_count,
                          ],
                        })),
                      ]}
                    />
                  </AnalyticsModule>
                ) : null}

                {workspace.activity_summary && showActivityModule ? (
                  <AnalyticsModule
                    title="Activity"
                    subtitle={`Shown in ${activityDisplayCurrency} for ${context.timeWindow}. Source window ${formatDate(workspace.activity_summary.window_start_date)} to ${formatDate(workspace.activity_summary.window_end_date)}.`}
                  >
                    <AnalyticsTable
                      ariaLabel="Activity summary"
                      columns={[
                        { key: "bucket", label: "Bucket" },
                        { key: "windowAmount", label: "Window Amount", align: "right" },
                        { key: "ytdAmount", label: "YTD Amount", align: "right" },
                        { key: "windowTxns", label: "Window Txns", align: "right" },
                        { key: "ytdTxns", label: "YTD Txns", align: "right" },
                      ]}
                      rows={workspace.activity_summary.buckets.map((bucket) => ({
                        key: bucket.bucket,
                        cells: [
                          formatActivityBucketLabel(bucket.bucket),
                          formatCurrency(
                            bucket.requested_window.reporting_currency_amount,
                            activityDisplayCurrency
                          ),
                          formatCurrency(
                            bucket.year_to_date.reporting_currency_amount,
                            activityDisplayCurrency
                          ),
                          bucket.requested_window.transaction_count,
                          bucket.year_to_date.transaction_count,
                        ],
                      }))}
                    />
                  </AnalyticsModule>
                ) : null}
              </WorkspaceGrid>
            ) : (
              <Panel>
                <div className="portfolio-empty-state">
                  <strong>Change history is not available yet.</strong>
                  <p className="muted">
                    Income and activity trends will appear once recent ledger events fall inside
                    the reporting window.
                  </p>
                </div>
              </Panel>
            )}
            </section>
            ) : null}

            <section id="portfolio-attention" className="portfolio-workspace-section">
              <div className="portfolio-section-header">
                <h3>What needs attention?</h3>
                <p className="portfolio-section-copy">
                  Use source exceptions and readiness gaps to determine what needs follow-up before
                  the portfolio is fully reportable.
                </p>
              </div>
            {workspace.partial_failures.length ? (
              <AnalyticsModule
                title="Data Coverage"
                subtitle="Source-level exceptions affecting reporting completeness."
              >
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
              </AnalyticsModule>
            ) : (
              <Panel>
                <div className="portfolio-empty-state">
                  <strong>No active exceptions require attention.</strong>
                  <p className="muted">
                    Coverage and reporting checks are currently clear for this portfolio.
                  </p>
                </div>
              </Panel>
            )}
            </section>

            {showDrilldown ? (
            <section id="portfolio-drilldown" className="portfolio-workspace-section">
              <div className="portfolio-section-header">
                <h3>Where can I drill down?</h3>
                <p className="portfolio-section-copy">
                  Open detailed holdings, ledger history, and projected liquidity only when you
                  need the deeper operational view.
                </p>
              </div>
              <div className="portfolio-disclosure-stack">
                {showDetailedHoldings ? (
                <details className="portfolio-disclosure" open={isDetailedView}>
                  <summary>
                    <div>
                      <strong>Holdings</strong>
                      <span>
                        {workspace.positions.length
                          ? `${workspace.positions.length} holdings with valuation context`
                          : "No holdings have been booked yet"}
                      </span>
                    </div>
                    <span className="portfolio-disclosure-chevron" aria-hidden="true">
                      ▾
                    </span>
                  </summary>
                  <div className="portfolio-disclosure-content">
                    <AnalyticsModule
                      title="Holdings"
                      subtitle="Holdings inventory with valuation and weight context."
                    >
              {workspace.positions.length ? (
                <AnalyticsTable
                  ariaLabel="Portfolio book"
                  columns={buildHoldingsColumns(context.columnMode)}
                  rows={workspace.positions.map((position) => ({
                    key: position.security_id,
                    cells: buildHoldingsCells(position, workspace.portfolio.base_currency, context.columnMode),
                  }))}
                />
              ) : (
                <div className="portfolio-empty-state">
                  <strong>No holdings in this portfolio</strong>
                  <p className="muted">The holdings inventory is empty.</p>
                  <p className="muted">
                    Add securities, cash funding, or subscriptions to populate the book.
                  </p>
                </div>
              )}
                    </AnalyticsModule>
                  </div>
                </details>
                ) : null}

                {showDetailedTransactions ? (
                <details className="portfolio-disclosure" open={isDetailedView}>
                  <summary>
                    <div>
                      <strong>Transactions</strong>
                      <span>
                        {workspace.recent_transactions.length
                          ? `${workspace.recent_transactions.length} booked events in ${context.timeWindow}`
                          : "No transactions have been booked yet"}
                      </span>
                    </div>
                    <span className="portfolio-disclosure-chevron" aria-hidden="true">
                      ▾
                    </span>
                  </summary>
                  <div className="portfolio-disclosure-content">
                    <AnalyticsModule
                      title="Transactions"
                      subtitle={`Booked activity inside the selected ${context.timeWindow} window ending ${formatDate(context.selectedAsOfDate)}.`}
                    >
              {workspace.recent_transactions.length ? (
                <AnalyticsTable
                  ariaLabel="Recent transactions"
                  columns={buildTransactionColumns(context.columnMode)}
                  rows={workspace.recent_transactions.map((transaction) => ({
                    key: transaction.transaction_id,
                    cells: buildTransactionCells(transaction, workspace.portfolio.base_currency, context.columnMode),
                  }))}
                />
              ) : (
                <div className="portfolio-empty-state">
                  <strong>No transactions booked</strong>
                  <p className="muted">
                    No funding, trading, or cash activity has been recorded.
                  </p>
                  <p className="muted">Start with a funding entry or the first trade.</p>
                </div>
              )}
                    </AnalyticsModule>
                  </div>
                </details>
                ) : null}

                {showProjectedCashflow && workspace.cashflow_outlook ? (
                  <details className="portfolio-disclosure" open={isDetailedView}>
                    <summary>
                      <div>
                        <strong>Projected Cashflow</strong>
                        <span>{`${workspace.cashflow_outlook.projection_days} day forward liquidity path`}</span>
                      </div>
                      <span className="portfolio-disclosure-chevron" aria-hidden="true">
                        ▾
                      </span>
                    </summary>
                    <div className="portfolio-disclosure-content">
                      <AnalyticsModule
                        title="Projected Cashflow"
                        subtitle="Projected liquidity path over the active forecast horizon."
                      >
                {hasFlatCashflow(workspace) ? (
                  <p className="portfolio-inline-note muted">
                    Projected cash movements are flat across the current forecast horizon.
                  </p>
                ) : null}
                <AnalyticsTable
                  ariaLabel="Cashflow outlook"
                  columns={[
                    { key: "date", label: "Date" },
                    { key: "net", label: "Net Cashflow", align: "right" },
                    { key: "cum", label: "Cumulative", align: "right" },
                  ]}
                  rows={workspace.cashflow_outlook.upcoming_points.map((point) => ({
                    key: point.projection_date,
                    cells: [
                      formatDate(point.projection_date),
                      formatCurrency(
                        point.net_cashflow_base,
                        workspace.portfolio.base_currency
                      ),
                      formatCurrency(
                        point.projected_cumulative_cashflow_base,
                        workspace.portfolio.base_currency
                      ),
                    ],
                  }))}
                />
                      </AnalyticsModule>
                    </div>
                  </details>
                ) : null}
              </div>
            </section>
            ) : null}
          </>
        )}
      </WorkspaceMain>

      <WorkspaceSide>
        {workspace ? (
          <>
            <Panel className="portfolio-side-card">
              <div className="portfolio-card-header">
                <h3 className="portfolio-side-card-title">Book Readiness</h3>
                <p className="portfolio-card-subtitle">
                  Publishing, reporting, and operational state for the active portfolio.
                </p>
              </div>
              <div className="portfolio-side-groups">
                {renderDefinitionGroup([
                  {
                    label: "Holdings Coverage",
                    value: workspace.readiness.has_positions ? "Ready" : "Pending",
                    tone: workspace.readiness.has_positions ? "success" : "warn",
                  },
                  {
                    label: "Reporting Status",
                    value: workspace.readiness.reporting.status,
                    tone: getReportingStateTone(workspace.readiness.reporting.status),
                  },
                  {
                    label: "Publishing Allowed",
                    value: formatBooleanFlag(workspace.operations?.publish_allowed),
                    tone: workspace.operations?.publish_allowed ? "success" : "warn",
                  },
                  {
                    label: "Blocking Controls",
                    value: formatBooleanFlag(workspace.operations?.controls_blocking),
                    tone: workspace.operations?.controls_blocking ? "danger" : "neutral",
                  },
                ])}
                {showReadinessDetailGroup
                  ? renderDefinitionGroup([
                      { label: "Report rows", value: workspace.readiness.reporting.row_count },
                      {
                        label: "Transactions",
                        value: formatDate(workspace.operations?.latest_booked_transaction_date),
                      },
                      {
                        label: "Positions",
                        value: formatDate(workspace.operations?.latest_booked_position_snapshot_date),
                      },
                    ])
                  : null}
              </div>
            </Panel>

            <Panel className="portfolio-side-card">
              <div className="portfolio-card-header">
                <h3 className="portfolio-side-card-title">Next Actions</h3>
                <p className="portfolio-card-subtitle">
                  The shortest path to activate book, liquidity, and ledger coverage.
                </p>
              </div>
              <div className="portfolio-guidance-list portfolio-workflow-list">
                {setupActions.map((action, index) => (
                  <div
                    key={action.title}
                    className={
                      action.recommended
                        ? "portfolio-guidance-item portfolio-workflow-item portfolio-workflow-item-recommended"
                        : "portfolio-guidance-item portfolio-workflow-item"
                    }
                  >
                    <div className="portfolio-workflow-sequence">
                      <span className="portfolio-workflow-step">{action.sequence || index + 1}</span>
                      <div className="portfolio-guidance-copy">
                        {action.recommended ? (
                          <span className="portfolio-workflow-kicker">Recommended next</span>
                        ) : null}
                        <strong>{action.title}</strong>
                        {action.impact ? (
                          <p className="portfolio-evidence-copy">{action.impact}</p>
                        ) : null}
                        {action.target ? (
                          <p className="portfolio-workflow-target">{action.target}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="portfolio-workflow-actions">
                      <a href={action.href} className="portfolio-workflow-cta">
                        {action.cta_label}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        ) : (
          <Panel className="portfolio-side-card">
            <div className="portfolio-card-header">
              <h3 className="portfolio-side-card-title">Available Work Areas</h3>
              <p className="portfolio-card-subtitle">
                Open adjacent portfolio workflows while the main briefing is unavailable.
              </p>
            </div>
            <div className="toolbar">
              <ActionLink href="/recommendations">Open Recommendations</ActionLink>
              <ActionLink href="/performance">Performance</ActionLink>
              <ActionLink href="/workbench">Open Operations</ActionLink>
            </div>
          </Panel>
        )}
      </WorkspaceSide>
    </WorkspaceLayout>
  );
}

function renderDefinitionGroup(
  items: Array<{ label: string; value: React.ReactNode; tone?: "neutral" | "success" | "warn" | "danger" }>
): React.ReactNode {
  return (
    <dl className="portfolio-side-definition-list">
      {items.map((item) => (
        <div key={item.label} className="portfolio-side-definition-row">
          <dt>{item.label}</dt>
          <dd className={item.tone ? `portfolio-side-value-${item.tone}` : undefined}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function getReportingStateTone(status: string): "neutral" | "success" | "warn" {
  switch (status.toUpperCase()) {
    case "READY":
    case "COMPLETE":
      return "success";
    case "EMPTY":
    case "PENDING":
      return "warn";
    default:
      return "neutral";
  }
}

function formatIncomeTypeLabel(value: string): string {
  return formatLabel(value.toLowerCase());
}

function formatActivityBucketLabel(value: string): string {
  return formatLabel(value.toLowerCase());
}

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function hasFlatCashflow(workspace: PortfolioWorkspace): boolean {
  const outlook = workspace.cashflow_outlook;
  if (!outlook) {
    return false;
  }

  return (
    outlook.total_net_cashflow_base === 0 &&
    outlook.upcoming_points.every(
      (point) =>
        point.net_cashflow_base === 0 && point.projected_cumulative_cashflow_base === 0
      )
  );
}

function buildHoldingsColumns(columnMode: PortfolioWorkspaceContext["columnMode"]) {
  if (columnMode === "essential") {
    return [
      { key: "instrument", label: "Instrument" },
      { key: "assetClass", label: "Asset Class" },
      { key: "quantity", label: "Quantity", align: "right" as const },
      { key: "baseValue", label: "Market Value", align: "right" as const },
      { key: "weight", label: "Weight", align: "right" as const },
    ];
  }

  return [
    { key: "instrument", label: "Instrument" },
    { key: "assetClass", label: "Asset Class" },
    { key: "sector", label: "Sector" },
    { key: "heldSince", label: "Held Since" },
    { key: "currency", label: "Ccy" },
    { key: "quantity", label: "Quantity", align: "right" as const },
    { key: "localValue", label: "Local MV", align: "right" as const },
    { key: "baseValue", label: "Base MV", align: "right" as const },
    { key: "upl", label: "Unrealized P/L", align: "right" as const },
    { key: "weight", label: "Weight", align: "right" as const },
  ];
}

function buildHoldingsCells(
  position: PortfolioPositionView,
  baseCurrency: string,
  columnMode: PortfolioWorkspaceContext["columnMode"]
) {
  if (columnMode === "essential") {
    return [
      position.instrument_name,
      position.asset_class ?? "N/A",
      formatQuantity(position.quantity),
      formatCurrency(position.market_value_base, baseCurrency),
      formatPct(position.weight_pct),
    ];
  }

  return [
    position.instrument_name,
    position.asset_class ?? "N/A",
    position.sector ?? "N/A",
    formatDate(position.held_since_date),
    position.currency ?? "N/A",
    formatQuantity(position.quantity),
    formatCurrency(position.market_value_local, position.currency ?? baseCurrency),
    formatCurrency(position.market_value_base, baseCurrency),
    formatCurrency(position.unrealized_gain_loss_base, baseCurrency),
    formatPct(position.weight_pct),
  ];
}

function buildTransactionColumns(columnMode: PortfolioWorkspaceContext["columnMode"]) {
  if (columnMode === "essential") {
    return [
      { key: "date", label: "Date" },
      { key: "type", label: "Type" },
      { key: "instrument", label: "Instrument" },
      { key: "net", label: "Net Cost", align: "right" as const },
      { key: "settlement", label: "Settlement", align: "right" as const },
    ];
  }

  return [
    { key: "date", label: "Date" },
    { key: "type", label: "Type" },
    { key: "instrument", label: "Instrument" },
    { key: "quantity", label: "Quantity", align: "right" as const },
    { key: "price", label: "Price", align: "right" as const },
    { key: "gross", label: "Gross", align: "right" as const },
    { key: "net", label: "Net Cost", align: "right" as const },
    { key: "realized", label: "Realized P/L", align: "right" as const },
    { key: "settlement", label: "Settlement", align: "right" as const },
  ];
}

function buildTransactionCells(
  transaction: PortfolioTransactionView,
  baseCurrency: string,
  columnMode: PortfolioWorkspaceContext["columnMode"]
) {
  if (columnMode === "essential") {
    return [
      formatDate(transaction.transaction_date),
      transaction.transaction_type,
      transaction.instrument_id,
      formatCurrency(transaction.net_cost_base, baseCurrency),
      transaction.settlement_status ?? "N/A",
    ];
  }

  return [
    formatDate(transaction.transaction_date),
    transaction.transaction_type,
    transaction.instrument_id,
    formatQuantity(transaction.quantity),
    formatCurrency(transaction.price, transaction.currency ?? baseCurrency),
    formatCurrency(transaction.gross_amount, transaction.currency ?? baseCurrency),
    formatCurrency(transaction.net_cost_base, baseCurrency),
    formatCurrency(transaction.realized_gain_loss_base, baseCurrency),
    transaction.settlement_status ?? "N/A",
  ];
}
