import { describe, expect, it } from "vitest";

import {
  clampMandateHealthPercent,
  findMandateHealthRow,
  formatMandateAction,
  formatMandateAttentionObservation,
  formatMandateHealthDimensionLabel,
  formatMandateHealthDisplayDate,
  formatMandateHealthObservation,
  mandateHealthScoreToPercent,
  mandateHealthSummaryStateLabel,
} from "../../src/features/workbench/manage-mandate-health-helpers";
import type {
  MandateHealthRow,
  ManageExceptionRow,
} from "../../src/features/workbench/manage-workspace-view-model";

const healthRows: MandateHealthRow[] = [
  {
    key: "source-readiness",
    dimension: "SOURCE_READINESS",
    score: "0.82",
    state: "PENDING_REVIEW",
    reasons: "TAX_LOT_SOURCE_PARTIAL",
  },
  {
    key: "mandate-constraints",
    dimension: "MANDATE_CONSTRAINTS",
    score: "98",
    state: "READY",
    reasons: "READY",
  },
];

const exceptionRow: ManageExceptionRow = {
  key: "exception_1",
  mandateId: "mandate_001",
  monitoringRunId: "N/A",
  sourceRunId: "N/A",
  correlationId: "corr_exception_1",
  authority: "lotus-manage:monitoring-exception",
  severity: "HIGH",
  title: "SUSTAINABILITY_PREFERENCES_MISSING",
  source: "lotus-manage",
  owner: "Portfolio Operations",
  age: "Current",
  state: "ACTIVE",
  nextAction: "REVIEW_SUSTAINABILITY_PREFERENCES",
};

describe("manage mandate health helpers", () => {
  it("finds source-owned health rows without recalculating mandate state", () => {
    expect(findMandateHealthRow(healthRows, ["source", "market"])).toBe(healthRows[0]);
    expect(findMandateHealthRow(healthRows, ["benchmark"])).toBeUndefined();
  });

  it("does not fabricate summary labels or meter values", () => {
    expect(mandateHealthSummaryStateLabel(undefined)).toBe("Not available");
    expect(mandateHealthSummaryStateLabel(healthRows[1])).toBe("Ready");
    expect(mandateHealthSummaryStateLabel(healthRows[0])).toBe("Pending Review");
    expect(mandateHealthScoreToPercent("0.82")).toBe(82);
    expect(mandateHealthScoreToPercent("98%")).toBe(98);
    expect(mandateHealthScoreToPercent("not-a-score")).toBeNull();
    expect(mandateHealthScoreToPercent(undefined)).toBeNull();
    expect(clampMandateHealthPercent(101.4)).toBe(100);
    expect(clampMandateHealthPercent(-3)).toBe(0);
  });

  it("formats mandate context and dimension labels for display", () => {
    expect(formatMandateHealthDisplayDate("2026-05-18T00:00:00Z")).toBe("18 May 2026");
    expect(formatMandateHealthDisplayDate("2026-05-18T23:30:00-05:00")).toBe("19 May 2026");
    expect(formatMandateHealthDisplayDate("2026-05-18T00:00:00")).toBe("Not confirmed");
    expect(formatMandateHealthDisplayDate("13 May 2026")).toBe("Not confirmed");
    expect(formatMandateHealthDimensionLabel("source_readiness")).toBe("Market Data Readiness");
    expect(formatMandateHealthDimensionLabel("allocation_drift")).toBe("Allocation Drift");
    expect(formatMandateHealthDimensionLabel("mandate_constraints")).toBe("Mandate Constraints");
  });

  it("formats attention observations and recommended actions from source reason codes", () => {
    expect(formatMandateAttentionObservation(exceptionRow)).toBe(
      "Sustainability preferences require review"
    );
    expect(formatMandateAction("SIMULATE_REBALANCE")).toBe("Review rebalance simulation");
    expect(formatMandateAction("REVIEW_WORKFLOW")).toBe("Review mandate workflow");
    expect(formatMandateAction("REPAIR_SOURCE_DATA")).toBe("Resolve data readiness");
    expect(formatMandateAction("-")).toBe("Not provided by mandate monitoring");
    expect(
      formatMandateAttentionObservation({
        ...exceptionRow,
        title: "SOURCE_RISK_HEALTH_ATTENTION",
        nextAction: "REVIEW_WORKFLOW",
      }),
    ).toBe("Risk posture requires review");
  });

  it("formats health observations without inventing backend decisions", () => {
    expect(formatMandateHealthObservation("ALLOCATION_DRIFT")).toBe("Allocation drift review");
    expect(formatMandateHealthObservation("READY")).toBe("No action required");
    expect(formatMandateHealthObservation("TAX_LOT_SOURCE_PARTIAL")).toBe(
      "Tax-lot data is incomplete",
    );
    expect(formatMandateHealthObservation("SOURCE_RISK_HEALTH_ATTENTION")).toBe(
      "Risk posture requires review",
    );
  });
});
