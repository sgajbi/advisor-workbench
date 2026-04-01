"use client";

import { AnalyticsModule, MetricRow } from "@/design-system";
import type { WorkspaceCapability } from "@/shell/workspace-capabilities";
import { isSupportedCapability } from "@/shell/workspace-capabilities";

import { formatCurrency, formatDate, formatPct } from "../formatters";
import type { PortfolioWorkspace } from "../types";
import PortfolioModuleState from "./portfolio-module-state";

export default function PortfolioLiquiditySummaryModule({
  capability,
  cashflowOutlook,
  totalCashBase,
  cashWeightPct,
  baseCurrency,
  asOfDate,
}: {
  capability: WorkspaceCapability;
  cashflowOutlook: PortfolioWorkspace["cashflow_outlook"];
  totalCashBase: number;
  cashWeightPct: number | null;
  baseCurrency: string;
  asOfDate: string;
}) {
  return (
    <AnalyticsModule
      className="portfolio-summary-module-card workbench-summary-module-card portfolio-liquidity-summary-card"
      title="Liquidity and Projected Cash"
      subtitle={`As of ${formatDate(asOfDate)} with forecast cashflow over the active horizon.`}
    >
      {isSupportedCapability(capability) && cashflowOutlook ? (
        <div className="portfolio-summary-pair-panel portfolio-liquidity-summary-panel">
          <div className="portfolio-summary-pair-strip">
            <SummaryPairStat
              label="Available Cash"
              value={formatCurrency(totalCashBase, baseCurrency)}
            />
            <SummaryPairStat label="Cash Allocation" value={formatPct(cashWeightPct)} />
            <SummaryPairStat
              label="Projected Net Flow"
              value={formatCurrency(cashflowOutlook.total_net_cashflow_base, baseCurrency)}
            />
          </div>
          <div className="portfolio-summary-pair-footer">
            <div className="portfolio-summary-pair-region-heading">
              <span>Liquidity Outlook</span>
              <strong>{`${cashflowOutlook.projection_days} days`}</strong>
            </div>
            <div className="portfolio-summary-pair-context-grid">
              <MetricRow
                label="Forecast Horizon"
                value={`${cashflowOutlook.projection_days} days`}
              />
              <MetricRow
                label="Projection Mode"
                value={cashflowOutlook.include_projected ? "Projected points included" : "Booked points only"}
              />
            </div>
          </div>
        </div>
      ) : (
        <PortfolioModuleState
          variant="capability"
          capability={capability}
          partialTitle="Projected cashflow is partially available"
          unavailableTitle="Projected cashflow unavailable"
          body={
            capability.reason ??
            "A projected liquidity path is not available in the current portfolio contract."
          }
          partialHint="Publish forward cashflow projections to support projected liquidity review."
          unavailableHint="Publish forward cashflow projections to support projected liquidity review."
          why={{
            body:
              "Projected cashflow requires forward-looking cashflow points from the liquidity contract. Without those points, the UI should not imply a reliable liquidity forecast.",
            label: "Why projected cashflow is unavailable",
          }}
        />
      )}
    </AnalyticsModule>
  );
}

function SummaryPairStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="portfolio-summary-pair-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
