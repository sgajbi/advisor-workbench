import { describe, expect, it } from "vitest";

import {
  businessStateLabel,
  formatBusinessReason,
  projectBusinessReason,
  projectBusinessState,
} from "../../src/copy/business-state-copy";

describe("business state copy", () => {
  it("presents known source states in concise business language", () => {
    expect(businessStateLabel("READY")).toBe("Ready");
    expect(businessStateLabel("PM_REVIEW_REQUIRED")).toBe(
      "Portfolio manager review required",
    );
    expect(businessStateLabel("PENDING")).toBe("In progress");
    expect(businessStateLabel("AWAITING_REVIEW")).toBe("Awaiting review");
    expect(businessStateLabel("UNSUPPORTED")).toBe("Not supported");
  });

  it("maps representative Manage actions and reasons explicitly", () => {
    expect(formatBusinessReason("SUSTAINABILITY_REVIEW_REQUIRED")).toBe(
      "Sustainability review required",
    );
    expect(formatBusinessReason("ALLOCATION_DRIFT_NOT_ASSESSED")).toBe(
      "Allocation drift not assessed",
    );
    expect(formatBusinessReason("SIMULATE_REBALANCE")).toBe(
      "Simulate rebalance",
    );
    expect(
      formatBusinessReason("PERFORMANCE_WORKSPACE_SUMMARY_UNAVAILABLE"),
    ).toBe("Performance summary unavailable");
  });

  it("fails closed for unknown values while retaining exact support evidence", () => {
    expect(projectBusinessState("NEW_SOURCE_STATE")).toEqual({
      label: "Review required",
      sourceValue: "NEW_SOURCE_STATE",
      known: false,
    });
    expect(projectBusinessReason("NEW_REASON_CODE")).toEqual({
      label: "Review required",
      sourceValue: "NEW_REASON_CODE",
      known: false,
    });
  });

  it("keeps missing evidence explicit without inventing a source value", () => {
    expect(projectBusinessState(undefined)).toEqual({
      label: "Not available",
      sourceValue: null,
      known: true,
    });
    expect(projectBusinessReason(null)).toEqual({
      label: "-",
      sourceValue: null,
      known: true,
    });
  });
});
