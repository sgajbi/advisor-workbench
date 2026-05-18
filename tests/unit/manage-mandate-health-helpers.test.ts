import { describe, expect, it } from "vitest";

import {
  clampMandateHealthPercent,
  findMandateHealthRow,
  formatMandateAction,
  formatMandateAttentionObservation,
  formatMandateHealthDimensionLabel,
  formatMandateHealthDisplayDate,
  formatMandateHealthObservation,
  formatMandateRecommendedDetail,
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
    recommendedAction: "REVIEW_WORKFLOW",
  },
  {
    key: "mandate-constraints",
    dimension: "MANDATE_CONSTRAINTS",
    score: "98",
    state: "READY",
    reasons: "READY",
    recommendedAction: "N/A",
  },
];

const exceptionRow: ManageExceptionRow = {
  key: "exception_1",
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

  it("keeps summary labels and meter values deterministic", () => {
    expect(mandateHealthSummaryStateLabel(undefined, "On Track")).toBe("On Track");
    expect(mandateHealthSummaryStateLabel(healthRows[1], "Compliant")).toBe("Compliant");
    expect(mandateHealthSummaryStateLabel(healthRows[0], "On Track")).toBe("Pending Review");
    expect(mandateHealthScoreToPercent("0.82", 50)).toBe(82);
    expect(mandateHealthScoreToPercent("98%", 50)).toBe(98);
    expect(mandateHealthScoreToPercent("not-a-score", 50)).toBe(50);
    expect(clampMandateHealthPercent(101.4)).toBe(100);
    expect(clampMandateHealthPercent(-3)).toBe(0);
  });

  it("formats mandate context and dimension labels for display", () => {
    expect(formatMandateHealthDisplayDate("2026-05-18T00:00:00Z")).toBe("18 May 2026");
    expect(formatMandateHealthDisplayDate("13 May 2026")).toBe("13 May 2026");
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
    expect(formatMandateAction("-")).toBe("No action required");
  });

  it("formats health observations and details without inventing backend decisions", () => {
    expect(formatMandateHealthObservation("ALLOCATION_DRIFT")).toBe("Allocation drift review");
    expect(formatMandateHealthObservation("READY")).toBe("No action required");
    expect(formatMandateRecommendedDetail("CASH_RANGE_REVIEW")).toBe(
      "Confirm tactical cash position remains within mandate tolerance."
    );
    expect(formatMandateRecommendedDetail("Advisor note pending")).toBe("Advisor note pending");
  });
});
