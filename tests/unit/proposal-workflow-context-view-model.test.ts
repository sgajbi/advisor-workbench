import { describe, expect, it } from "vitest";

import {
  buildNeutralProposalWorkflowContext,
  buildPersistedProposalDraftWorkflowContext,
  buildProposalQueueWorkflowContext,
  buildSimulationProposalWorkflowContext,
  buildSuitabilityReviewWorkflowContext,
} from "@/features/proposals/proposal-workflow-context-view-model";

const baseQueueInput = {
  portfolioId: "PB_SG_GLOBAL_BAL_001",
  modeLabel: "Approval queue",
  isLoading: false,
  isRefreshing: false,
  permissionBlocked: false,
  hasRestrictedEvidence: false,
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
  it("uses policy-review authority for suitability counts and recovery", () => {
    const model = buildSuitabilityReviewWorkflowContext({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      isLoading: false,
      isRefreshing: false,
      permissionBlocked: false,
      hasError: false,
      hasRefreshFailure: true,
      hasUnavailableEvidence: false,
      totalCount: 3,
      actionCount: 2,
    });

    expect(model.state).toBe("partial");
    expect(model.title).toBe("Suitability evidence refresh failed");
    expect(model.facts).toEqual(
      expect.arrayContaining([
        { label: "In review", value: "3" },
        { label: "Need action", value: "2" },
      ]),
    );
    expect(model.blockers).toContain(
      "The latest suitability evidence refresh did not complete.",
    );
    expect(model.sourceLabel).toBe("Gateway-backed suitability policy review");
  });

  it("fails closed when selected suitability evidence has an identity conflict", () => {
    const model = buildSuitabilityReviewWorkflowContext({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      isLoading: false,
      isRefreshing: false,
      permissionBlocked: false,
      hasError: false,
      hasRefreshFailure: false,
      hasUnavailableEvidence: true,
      totalCount: 1,
      actionCount: 1,
      selectedEvidence: {
        proposalId: "PRP-RISK",
        title: "Selected policy evidence is unconfirmed",
        summary: "The selected source identities do not agree.",
        currentPosture: "Source identity conflict",
        nextAction: "Recheck the selected policy identity.",
        blockers: [
          "Selected policy identity does not agree across source evidence.",
        ],
        facts: [{ label: "Proposal", value: "PRP-RISK" }],
        sourceLabel: "Gateway-backed selected suitability evidence",
        boundaryNote: "Source identities must agree.",
        hasEvidenceGap: true,
      },
    });

    expect(model.state).toBe("partial");
    expect(model.title).toBe("Selected policy evidence is unconfirmed");
    expect(model.currentPosture).toBe("Source identity conflict");
    expect(model.nextAction).toContain("Recheck");
  });

  it("keeps the shared shell neutral when no source record is supplied", () => {
    const model = buildNeutralProposalWorkflowContext({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      surfaceLabel: "Proposal lifecycle",
    });

    expect(model.state).toBe("empty");
    expect(model.currentPosture).toBe("No proposal workflow is selected");
    expect(
      [model.title, model.summary, model.currentPosture, model.nextAction].join(
        " ",
      ),
    ).not.toMatch(
      /kyc (is )?(current|verified)|suitability (is )?complete|approved|client ready/i,
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
    expect(model.boundaryNote).toContain(
      "Simulation does not imply suitability review",
    );
  });

  it("publishes source-retained workflow identity only after draft persistence", () => {
    const model = buildPersistedProposalDraftWorkflowContext({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      proposalId: "pp_test_001",
    });

    expect(model.state).toBe("ready");
    expect(model.title).toBe("Advisor draft saved");
    expect(model.facts).toContainEqual({
      label: "Proposal",
      value: "pp_test_001",
    });
    expect(model.currentPosture).toBe("Draft retained for review");
    expect(model.boundaryNote).toContain(
      "does not imply suitability completion",
    );
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
  ])(
    "models $expectedState without fallback authority",
    ({ input, expectedState, expectedTitle }) => {
      const model = buildProposalQueueWorkflowContext({
        ...baseQueueInput,
        ...input,
      });

      expect(model.state).toBe(expectedState);
      expect(model.title).toBe(expectedTitle);
      expect(model.sourceLabel).toBe("Advisory proposal lifecycle");
    },
  );

  it("shows source counts and an explicit queue-level boundary", () => {
    const model = buildProposalQueueWorkflowContext(baseQueueInput);

    expect(model.facts).toEqual(
      expect.arrayContaining([
        { label: "In view", value: "2" },
        { label: "Need action", value: "1" },
      ]),
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
    expect(model.boundaryNote).toContain(
      "do not establish complete queue posture",
    );
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
      "More proposals are available beyond this view.",
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
    expect(model.blockers).toContain(
      "The latest proposal view could not be confirmed.",
    );
    expect(model.nextAction).toContain("Retry the proposal view");
    expect(
      `${model.title} ${model.nextAction} ${model.blockers.join(" ")}`,
    ).not.toMatch(/suitability|policy-evidence/);
  });

  it("keeps failed supporting-evidence refresh guidance specific to suitability", () => {
    const model = buildProposalQueueWorkflowContext({
      ...baseQueueInput,
      hasSupportingEvidenceRefreshFailure: true,
    });

    expect(model.state).toBe("partial");
    expect(model.title).toBe("Supporting evidence is incomplete");
    expect(model.blockers).toContain(
      "The latest supporting-evidence refresh did not complete.",
    );
    expect(model.nextAction).toContain("supporting-evidence refresh");
  });

  it("keeps combined queue and decision-evidence recovery source-neutral", () => {
    const model = buildProposalQueueWorkflowContext({
      ...baseQueueInput,
      hasProposalRefreshFailure: true,
      hasUnavailableEvidence: true,
    });

    expect(model.nextAction).toContain("supporting decision evidence");
    expect(model.nextAction).not.toMatch(/policy|suitability/i);
  });

  it("keeps selected evidence restriction distinct from portfolio workflow access", () => {
    const model = buildProposalQueueWorkflowContext({
      ...baseQueueInput,
      hasRestrictedEvidence: true,
    });

    expect(model.state).toBe("partial");
    expect(model.title).toBe("Supporting evidence is restricted");
    expect(model.currentPosture).toBe("2 proposals in current view");
    expect(model.nextAction).toContain("required supporting decision evidence");
    expect(`${model.summary} ${model.blockers.join(" ")}`).not.toMatch(
      /portfolio's entire|workflow details are hidden/i,
    );
  });

  it.each([
    { permissionBlocked: true, hasRestrictedEvidence: false },
    { permissionBlocked: false, hasRestrictedEvidence: true },
  ])(
    "omits cached selected facts across permission boundaries",
    (permissionState) => {
      const model = buildProposalQueueWorkflowContext({
        ...baseQueueInput,
        ...permissionState,
        selectedEvidence: {
          proposalId: "PRP-RESTRICTED",
          title: "Cached selected decision",
          summary: "Cached evidence summary",
          currentPosture: "Cached approval posture",
          nextAction: "Cached selected action",
          blockers: ["Cached selected blocker"],
          facts: [
            { label: "Proposal", value: "PRP-RESTRICTED" },
            { label: "Approval records", value: "2" },
            { label: "Active version", value: "4" },
          ],
          sourceLabel: "Cached selected evidence",
          boundaryNote: "Cached selected boundary",
          hasEvidenceGap: false,
        },
      });

      expect(model.facts).not.toEqual(
        expect.arrayContaining([
          { label: "Proposal", value: "PRP-RESTRICTED" },
        ]),
      );
      expect(model.facts.map((fact) => fact.label)).not.toContain(
        "Approval records",
      );
      expect(model.facts.map((fact) => fact.label)).not.toContain(
        "Active version",
      );
      expect(model.sourceLabel).toBe("Advisory proposal lifecycle");
      expect(
        `${model.title} ${model.summary} ${model.currentPosture}`,
      ).not.toMatch(/cached/i);
    },
  );
});
