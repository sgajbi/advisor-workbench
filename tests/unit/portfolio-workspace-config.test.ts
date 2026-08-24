import { describe, expect, it } from "vitest";

import {
  getCoverageWarningLabel,
  getEvidenceServiceLabel,
  getWorkflowActionLabel,
  getWorkflowTaskLabel,
  mapWorkflowHref,
} from "@/apps/portfolio/workspace-config";

describe("portfolio workspace config", () => {
  it("maps workflow cues into front-office routes", () => {
    expect(mapWorkflowHref("performance", "PORT 1001")).toBe(
      "/performance?portfolioId=PORT%201001"
    );
    expect(mapWorkflowHref("risk", "PORT_1001")).toBe(
      "/performance?portfolioId=PORT_1001&mode=risk"
    );
    expect(mapWorkflowHref("unknown", "PORT_1001")).toBe("/portfolio?portfolioId=PORT_1001");
  });

  it("maps workflow cues into advisor-facing action labels", () => {
    expect(getWorkflowActionLabel("performance")).toBe("Performance");
    expect(getWorkflowActionLabel("risk")).toBe("Open Risk");
    expect(getWorkflowActionLabel("unknown")).toBe("Performance");
  });

  it("maps workflow cues into concise task labels", () => {
    expect(getWorkflowTaskLabel("performance")).toBe("Review performance");
    expect(getWorkflowTaskLabel("risk")).toBe("Review risk");
    expect(getWorkflowTaskLabel("unknown")).toBe("Review performance");
  });

  it("maps warnings and evidence services into advisor-facing labels", () => {
    expect(getCoverageWarningLabel("PORTFOLIO_CASH_BALANCES_UNAVAILABLE")).toBe(
      "Cash balances temporarily unavailable"
    );
    expect(getCoverageWarningLabel("PORTFOLIO_AUM_UNAVAILABLE")).toBe(
      "Portfolio value temporarily unavailable"
    );
    expect(getCoverageWarningLabel("FOUNDATION_REPORTING_UNAVAILABLE")).toBe(
      "Reporting temporarily unavailable"
    );
    expect(getCoverageWarningLabel("FOUNDATION_PERFORMANCE_INVALID")).toBe(
      "Performance data needs review"
    );
    expect(getEvidenceServiceLabel("lotus-report")).toBe("Reporting");
    expect(getEvidenceServiceLabel("lotus-performance")).toBe("Performance");
    expect(getEvidenceServiceLabel("custom-service")).toBe("Custom Service");
  });
});
