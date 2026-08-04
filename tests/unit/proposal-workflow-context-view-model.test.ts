import { describe, expect, it } from "vitest";

import {
  buildNeutralProposalWorkflowContext,
  buildProposalQueueWorkflowContext,
  buildSimulationProposalWorkflowContext,
} from "@/features/proposals/proposal-workflow-context-view-model";

const baseQueueInput = {
  portfolioId: "PB_SG_GLOBAL_BAL_001",
  modeLabel: "Approval queue",
  isLoading: false,
  permissionBlocked: false,
  hasError: false,
  hasPartialEvidence: false,
  totalCount: 2,
  attentionCount: 1,
  primaryDecision: "Which proposals require review?",
  recommendedAction: "Review the proposal with an open decision.",
};

describe("proposal workflow context view model", () => {
  it("keeps the shared shell neutral when no source record is supplied", () => {
    const model = buildNeutralProposalWorkflowContext({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      surfaceLabel: "Proposal lifecycle",
    });

    expect(model.state).toBe("empty");
    expect(model.currentPosture).toBe("No proposal workflow is selected");
    expect([model.title, model.summary, model.currentPosture, model.nextAction].join(" ")).not.toMatch(
      /kyc (is )?(current|verified)|suitability (is )?complete|approved|client ready/i
    );
    expect(model.boundaryNote).toContain("No approval");
  });

  it("keeps simulation separate from persisted workflow truth", () => {
    const model = buildSimulationProposalWorkflowContext({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
    });

    expect(model.state).toBe("empty");
    expect(model.title).toBe("Draft not yet persisted");
    expect(model.sourceLabel).toBe("No persisted advisory workflow record");
    expect(model.boundaryNote).toContain("Simulation does not imply suitability review");
  });

  it.each([
    {
      expectedState: "loading",
      input: { isLoading: true },
      expectedTitle: "Loading proposal posture",
    },
    {
      expectedState: "permission_blocked",
      input: { permissionBlocked: true },
      expectedTitle: "Proposal posture is restricted",
    },
    {
      expectedState: "error",
      input: { hasError: true },
      expectedTitle: "Proposal posture is unavailable",
    },
    {
      expectedState: "empty",
      input: { totalCount: 0, attentionCount: 0 },
      expectedTitle: "No proposals in this queue",
    },
    {
      expectedState: "partial",
      input: { hasPartialEvidence: true },
      expectedTitle: "Supporting evidence is unavailable",
    },
    {
      expectedState: "ready",
      input: {},
      expectedTitle: "1 need attention",
    },
  ])("models $expectedState without fallback authority", ({ input, expectedState, expectedTitle }) => {
    const model = buildProposalQueueWorkflowContext({ ...baseQueueInput, ...input });

    expect(model.state).toBe(expectedState);
    expect(model.title).toBe(expectedTitle);
    expect(model.sourceLabel).toContain("Gateway");
  });

  it("shows source counts and an explicit queue-level boundary", () => {
    const model = buildProposalQueueWorkflowContext(baseQueueInput);

    expect(model.facts).toEqual(
      expect.arrayContaining([
        { label: "In view", value: "2" },
        { label: "Need action", value: "1" },
      ])
    );
    expect(model.blockers).toEqual(["1 proposal needs advisor action."]);
    expect(model.boundaryNote).toContain("queue-level posture");
  });

  it("does not let an empty proposal queue mask unavailable suitability evidence", () => {
    const model = buildProposalQueueWorkflowContext({
      ...baseQueueInput,
      totalCount: 0,
      attentionCount: 0,
      hasPartialEvidence: true,
    });

    expect(model.state).toBe("partial");
    expect(model.title).toBe("Supporting evidence is unavailable");
    expect(model.currentPosture).toBe("No proposals in view; evidence incomplete");
    expect(model.blockers).toEqual([
      "One or more supporting policy-evidence sources are unavailable.",
    ]);
    expect(model.boundaryNote).toContain("do not establish suitability posture");
  });
});
