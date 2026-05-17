import { describe, expect, it } from "vitest";

import { buildPortfolioSummaryDetailsRequest } from "../../src/apps/portfolio/portfolio-workspace-client-view-model";
import type { PortfolioWorkspaceContext } from "../../src/apps/portfolio/view-model";

describe("portfolio workspace client view model", () => {
  it("builds stable summary-details request params from advisor context", () => {
    const context: PortfolioWorkspaceContext = {
      selectedAsOfDate: "2026-03-28",
      selectedReportingCurrency: "USD",
      timeWindow: "1Y",
      periodLabel: "1Y",
      viewMode: "summary",
      columnMode: "essential",
      hideEmptyModules: false,
      focusExceptions: false,
      effectivePeriodStartDate: "2026-01-01",
      effectivePeriodEndDate: "2026-03-28",
      usesCustomDateRange: true,
      hasHistoricalGap: false,
      currencyOptions: ["USD"],
      historicalSnapshotState: "supported",
      historicalSnapshotReason: "Historical snapshots are source-backed.",
      supportsHistoricalSnapshots: true,
      reportingCurrencyRestatementState: "supported",
      reportingCurrencyRestatementReason: "Reporting currency restatement is source-backed.",
      supportsReportingCurrencyRestatement: true,
    };

    expect(buildPortfolioSummaryDetailsRequest("PB_SG_GLOBAL_BAL_001", context)).toEqual({
      key: "PB_SG_GLOBAL_BAL_001:2026-03-28:USD:1Y:2026-01-01:2026-03-28:true",
      params: {
        asOfDate: "2026-03-28",
        reportingCurrency: "USD",
        includeProjected: false,
        timeWindow: "1Y",
        reportStartDate: "2026-01-01",
        reportEndDate: "2026-03-28",
        usesCustomDateRange: true,
      },
    });
  });
});
