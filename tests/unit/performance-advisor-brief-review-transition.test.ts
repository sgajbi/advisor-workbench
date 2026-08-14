import { describe, expect, it } from "vitest";

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

function isConfirmed({
  run = baseRun,
  payload = acceptPayload,
  portfolioId = "PF_1001",
  expectedPortfolioId = "PF_1001",
  expectedRunId = "packrun-advisor-brief-1",
}: {
  run?: WorkbenchAdvisorBriefWorkflowPackRun;
  payload?: WorkbenchAdvisorBriefWorkflowPackRunReviewActionRequest;
  portfolioId?: string;
  expectedPortfolioId?: string;
  expectedRunId?: string | null;
} = {}) {
  return isConfirmedAdvisorBriefReviewTransition({
    response: { portfolio_id: portfolioId, workflow_pack_run: run },
    payload,
    expectedPortfolioId,
    expectedRunId,
  });
}

describe("advisor brief review transition evidence", () => {
  it("accepts a matching source-recorded transition", () => {
    expect(isConfirmed()).toBe(true);
  });

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
    ["history flag", { run: { ...baseRun, has_review_history: false } }],
    ["pending posture", { run: { ...baseRun, review_pending: true } }],
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
});
