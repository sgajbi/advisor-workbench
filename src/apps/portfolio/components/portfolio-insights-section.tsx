"use client";

import { SectionHeader, WorkbenchLoadingState } from "@/design-system";
import { isRenderableCapability } from "@/shell/workspace-capabilities";

import { formatDate } from "../formatters";
import PortfolioInsightsStrip from "../modules/portfolio-insights/portfolio-insights-strip";
import PortfolioCollapsibleModule from "./portfolio-collapsible-module";
import PortfolioModuleState from "./portfolio-module-state";
import PortfolioPerformanceSnapshotModule from "./portfolio-performance-snapshot-module";
import PortfolioLiquiditySummaryModule from "./portfolio-liquidity-summary-module";
import type { PortfolioInsightsSectionProps } from "./portfolio-analytical-section-types";

export function PortfolioInsightsSection({
  workspace,
  context,
  capabilities,
  detailsLoading,
  showInsights,
  showLiquidityModule,
  visibleInsights,
  holdingsDrilldown,
  filteredPositions,
  onDismissInsight,
  onSelectAllocation,
  onSelectTopHolding,
  getSectionExpanded,
  toggleSection,
  DeferredPortfolioAllocationPanel,
  DeferredPortfolioTopHoldingsPanel,
}: PortfolioInsightsSectionProps) {
  if (!showInsights) {
    return null;
  }

  const isSummaryView = context.viewMode === "summary";
  const showPerformanceSnapshot = isRenderableCapability(capabilities.performanceSnapshot);
  const showAllocationModule = isRenderableCapability(capabilities.allocation);
  const showTopHoldingsModule = isRenderableCapability(capabilities.topHoldings);
  const showInsightsSummaryBand =
    visibleInsights.length > 0 || showLiquidityModule || showPerformanceSnapshot;

  return (
    <section className="portfolio-workspace-section portfolio-summary-cluster-section">
      <SectionHeader
        title="Portfolio Review"
        subtitle="Liquidity, return, allocation mix, and concentration for the selected review window."
      />
      <div className="portfolio-analytical-surface">
        {showInsightsSummaryBand ? (
          <div className="portfolio-insights-summary-band workbench-summary-region">
            <PortfolioInsightsStrip
              insights={visibleInsights}
              readinessIndicators={[]}
              onDismissInsight={onDismissInsight}
            />
            {showLiquidityModule || showPerformanceSnapshot ? (
              <div className="portfolio-analytical-upper-shell portfolio-analytical-upper-shell-primary">
                <div className="portfolio-analytical-shell-header">
                  <span>Liquidity and return context</span>
                  <strong>
                    {context.periodLabel} as of {formatDate(context.selectedAsOfDate)}
                  </strong>
                </div>
                <div className="portfolio-primary-grid portfolio-insights-summary-grid">
                  {showLiquidityModule ? (
                    <PortfolioLiquiditySummaryModule
                      capability={capabilities.projectedCashflow}
                      cashflowOutlook={workspace.cashflow_outlook}
                      totalCashBase={workspace.summary.total_cash_base}
                      cashWeightPct={workspace.summary.cash_weight_pct}
                      baseCurrency={workspace.portfolio.base_currency}
                      asOfDate={context.selectedAsOfDate}
                    />
                  ) : null}
                  {showPerformanceSnapshot ? (
                    <PortfolioPerformanceSnapshotModule
                      capability={capabilities.performanceSnapshot}
                      performance={workspace.performance}
                      rebalance={workspace.rebalance}
                      reportingRowCount={workspace.readiness.reporting.row_count}
                      context={context}
                      portfolioId={workspace.portfolio.portfolio_id}
                      selectedPeriod={context.timeWindow}
                      expanded={getSectionExpanded("performance-snapshot")}
                      onToggle={() => toggleSection("performance-snapshot")}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {showAllocationModule || showTopHoldingsModule ? (
          <div className="portfolio-analytical-zone-shell">
            <div className="portfolio-analytical-shell-header">
              <span>Holdings mix and concentration</span>
              <strong>Allocation and largest positions for review</strong>
            </div>
            <div className="portfolio-primary-grid portfolio-analytical-zone-grid portfolio-analytical-zone-grid-focus">
              {showAllocationModule ? (
                <PortfolioCollapsibleModule
                  className="portfolio-summary-module-card portfolio-analytical-zone-card portfolio-analytical-zone-card-primary"
                  compact={isSummaryView}
                  title="Portfolio Allocation"
                  subtitle={`Allocation mix as of ${formatDate(context.selectedAsOfDate)}.`}
                  expanded={getSectionExpanded("allocation")}
                  onToggle={() => toggleSection("allocation")}
                >
                  {detailsLoading ? (
                    <WorkbenchLoadingState
                      title="Loading allocation"
                      message="Allocation analytics are loading for the selected portfolio context."
                      chart
                      rows={4}
                    />
                  ) : workspace.allocation_views?.length ? (
                    <DeferredPortfolioAllocationPanel
                      portfolioId={workspace.portfolio.portfolio_id}
                      allocationViews={workspace.allocation_views}
                      baseCurrency={workspace.portfolio.base_currency}
                      asOfDate={context.selectedAsOfDate}
                      reportingCurrency={context.selectedReportingCurrency}
                      compact={isSummaryView}
                      selectedAllocation={
                        holdingsDrilldown?.kind === "allocation"
                          ? holdingsDrilldown.selection
                          : null
                      }
                      onSelectionChange={onSelectAllocation}
                    />
                  ) : (
                    <PortfolioModuleState
                      variant="capability"
                      capability={capabilities.allocation}
                      partialTitle="Allocation is partially available"
                      unavailableTitle="No allocation data yet"
                      body={
                        capabilities.allocation.reason ??
                        "Allocation requires funded holdings with current valuations before reliable composition views can be shown."
                      }
                      partialHint="Publish current prices and valuation outputs to complete the allocation tabs."
                      unavailableHint="Book positions and publish prices to generate allocation views."
                      why={{
                        body:
                          capabilities.allocation.state === "partial"
                            ? "Allocation requires valued holdings. Until positions have current prices and market values, composition buckets cannot be calculated reliably."
                            : "Allocation requires funded holdings with current valuations. Empty or unvalued books cannot produce allocation views.",
                        label:
                          capabilities.allocation.state === "partial"
                            ? "Why allocation is partially available"
                            : "Why allocation data is unavailable",
                      }}
                      illustration
                    />
                  )}
                </PortfolioCollapsibleModule>
              ) : null}

              {showTopHoldingsModule ? (
                <PortfolioCollapsibleModule
                  className="portfolio-summary-module-card portfolio-analytical-zone-card portfolio-analytical-zone-card-secondary"
                  compact={isSummaryView}
                  title="Top Holdings"
                  subtitle={`Largest holdings by market value or weight as of ${formatDate(
                    context.selectedAsOfDate
                  )}.`}
                  expanded={getSectionExpanded("top-holdings")}
                  onToggle={() => toggleSection("top-holdings")}
                >
                  {detailsLoading ? (
                    <WorkbenchLoadingState
                      title="Loading top holdings"
                      message="Holdings concentration is loading for the selected portfolio context."
                      chart
                      rows={4}
                    />
                  ) : workspace.top_positions.length ? (
                    <DeferredPortfolioTopHoldingsPanel
                      positions={
                        holdingsDrilldown?.kind === "allocation"
                          ? filteredPositions
                              .slice()
                              .sort(
                                (left, right) =>
                                  (right.market_value_base ?? 0) -
                                  (left.market_value_base ?? 0)
                              )
                              .slice(0, 10)
                              .map((position) => ({
                                security_id: position.security_id,
                                instrument_name: position.instrument_name,
                                asset_class: position.asset_class,
                                quantity: position.quantity,
                                market_value_base: position.market_value_base,
                                weight_pct: position.weight_pct,
                              }))
                          : workspace.top_positions
                      }
                      baseCurrency={workspace.portfolio.base_currency}
                      selectedSecurityId={
                        holdingsDrilldown?.kind === "security"
                          ? holdingsDrilldown.security_id
                          : null
                      }
                      onSelectionChange={onSelectTopHolding}
                    />
                  ) : (
                    <PortfolioModuleState
                      variant="capability"
                      capability={capabilities.topHoldings}
                      partialTitle="Top holdings are not ranked yet"
                      unavailableTitle="No holdings yet"
                      body={
                        capabilities.topHoldings.reason ??
                        "Top positions require booked holdings with current market values before concentration can be ranked."
                      }
                      partialHint="Complete valuation and concentration calculations to populate the ranked holdings view."
                      unavailableHint="Book positions and publish pricing to show ranked holdings."
                      why={
                        capabilities.topHoldings.state === "partial"
                          ? undefined
                          : {
                              body:
                                "Holdings require booked positions or funded balances. Until the book contains invested or funded inventory, there is nothing to rank.",
                              label: "Why holdings are unavailable",
                            }
                      }
                      illustration
                      centered
                    />
                  )}
                </PortfolioCollapsibleModule>
              ) : null}
            </div>
          </div>
        ) : null}

      </div>
    </section>
  );
}
