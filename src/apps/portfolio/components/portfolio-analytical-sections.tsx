"use client";

import type { ComponentType, Dispatch, SetStateAction } from "react";

import {
  DataGridCard,
  SectionHeader,
  WorkbenchLoadingState,
} from "@/design-system";
import { isRenderableCapability } from "@/shell/workspace-capabilities";

import type {
  PortfolioWorkspaceCapabilities,
} from "../capabilities";
import { formatCount, formatDate } from "../formatters";
import type {
  PortfolioAllocationSelection,
  PortfolioHoldingsDrilldownFilter,
  PortfolioTransactionDrilldownFilter,
  PortfolioWorkspace,
} from "../types";
import type { PortfolioWorkspaceContext } from "../view-model";
import { buildPortfolioInsights } from "../view-model";
import PortfolioInsightsStrip from "../modules/portfolio-insights/portfolio-insights-strip";
import PortfolioCollapsibleModule from "./portfolio-collapsible-module";
import PortfolioModuleState from "./portfolio-module-state";
import PortfolioPairedAnalyticsSection from "./portfolio-paired-analytics-section";
import PortfolioPerformanceSnapshotModule from "./portfolio-performance-snapshot-module";
import PortfolioDrilldownDisclosure from "./portfolio-drilldown-disclosure";
import PortfolioLiquiditySummaryModule from "./portfolio-liquidity-summary-module";
import type { HoldingsRow } from "./portfolio-holdings-grid";
import type { TransactionRow } from "./portfolio-transactions-grid";

export type PortfolioCollapsibleSectionKey =
  | "allocation"
  | "top-holdings"
  | "performance-snapshot"
  | "income"
  | "activity"
  | "holdings"
  | "transactions"
  | "projected-cashflow";

type AllocationPanelComponentProps = {
  allocationViews: NonNullable<PortfolioWorkspace["allocation_views"]>;
  baseCurrency: string;
  compact?: boolean;
  selectedAllocation: PortfolioAllocationSelection | null;
  onSelectionChange: (selection: PortfolioAllocationSelection | null) => void;
};

type TopHoldingsPanelComponentProps = {
  positions: PortfolioWorkspace["top_positions"];
  baseCurrency: string;
  selectedSecurityId: string | null;
  onSelectionChange: (securityId: string | null) => void;
};

type HoldingsGridComponentProps = {
  portfolioId: string;
  positions: PortfolioWorkspace["positions"];
  baseCurrency: string;
  asOfDate: string;
  columnMode: PortfolioWorkspaceContext["columnMode"];
  filterLabel?: string | null;
  onClearFilter?: () => void;
  onRowSelect?: (row: HoldingsRow) => void;
};

type TransactionsGridComponentProps = {
  portfolioId: string;
  baseCurrency: string;
  asOfDate: string;
  defaultStartDate: string;
  defaultEndDate: string;
  initialTransactions: PortfolioWorkspace["recent_transactions"];
  suspendInitialFetch?: boolean;
  externalFilter?: PortfolioTransactionDrilldownFilter | null;
  onClearExternalFilter?: () => void;
  onRowSelect?: (row: TransactionRow) => void;
};

type ProjectedCashflowModuleComponentProps = {
  portfolioId: string;
  baseCurrency: string;
  asOfDate: string;
  initialCashflowOutlook: PortfolioWorkspace["cashflow_outlook"];
  defaultExpanded: boolean;
  suspendInitialFetch?: boolean;
};

