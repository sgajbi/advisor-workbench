import { describe, expect, it } from "vitest";

import {
  buildProposalLifecycleWorkspaceModel,
  normalizeProposalLifecycleMode,
} from "../../src/features/proposals/proposal-lifecycle-workspace-view-model";
import type { ProposalSummary } from "../../src/features/proposals/types";

const proposals: ProposalSummary[] = [
  {
    proposal_id: "PRP-DRAFT",
    portfolio_id: "PB_SG_GLOBAL_BAL_001",
    current_state: "DRAFT",
    title: "Core income idea",
  },
  {
    proposal_id: "PRP-RISK",
    portfolio_id: "PB_SG_GLOBAL_BAL_001",
    current_state: "RISK_REVIEW",
    current_version_no: 3,
    created_at: "2026-08-19T09:30:00Z",
    title: "Technology concentration trim",
  },
  {
    proposal_id: "PRP-CONSENT",
    portfolio_id: "PB_SG_GLOBAL_BAL_001",
    current_state: "AWAITING_CLIENT_CONSENT",
    title: "Client consent package",
  },
  {
    proposal_id: "PRP-READY",
    portfolio_id: "PB_SG_GLOBAL_BAL_001",
    current_state: "EXECUTION_READY",
    title: "Execution handoff",
  },
];

describe("proposal lifecycle workspace view model", () => {
  it("filters risk-impact mode to proposals waiting for risk review", () => {
    const model = buildProposalLifecycleWorkspaceModel({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      mode: "risk-impact",
      proposals,
    });

    expect(model.title).toBe("Risk And Impact");
    expect(model.totalCount).toBe(1);
    expect(model.attentionCount).toBe(1);
    expect(model.rows).toEqual([
      expect.objectContaining({
        proposalId: "PRP-RISK",
        readiness: "Blocked",
        version: "Version 3",
        createdOn: "19 Aug 2026",
        nextAction: "Risk officer approval needed",
        href:
          "/proposals/PRP-RISK?portfolioId=PB_SG_GLOBAL_BAL_001&fromMode=risk-impact",
      }),
    ]);
  });

  it("filters implementation mode to execution-ready proposals", () => {
    const model = buildProposalLifecycleWorkspaceModel({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      mode: "implementation",
      proposals,
    });

    expect(model.title).toBe("Implementation Status");
    expect(model.totalCount).toBe(1);
    expect(model.attentionCount).toBe(0);
    expect(model.rows[0]).toMatchObject({
      proposalId: "PRP-READY",
      readiness: "Ready",
      nextAction: "Ready for execution handoff",
      posture: "Source lifecycle marks this proposal ready for execution handoff.",
    });
  });

  it("keeps discussion-pack mode gated instead of client-ready", () => {
    const model = buildProposalLifecycleWorkspaceModel({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      mode: "discussion-pack",
      proposals,
    });

    expect(model.title).toBe("Discussion Pack Review");
    expect(model.totalCount).toBe(1);
    expect(`${model.subtitle} ${model.primaryDecision} ${model.recommendedAction}`).not.toMatch(
      /client-ready/i
    );
    expect(model.rows[0]).toMatchObject({
      proposalId: "PRP-CONSENT",
      readiness: "Pending",
    });
  });

  it("does not declare a filtered queue clear while adjacent proposal views remain", () => {
    const model = buildProposalLifecycleWorkspaceModel({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      mode: "suitability",
      proposals: [proposals[0]],
      hasMoreResults: true,
    });

    expect(model.totalCount).toBe(0);
    expect(model.emptyTitle).toBe("No matching proposals in this view");
    expect(model.emptyBody).toContain("Review the next proposals");
    expect(model.emptyTitle).not.toBe("No suitability items need review");
  });

  it("guides advisors back when only earlier proposal views can contain matches", () => {
    const model = buildProposalLifecycleWorkspaceModel({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      mode: "implementation",
      proposals: [proposals[0]],
      hasPreviousResults: true,
    });

    expect(model.emptyTitle).toBe("No matching proposals in this view");
    expect(model.emptyBody).toContain("Return to the previous proposals");
  });

  it("normalizes unsupported route modes to approval queue", () => {
    expect(normalizeProposalLifecycleMode("overview")).toBe("approval-queue");
    expect(normalizeProposalLifecycleMode("proposal-builder")).toBe("approval-queue");
    expect(normalizeProposalLifecycleMode("suitability")).toBe("suitability");
  });
});
