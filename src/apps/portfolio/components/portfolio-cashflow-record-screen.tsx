"use client";

import {
  selectCashflowPartialFailures,
  selectCashflowWarnings,
} from "../portfolio-projected-cashflow-view-model";
import type { PortfolioRecordScreenData } from "../portfolio-record-screen-data";
import PortfolioProjectedCashflowModule from "./portfolio-projected-cashflow-module";
import PortfolioRecordScreenShell from "./portfolio-record-screen-shell";
import { usePortfolioRecordWorkspaceContext } from "./use-portfolio-record-workspace-context";

export default function PortfolioCashflowRecordScreen(props: PortfolioRecordScreenData) {
  const context = usePortfolioRecordWorkspaceContext(props.workspace);

  return (
    <PortfolioRecordScreenShell {...props} screen="cashflow">
      {props.workspace && context ? (
        <PortfolioProjectedCashflowModule
          key={`${props.workspace.portfolio.portfolio_id}-${context.selectedAsOfDate}`}
          portfolioId={props.workspace.portfolio.portfolio_id}
          baseCurrency={props.workspace.portfolio.base_currency}
          asOfDate={context.selectedAsOfDate}
          initialCashflowOutlook={props.workspace.cashflow_outlook}
          initialWarnings={selectCashflowWarnings(props.workspace.warnings)}
          initialPartialFailures={selectCashflowPartialFailures(props.workspace.partial_failures)}
          defaultExpanded
        />
      ) : null}
    </PortfolioRecordScreenShell>
  );
}
