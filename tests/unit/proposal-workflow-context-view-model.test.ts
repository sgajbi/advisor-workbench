import { describe, expect, it } from "vitest";

import {
  buildNeutralProposalWorkflowContext,
  buildPersistedProposalDraftWorkflowContext,
  buildProposalQueueWorkflowContext,
  buildSimulationProposalWorkflowContext,
} from "@/features/proposals/proposal-workflow-context-view-model";

const baseQueueInput = {
  portfolioId: "PB_SG_GLOBAL_BAL_001",
  modeLabel: "Approval queue",
  isLoading: false,
  isRefreshing: false,
  permissionBlocked: false,
  hasError: false,
  hasUnavailableEvidence: false,
  hasProposalRefreshFailure: false,
  hasSupportingEvidenceRefreshFailure: false,
  hasMoreResults: false,
  hasPreviousResults: false,
  windowNumber: 1,
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

  it("publishes source-retained workflow identity only after draft persistence", () => {
    const model = buildPersistedProposalDraftWorkflowContext({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      proposalId: "pp_test_001",
    });

    expect(model.state).toBe("ready");
    expect(model.title).toBe("Advisor draft saved");
    expect(model.facts).toContainEqual({ label: "Proposal", value: "pp_test_001" });
    expect(model.currentPosture).toBe("Draft retained for review");
    expect(model.boundaryNote).toContain("does not imply suitability completion");
  });

  it.each([
    {
      expectedState: "refreshing",
      input: { isRefreshing: true },
      expectedTitle: "Refreshing proposal evidence",
    },
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
      input: { hasUnavailableEvidence: true },
      expectedTitle: "Supporting evidence is incomplete",
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
    expect(model.sourceLabel).toBe("Advisory proposal lifecycle");
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
    expect(model.responsivePriority).toBe("persistent");
  });

  it("publishes an explicit supplementary responsive priority when the main workspace owns queue posture", () => {
    const model = buildProposalQueueWorkflowContext({
      ...baseQueueInput,
      responsivePriority: "supplementary",
    });

    expect(model.responsivePriority).toBe("supplementary");
  });

  it("does not let an empty proposal queue mask unavailable suitability evidence", () => {
    const model = buildProposalQueueWorkflowContext({
      ...baseQueueInput,
      totalCount: 0,
      attentionCount: 0,
      hasUnavailableEvidence: true,
    });

    expect(model.state).toBe("partial");
    expect(model.title).toBe("Supporting evidence is incomplete");
    expect(model.currentPosture).toBe("0 proposals in current view");
    expect(model.blockers).toEqual([
      "One or more supporting decision-evidence sources are unavailable.",
    ]);
    expect(model.boundaryNote).toContain("do not establish complete queue posture");
  });

  it("keeps an empty first window partial while more proposals remain", () => {
    const model = buildProposalQueueWorkflowContext({
      ...baseQueueInput,
      totalCount: 0,
      attentionCount: 0,
      hasMoreResults: true,
    });

    expect(model.state).toBe("partial");
    expect(model.title).toBe("More proposals available");
    expect(model.nextAction).toContain("next proposals");
    expect(model.blockers).toContain(
      "More proposals are available beyond this view."
    );
  });

  it("does not describe a terminal continuation window as the complete queue", () => {
    const model = buildProposalQueueWorkflowContext({
      ...baseQueueInput,
      totalCount: 0,
      attentionCount: 0,
      hasPreviousResults: true,
      windowNumber: 2,
    });

    expect(model.state).toBe("partial");
    expect(model.title).toBe("Current proposal view");
    expect(model.facts).toContainEqual({ label: "Current view", value: "2" });
    expect(model.boundaryNote).toContain("proposals shown in this view");
  });

  it("describes a failed proposal refresh as queue posture rather than policy evidence", () => {
    const model = buildProposalQueueWorkflowContext({
      ...baseQueueInput,
      hasProposalRefreshFailure: true,
    });

    expect(model.state).toBe("partial");
    expect(model.title).toBe("Proposal view is incomplete");
    expect(model.blockers).toContain("The latest proposal view could not be confirmed.");
    expect(model.nextAction).toContain("Retry the proposal view");
    expect(`${model.title} ${model.nextAction} ${model.blockers.join(" ")}`).not.toMatch(
      /suitability|policy-evidence/
    );
  });

  it("keeps failed supporting-evidence refresh guidance specific to suitability", () => {
    const model = buildProposalQueueWorkflowContext({
      ...baseQueueInput,
      hasSupportingEvidenceRefreshFailure: true,
    });

    expect(model.state).toBe("partial");
    expect(model.title).toBe("Supporting evidence is incomplete");
    expect(model.blockers).toContain("The latest supporting-evidence refresh did not complete.");
    expect(model.nextAction).toContain("supporting-evidence refresh");
  });
});
