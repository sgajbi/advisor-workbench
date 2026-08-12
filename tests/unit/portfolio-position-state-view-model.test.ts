import { describe, expect, it } from "vitest";

import {
  buildPortfolioPositionState,
  buildPortfolioPositionStateSummary,
} from "../../src/apps/portfolio/portfolio-position-state-view-model";

describe("portfolio position state view model", () => {
  it.each([
    {
      input: { reprocessing_status: " current " },
      expected: { kind: "current", label: "Current", tone: "clear" },
    },
    {
      input: { reprocessing_status: "STALE_PRICE" },
      expected: { kind: "review_required", label: "Review required", tone: "warn" },
    },
    {
      input: { reprocessing_status: "SOURCE_STATUS_ADDED_LATER" },
      expected: { kind: "review_required", label: "Review required", tone: "warn" },
    },
    {
      input: { reprocessing_status: "  " },
      expected: { kind: "not_reported", label: "Not reported", tone: "warn" },
    },
    {
      input: { reprocessing_status: null },
      expected: { kind: "not_reported", label: "Not reported", tone: "warn" },
    },
    {
      input: { source_record_type: "cash_balance" as const, reprocessing_status: null },
      expected: { kind: "not_applicable", label: "Not applicable", tone: "neutral" },
    },
  ])("maps source position state to $expected.label", ({ input, expected }) => {
    expect(buildPortfolioPositionState(input)).toEqual(expected);
  });

  it("prioritizes review-required and source-stale evidence without hiding missing status", () => {
    expect(
      buildPortfolioPositionStateSummary(
        [
          { reprocessing_status: "CURRENT" },
          { reprocessing_status: null },
          { reprocessing_status: "REPROCESSING" },
          { source_record_type: "cash_balance", reprocessing_status: null },
        ],
        2,
      ),
    ).toEqual({
      positionCount: 3,
      currentCount: 1,
      reviewRequiredCount: 1,
      notReportedCount: 1,
      staleSourceKeyCount: 2,
      state: "review_required",
      status: "Review required",
      detail:
        "1 position requires review; 1 position status not reported; 2 source keys stale; 1 position status current",
      tone: "warn",
    });
  });

  it("reports an all-current source only when every booked position explicitly says CURRENT", () => {
    expect(
      buildPortfolioPositionStateSummary([
        { reprocessing_status: "CURRENT" },
        { reprocessing_status: " current " },
      ]),
    ).toMatchObject({
      state: "current",
      status: "Current",
      detail: "2 position statuses current",
      tone: "success",
    });
  });

  it("keeps an empty position inventory distinct from a current one", () => {
    expect(
      buildPortfolioPositionStateSummary([
        { source_record_type: "cash_balance", reprocessing_status: null },
      ]),
    ).toMatchObject({
      positionCount: 0,
      state: "empty",
      status: "Empty",
      tone: "default",
    });
  });
});
