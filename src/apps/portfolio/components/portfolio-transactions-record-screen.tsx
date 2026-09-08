"use client";

import type { PortfolioRecordScreenData } from "../portfolio-record-screen-data";
import PortfolioRecordScreenShell from "./portfolio-record-screen-shell";
import PortfolioTransactionsRecordWorkspace from "./portfolio-transactions-record-workspace";
import { usePortfolioRecordWorkspaceContext } from "./use-portfolio-record-workspace-context";

export default function PortfolioTransactionsRecordScreen(
  props: PortfolioRecordScreenData,
) {
  const context = usePortfolioRecordWorkspaceContext(props.workspace);

  return (
    <PortfolioRecordScreenShell {...props} screen="transactions">
      {props.workspace && context ? (
        <PortfolioTransactionsRecordWorkspace
          key={props.workspace.portfolio.portfolio_id}
          workspace={props.workspace}
          asOfDate={context.selectedAsOfDate}
          defaultStartDate={props.startDate ?? context.effectivePeriodStartDate}
          defaultEndDate={props.endDate ?? context.effectivePeriodEndDate}
          reportingCurrency={
            props.reportingCurrency ?? props.workspace.portfolio.base_currency
          }
        />
      ) : null}
    </PortfolioRecordScreenShell>
  );
}
