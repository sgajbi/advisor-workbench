"use client";

import { DataGridCard, SectionHeader } from "@/design-system";

import { formatCount } from "../formatters";
import PortfolioDrilldownDisclosure from "./portfolio-drilldown-disclosure";
import {
  getPortfolioSectionStorageKey,
} from "./portfolio-analytical-section-state";
import type {
  PortfolioCollapsibleSectionKey,
  PortfolioDrilldownSectionProps,
} from "./portfolio-analytical-section-types";

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
}: PortfolioDrilldownSectionProps) {
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
      className="portfolio-workspace-section portfolio-detailed-cluster-section portfolio-drilldown-section"
    >
      <SectionHeader
        title="Detailed Records"
        subtitle="Underlying holdings, transactions, and projected liquidity when you need record-level evidence."
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
