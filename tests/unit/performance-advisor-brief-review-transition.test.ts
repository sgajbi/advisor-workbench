import { describe, expect, it } from "vitest";

import { buildAdvisorBriefHumanReview } from "../../src/apps/performance/advisor-brief/advisor-brief-review-evidence";
import { isConfirmedAdvisorBriefReviewTransition } from "../../src/apps/performance/advisor-brief/advisor-brief-review-transition";
import type {
  WorkbenchAdvisorBriefWorkflowPackRun,
  WorkbenchAdvisorBriefWorkflowPackRunReviewActionRequest,
} from "../../src/features/workbench/types";

const baseRun: WorkbenchAdvisorBriefWorkflowPackRun = {
  run_id: "packrun-advisor-brief-1",
  runtime_state: "COMPLETED",
  review_state: "ACCEPTED",
  latest_review_event_at: "2026-04-21T03:22:00Z",
  latest_review_actor: "advisor_1",
  review_transition_count: 1,
  has_review_history: true,
  allowed_review_actions: [],
  supportability_status: "READY",
  review_pending: false,
  superseded: false,
  workflow_authority_owner: "lotus-ai",
  current_summary_note: "Review recorded.",
  replacement_run_id: null,
  findings: [],
};

const acceptPayload: WorkbenchAdvisorBriefWorkflowPackRunReviewActionRequest = {
  action_type: "ACCEPT",
  reviewed_by: "advisor_1",
  reason: "Evidence supports permitted internal use.",
};

const awaitingRun: WorkbenchAdvisorBriefWorkflowPackRun = {
  ...baseRun,
  review_state: "AWAITING_REVIEW",
  latest_review_event_at: null,
  latest_review_actor: null,
  review_transition_count: 0,
  has_review_history: false,
  allowed_review_actions: ["ACCEPT", "REJECT"],
  supportability_status: "ACTION_REQUIRED",
  review_pending: true,
  current_summary_note: "Review required.",
};

function isConfirmed({
  run = baseRun,
  payload = acceptPayload,
  portfolioId = "PF_1001",
  expectedPortfolioId = "PF_1001",
  expectedRunId = "packrun-advisor-brief-1",
  previousRun = awaitingRun,
}: {
  run?: WorkbenchAdvisorBriefWorkflowPackRun;
  payload?: WorkbenchAdvisorBriefWorkflowPackRunReviewActionRequest;
  portfolioId?: string;
  expectedPortfolioId?: string;
  expectedRunId?: string | null;
  previousRun?: WorkbenchAdvisorBriefWorkflowPackRun | null;
} = {}) {
  return isConfirmedAdvisorBriefReviewTransition({
    response: { portfolio_id: portfolioId, workflow_pack_run: run },
    payload,
    expectedPortfolioId,
    expectedRunId,
    previousRun,
  });
}

describe("advisor brief review transition evidence", () => {
  it("accepts a matching source-recorded transition", () => {
    expect(isConfirmed()).toBe(true);
  });

  it.each([
    "ACCEPTED",
    "REJECTED",
    "REVISED",
    "SUPERSEDED",
    "ABANDONED",
    "NOT_REVIEW_REQUIRED",
  ])(
    "fails a contradictory pending %s read posture closed to unavailable",
    (reviewState) => {
      expect(
        buildAdvisorBriefHumanReview({
          ...baseRun,
          review_state: reviewState,
          review_pending: true,
        })
      ).toEqual({ state: "unavailable", sourceRecorded: false });
    }
  );

  it.each(["REVIEW_REQUIRED", "PENDING", "UNRECOGNIZED"])(
    "fails unlabeled review-state alias %s closed to unavailable",
    (reviewState) => {
      expect(
        buildAdvisorBriefHumanReview({
          ...baseRun,
          review_state: reviewState,
          review_pending: false,
        }),
      ).toEqual({ state: "unavailable", sourceRecorded: false });
    },
  );

  it.each([
    ["portfolio", { portfolioId: "PF_OTHER" }],
    ["run", { run: { ...baseRun, run_id: "packrun-other" } }],
    ["state", { run: { ...baseRun, review_state: "AWAITING_REVIEW" } }],
    ["actor", { run: { ...baseRun, latest_review_actor: "advisor_other" } }],
    ["event time", { run: { ...baseRun, latest_review_event_at: "not-a-date" } }],
    [
      "calendar date",
      { run: { ...baseRun, latest_review_event_at: "2026-02-30T03:22:00Z" } },
    ],
    [
      "timezone",
      { run: { ...baseRun, latest_review_event_at: "2026-04-21T11:22:00+08:00" } },
    ],
    ["transition count", { run: { ...baseRun, review_transition_count: 0 } }],
    ["fractional transition count", { run: { ...baseRun, review_transition_count: 0.5 } }],
    ["non-finite transition count", { run: { ...baseRun, review_transition_count: Infinity } }],
    ["history flag", { run: { ...baseRun, has_review_history: false } }],
    ["pending posture", { run: { ...baseRun, review_pending: true } }],
    ["superseded posture", { run: { ...baseRun, superseded: true } }],
    [
      "replacement lineage",
      { run: { ...baseRun, replacement_run_id: "packrun-replacement-2" } },
    ],
  ] as const)("rejects a mismatched or malformed %s", (_label, overrides) => {
    expect(isConfirmed(overrides)).toBe(false);
  });

  it("requires matching replacement lineage for revision and supersede actions", () => {
    const payload: WorkbenchAdvisorBriefWorkflowPackRunReviewActionRequest = {
      action_type: "REVISE",
      reviewed_by: "advisor_1",
      reason: "A replacement brief is required.",
      replacement_run_id: "packrun-replacement-2",
    };
    const revisedRun = {
      ...baseRun,
      review_state: "REVISED",
      superseded: true,
      replacement_run_id: "packrun-replacement-2",
    };

    expect(isConfirmed({ run: revisedRun, payload })).toBe(true);
    expect(
      isConfirmed({
        run: { ...revisedRun, replacement_run_id: "packrun-other" },
        payload,
      })
    ).toBe(false);
  });

  it.each([
    [
      "transition count",
      { ...awaitingRun, review_transition_count: 1, has_review_history: true },
    ],
    [
      "event time",
      {
        ...awaitingRun,
        latest_review_event_at: "2026-04-21T03:22:00Z",
        latest_review_actor: "advisor_previous",
        review_transition_count: 0,
        has_review_history: true,
      },
    ],
  ])("rejects a response that does not advance the prior %s", (_label, previousRun) => {
    expect(isConfirmed({ previousRun })).toBe(false);
  });

  it("accepts a response only when both prior count and event time advance", () => {
    expect(
      isConfirmed({
        previousRun: {
          ...awaitingRun,
          latest_review_event_at: "2026-04-21T03:20:00Z",
          latest_review_actor: "advisor_previous",
          review_transition_count: 0,
          has_review_history: true,
        },
      })
    ).toBe(true);
  });
});
