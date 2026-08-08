"use client";

import type { PortfolioRecordScreenData } from "../portfolio-record-screen-data";
import PortfolioIncomeActivityWorkspace from "./portfolio-income-activity-workspace";
import PortfolioRecordScreenShell from "./portfolio-record-screen-shell";

export default function PortfolioIncomeRecordScreen(props: PortfolioRecordScreenData) {
  return (
    <PortfolioRecordScreenShell {...props} screen="income">
      {props.workspace ? <PortfolioIncomeActivityWorkspace workspace={props.workspace} /> : null}
    </PortfolioRecordScreenShell>
  );
}
