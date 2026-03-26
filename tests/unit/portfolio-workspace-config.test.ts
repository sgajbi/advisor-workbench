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
      "/risk-and-suitability?portfolioId=PORT_1001"
    );
    expect(mapWorkflowHref("proposal", "PORT_1001")).toBe(
      "/recommendations?portfolioId=PORT_1001"
    );
    expect(mapWorkflowHref("unknown", "PORT_1001")).toBe("/portfolio?portfolioId=PORT_1001");
  });

  it("maps workflow cues into advisor-facing action labels", () => {
    expect(getWorkflowActionLabel("performance")).toBe("Open Performance");
    expect(getWorkflowActionLabel("risk")).toBe("Review Suitability");
    expect(getWorkflowActionLabel("proposal")).toBe("Prepare Recommendation");
    expect(getWorkflowActionLabel("unknown")).toBe("Open Performance");
  });

  it("maps workflow cues into concise task labels", () => {
    expect(getWorkflowTaskLabel("performance")).toBe("Review performance");
    expect(getWorkflowTaskLabel("risk")).toBe("Review suitability");
    expect(getWorkflowTaskLabel("proposal")).toBe("Prepare recommendation");
    expect(getWorkflowTaskLabel("unknown")).toBe("Review performance");
  });

  it("maps warnings and evidence services into advisor-facing labels", () => {
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
