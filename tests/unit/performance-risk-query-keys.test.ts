import { describe, expect, it } from "vitest";

import {
  buildPerformanceRiskQueryContext,
  performanceRiskQueryKeys,
} from "../../src/apps/performance/performance-risk-query-keys";
import { buildPerformanceWorkspace } from "../fixtures/performance-workspace-fixtures";

const workspace = buildPerformanceWorkspace("PB_SG_GLOBAL_BAL_001");

describe("performanceRiskQueryKeys", () => {
  it("includes every source-changing review dimension", () => {
    const context = buildPerformanceRiskQueryContext(workspace, "YTD");
    const baseline = performanceRiskQueryKeys.riskSummary(context, "NET");
    const variants = [
      { ...context, portfolioId: "PB_SG_GROWTH_002" },
      { ...context, period: "1Y" },
      { ...context, asOfDate: "2026-02-28" },
      { ...context, reportingCurrency: "SGD" },
      { ...context, benchmark: "BMK_PRIVATE_BANK" },
    ];

    for (const variant of variants) {
      expect(performanceRiskQueryKeys.riskSummary(variant, "NET")).not.toEqual(
        baseline,
      );
    }
    expect(performanceRiskQueryKeys.riskSummary(context, "GROSS")).not.toEqual(
      baseline,
    );
  });

  it("uses explicit review-window dates only when the source request accepts them", () => {
    const rollingContext = buildPerformanceRiskQueryContext(workspace, "YTD");
    const explicitContext = buildPerformanceRiskQueryContext(
      {
        ...workspace,
        report_start_date: "2026-01-01",
        report_end_date: "2026-03-31",
      },
      "EXPLICIT",
    );

    expect(rollingContext.reportStartDate).toBeNull();
    expect(rollingContext.reportEndDate).toBeNull();
    expect(explicitContext.reportStartDate).toBe("2026-01-01");
    expect(explicitContext.reportEndDate).toBe("2026-03-31");
    expect(performanceRiskQueryKeys.review(explicitContext)).not.toEqual(
      performanceRiskQueryKeys.review(rollingContext),
    );
  });

  it("separates source shapes and on-demand analytical detail", () => {
    const context = buildPerformanceRiskQueryContext(workspace, "YTD");

    expect(performanceRiskQueryKeys.drawdown(context, "NET", false)).not.toEqual(
      performanceRiskQueryKeys.drawdown(context, "NET", true),
    );
    expect(performanceRiskQueryKeys.rolling(context, "NET", false)).not.toEqual(
      performanceRiskQueryKeys.rolling(context, "NET", true),
    );
    expect(
      performanceRiskQueryKeys.attribution(
        context,
        "NET",
        "TOTAL_RISK",
        "SECTOR",
      ),
    ).not.toEqual(
      performanceRiskQueryKeys.attribution(
        context,
        "NET",
        "ACTIVE_RISK",
        "SECTOR",
      ),
    );
    expect(
      performanceRiskQueryKeys.attribution(
        context,
        "NET",
        "TOTAL_RISK",
        "SECTOR",
      ),
    ).not.toEqual(
      performanceRiskQueryKeys.attribution(
        context,
        "NET",
        "TOTAL_RISK",
        "ISSUER",
      ),
    );
  });

  it("keeps one bounded portfolio root for targeted invalidation", () => {
    const context = buildPerformanceRiskQueryContext(workspace, "YTD");
    const key = performanceRiskQueryKeys.attribution(
      context,
      "NET",
      "TOTAL_RISK",
      "SECTOR",
    );

    expect(key.slice(0, 3)).toEqual(
      performanceRiskQueryKeys.portfolio("PB_SG_GLOBAL_BAL_001"),
    );
  });
});