export function PortfolioInsightsSection({
  workspace,
  context,
  capabilities,
  detailsLoading,
  showInsights,
  showLiquidityModule,
  showChangeHighlights,
  incomeDisplayCurrency,
  activityDisplayCurrency,
  visibleInsights,
  holdingsDrilldown,
  filteredPositions,
  transactionDrilldown,
  onDismissInsight,
  onSelectAllocation,
  onSelectTopHolding,
  onSelectActivityBucket,
  getSectionExpanded,
  toggleSection,
  DeferredPortfolioAllocationPanel,
  DeferredPortfolioTopHoldingsPanel,
}: {
  workspace: PortfolioWorkspace;
  context: PortfolioWorkspaceContext;
  capabilities: PortfolioWorkspaceCapabilities;
  detailsLoading: boolean;
  showInsights: boolean;
  showLiquidityModule: boolean;
  showChangeHighlights: boolean;
  incomeDisplayCurrency: string;
  activityDisplayCurrency: string;
  visibleInsights: ReturnType<typeof buildPortfolioInsights>;
  holdingsDrilldown: PortfolioHoldingsDrilldownFilter | null;
  filteredPositions: PortfolioWorkspace["positions"];
  transactionDrilldown: PortfolioTransactionDrilldownFilter | null;
  onDismissInsight: (key: string) => void;
  onSelectAllocation: (selection: PortfolioAllocationSelection | null) => void;
  onSelectTopHolding: (securityId: string | null) => void;
  onSelectActivityBucket: (bucket: string | null) => void;
  getSectionExpanded: (sectionKey: PortfolioCollapsibleSectionKey) => boolean;
  toggleSection: (sectionKey: PortfolioCollapsibleSectionKey) => void;
  DeferredPortfolioAllocationPanel: ComponentType<AllocationPanelComponentProps>;
  DeferredPortfolioTopHoldingsPanel: ComponentType<TopHoldingsPanelComponentProps>;
}) {
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
        title="Portfolio Insights"
        subtitle="Allocation, concentration, liquidity, and recent activity."
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
              <div className="portfolio-analytical-upper-shell">
                <div className="portfolio-analytical-shell-header">
                  <span>Performance and liquidity context</span>
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

        {(showAllocationModule || showTopHoldingsModule) ? (
          <div className="portfolio-analytical-zone-shell">
            <div className="portfolio-analytical-shell-header">
              <span>Allocation and concentration</span>
              <strong>Composition, ranking, and filter-ready holdings context</strong>
            </div>
            <div className="portfolio-primary-grid portfolio-analytical-zone-grid portfolio-analytical-zone-grid-focus">
              {showAllocationModule ? (
                <PortfolioCollapsibleModule
                  className="portfolio-summary-module-card portfolio-analytical-zone-card portfolio-analytical-zone-card-primary"
                  compact={isSummaryView}
                  title="Portfolio Allocation"
                  subtitle={`Composition overview as of ${formatDate(context.selectedAsOfDate)}.`}
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
                      allocationViews={workspace.allocation_views}
                      baseCurrency={workspace.portfolio.base_currency}
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

        {showChangeHighlights ? (
          <PortfolioPairedAnalyticsSection
            workspace={workspace}
            context={context}
            capabilities={capabilities}
            detailsLoading={detailsLoading}
            isDetailedView={false}
            incomeDisplayCurrency={incomeDisplayCurrency}
            activityDisplayCurrency={activityDisplayCurrency}
            transactionDrilldown={transactionDrilldown}
            onSelectActivityBucket={onSelectActivityBucket}
            getSectionExpanded={getSectionExpanded}
            toggleSection={toggleSection}
            gridClassName="portfolio-analytical-zone-grid portfolio-analytical-zone-grid-balanced"
            shellLabel="Income and activity"
            shellValue="Current-period cash generation and money movement"
          />
        ) : null}
      </div>
    </section>
  );
}

export function PortfolioChangesSection({
  workspace,
  context,
  capabilities,
  showChanges,
  incomeDisplayCurrency,
  activityDisplayCurrency,
  transactionDrilldown,
  isDetailedView,
  onSelectActivityBucket,
  getSectionExpanded,
  toggleSection,
}: {
  workspace: PortfolioWorkspace;
  context: PortfolioWorkspaceContext;
  capabilities: PortfolioWorkspaceCapabilities;
  showChanges: boolean;
  incomeDisplayCurrency: string;
  activityDisplayCurrency: string;
  transactionDrilldown: PortfolioTransactionDrilldownFilter | null;
  isDetailedView: boolean;
  onSelectActivityBucket: (bucket: string | null) => void;
  getSectionExpanded: (sectionKey: PortfolioCollapsibleSectionKey) => boolean;
  toggleSection: (sectionKey: PortfolioCollapsibleSectionKey) => void;
}) {
  if (!showChanges) {
    return null;
  }

  return (
    <PortfolioPairedAnalyticsSection
      workspace={workspace}
      context={context}
      capabilities={capabilities}
      detailsLoading={false}
      isDetailedView={isDetailedView}
      incomeDisplayCurrency={incomeDisplayCurrency}
      activityDisplayCurrency={activityDisplayCurrency}
      transactionDrilldown={transactionDrilldown}
      onSelectActivityBucket={onSelectActivityBucket}
      getSectionExpanded={getSectionExpanded}
      toggleSection={toggleSection}
      sectionId="portfolio-changes"
      title="Recent Flows"
      subtitle={`Income and client activity for ${formatPeriodContext(context)}.`}
      sectionClassName="portfolio-detailed-cluster-section"
      shellLabel="Income and activity"
      shellValue="Current-period movement, event mix, and drill-down readiness"
    />
  );
}

export function PortfolioDrilldownSection({
  workspace,
  context,
  capabilities,
  detailsLoading,
  showDrilldown,
  isDetailedView,
  filteredPositions,
  holdingsFilterCopy,
  transactionDrilldown,
  onClearHoldingsDrilldown,
  onClearTransactionDrilldown,
  onSelectHoldingRow,
  onSelectTransactionRow,
  getSectionExpanded,
  setSectionPreferences,
  DeferredPortfolioHoldingsGrid,
  DeferredPortfolioTransactionsGrid,
  DeferredPortfolioProjectedCashflowModule,
}: {
  workspace: PortfolioWorkspace;
  context: PortfolioWorkspaceContext;
  capabilities: PortfolioWorkspaceCapabilities;
  detailsLoading: boolean;
  showDrilldown: boolean;
  isDetailedView: boolean;
  filteredPositions: PortfolioWorkspace["positions"];
  holdingsFilterCopy: string | null;
  transactionDrilldown: PortfolioTransactionDrilldownFilter | null;
  onClearHoldingsDrilldown: () => void;
  onClearTransactionDrilldown: () => void;
  onSelectHoldingRow: (row: HoldingsRow) => void;
  onSelectTransactionRow: (row: TransactionRow) => void;
  getSectionExpanded: (sectionKey: PortfolioCollapsibleSectionKey) => boolean;
  setSectionPreferences: Dispatch<SetStateAction<Record<string, boolean>>>;
  DeferredPortfolioHoldingsGrid: ComponentType<HoldingsGridComponentProps>;
  DeferredPortfolioTransactionsGrid: ComponentType<TransactionsGridComponentProps>;
  DeferredPortfolioProjectedCashflowModule: ComponentType<ProjectedCashflowModuleComponentProps>;
}) {
  if (!showDrilldown) {
    return null;
  }

  const holdingsExpanded = getSectionExpanded("holdings");
  const transactionsExpanded = getSectionExpanded("transactions");
  const projectedCashflowExpanded = getSectionExpanded("projected-cashflow");

  const persistOpenState = (
    sectionKey: PortfolioCollapsibleSectionKey,
    nextOpen: boolean
  ) => {
    setSectionPreferences((current) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          getPortfolioSectionStorageKey(sectionKey),
          String(nextOpen)
        );
      }
      return { ...current, [sectionKey]: nextOpen };
    });
  };

  return (
    <section
      id="portfolio-drilldown"
      className="portfolio-workspace-section portfolio-detailed-cluster-section"
    >
      <SectionHeader
        title="Where can I drill down?"
        subtitle="Holdings, transactions, and projected liquidity on demand."
      />
      <div className="portfolio-disclosure-stack portfolio-disclosure-stack-muted">
        <PortfolioDrilldownDisclosure
          title="Holdings"
          summary={
            capabilities.holdingsDrilldown.state === "supported"
              ? filteredPositions.length
                ? `${formatCount(filteredPositions.length, "holding")} with valuation context`
                : "No holdings have been booked yet"
              : capabilities.holdingsDrilldown.reason ??
                "Holdings drill-down is unavailable."
          }
          expanded={holdingsExpanded}
          onToggle={(nextOpen) => persistOpenState("holdings", nextOpen)}
          capability={capabilities.holdingsDrilldown}
          partialTitle="Holdings drill-down is partially available"
          unavailableTitle="Holdings drill-down unavailable"
          body={
            capabilities.holdingsDrilldown.reason ??
            "Detailed holdings rows are not available in the current portfolio contract."
          }
          hint="Publish detailed position rows to support holdings drill-down."
          why={{
            body:
              "Holdings drill-down requires detailed position rows with identifiers, valuation context, and filters. Summary counts alone are not enough for a usable grid.",
            label: "Why holdings drill-down is unavailable",
          }}
        >
          <DataGridCard>
            <DeferredPortfolioHoldingsGrid
              portfolioId={workspace.portfolio.portfolio_id}
              positions={filteredPositions}
              baseCurrency={workspace.portfolio.base_currency}
              asOfDate={context.selectedAsOfDate}
              columnMode={context.columnMode}
              filterLabel={holdingsFilterCopy}
              onClearFilter={onClearHoldingsDrilldown}
              onRowSelect={onSelectHoldingRow}
            />
          </DataGridCard>
        </PortfolioDrilldownDisclosure>

        <PortfolioDrilldownDisclosure
          title="Transactions"
          summary={
            capabilities.transactionsDrilldown.state === "supported"
              ? workspace.recent_transactions.length
                ? `${workspace.recent_transactions.length} booked events in ${context.periodLabel}`
                : "No transactions have been booked yet"
              : capabilities.transactionsDrilldown.reason ??
                "Transactions drill-down is unavailable."
          }
          expanded={transactionsExpanded}
          onToggle={(nextOpen) => persistOpenState("transactions", nextOpen)}
          capability={capabilities.transactionsDrilldown}
          partialTitle="Transactions drill-down is partially available"
          unavailableTitle="Transactions drill-down unavailable"
          body={
            capabilities.transactionsDrilldown.reason ??
            "Detailed transaction rows are not available in the current portfolio contract."
          }
          hint="Use the current reporting window or publish detailed ledger rows to support transaction drill-down."
        >
          <DataGridCard>
            <DeferredPortfolioTransactionsGrid
              portfolioId={workspace.portfolio.portfolio_id}
              baseCurrency={workspace.portfolio.base_currency}
              asOfDate={context.selectedAsOfDate}
              defaultStartDate={context.effectivePeriodStartDate}
              defaultEndDate={context.effectivePeriodEndDate}
              initialTransactions={workspace.recent_transactions}
              suspendInitialFetch={detailsLoading}
              externalFilter={transactionDrilldown}
              onClearExternalFilter={onClearTransactionDrilldown}
              onRowSelect={onSelectTransactionRow}
            />
          </DataGridCard>
        </PortfolioDrilldownDisclosure>

        <PortfolioDrilldownDisclosure
          title="Projected Cashflow"
          summary={
            capabilities.projectedCashflow.state === "supported" &&
            workspace.cashflow_outlook
              ? `${workspace.cashflow_outlook.projection_days} day forward liquidity path`
              : capabilities.projectedCashflow.reason ??
                "Projected cashflow is unavailable."
          }
          expanded={projectedCashflowExpanded}
          onToggle={(nextOpen) => persistOpenState("projected-cashflow", nextOpen)}
          capability={capabilities.projectedCashflow}
          partialTitle="Projected cashflow is partially available"
          unavailableTitle="Projected cashflow unavailable"
          body={
            capabilities.projectedCashflow.reason ??
            "A projected liquidity path is not available in the current portfolio contract."
          }
          hint="Publish forward cashflow projections to support projected liquidity review."
          why={{
            body:
              "Projected cashflow requires forward-looking cashflow points from the liquidity contract. Without those points, the UI should not imply a reliable liquidity forecast.",
            label: "Why projected cashflow is unavailable",
          }}
        >
          <DeferredPortfolioProjectedCashflowModule
            portfolioId={workspace.portfolio.portfolio_id}
            baseCurrency={workspace.portfolio.base_currency}
            asOfDate={context.selectedAsOfDate}
            initialCashflowOutlook={workspace.cashflow_outlook}
            defaultExpanded={isDetailedView}
            suspendInitialFetch={detailsLoading}
          />
        </PortfolioDrilldownDisclosure>
      </div>
    </section>
  );
}

export const PORTFOLIO_COLLAPSIBLE_SECTION_KEYS: PortfolioCollapsibleSectionKey[] = [
  "allocation",
  "top-holdings",
  "performance-snapshot",
  "income",
  "activity",
  "holdings",
  "transactions",
  "projected-cashflow",
];

export function getPortfolioSectionStorageKey(
  sectionKey: PortfolioCollapsibleSectionKey
): string {
  return `lotus:portfolio:section:${sectionKey}`;
}

export function getDefaultSectionExpanded(
  sectionKey: PortfolioCollapsibleSectionKey,
  viewMode: PortfolioWorkspaceContext["viewMode"]
): boolean {
  if (viewMode === "detailed") {
    return true;
  }

  switch (sectionKey) {
    case "allocation":
    case "top-holdings":
    case "income":
    case "activity":
      return true;
    default:
      return false;
  }
}

function formatPeriodContext(context: PortfolioWorkspaceContext): string {
  return `${context.periodLabel} period from ${formatDate(
    context.effectivePeriodStartDate
  )} to ${formatDate(context.effectivePeriodEndDate)}`;
}
