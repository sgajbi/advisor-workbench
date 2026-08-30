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
    created_by: "advisor_1",
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
  {
    proposal_id: "PRP-REJECTED",
    portfolio_id: "PB_SG_GLOBAL_BAL_001",
    current_state: "REJECTED",
    title: "Rejected implementation handoff",
  },
];

describe("proposal lifecycle workspace view model", () => {
  it("filters risk-impact mode to proposals waiting for risk review", () => {
    const model = buildProposalLifecycleWorkspaceModel({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      reviewContext: {
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        asOfDate: "2026-08-21",
        period: "YTD",
        reportingCurrency: "SGD",
      },
      mode: "risk-impact",
      proposals,
    });

    expect(model.title).toBe("Risk and Impact");
    expect(model.totalCount).toBe(1);
    expect(model.attentionCount).toBe(1);
    expect(model.rows).toEqual([
      expect.objectContaining({
        proposalId: "PRP-RISK",
        currentState: "RISK_REVIEW",
        sourcePortfolioId: "PB_SG_GLOBAL_BAL_001",
        readiness: "Blocked",
        version: "Version 3",
        versionNo: 3,
        creator: "Recorded by source",
        createdOn: "19 Aug 2026, 09:30 UTC",
        nextAction: "Risk officer approval needed",
        href: "/proposals/PRP-RISK?portfolioId=PB_SG_GLOBAL_BAL_001&asOfDate=2026-08-21&period=YTD&reportingCurrency=SGD&selectedRecordId=PRP-RISK&fromMode=risk-impact",
      }),
    ]);
  });

  it("retains an absent source portfolio instead of substituting route context", () => {
    const model = buildProposalLifecycleWorkspaceModel({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      mode: "approval-queue",
      proposals: [
        {
          proposal_id: "PRP-UNSCOPED",
          current_state: "RISK_REVIEW",
          current_version_no: 1,
        },
      ],
    });

    expect(model.rows[0]).toMatchObject({
      portfolio: "Not reported",
      sourcePortfolioId: null,
    });
  });

  it("retains implementation handoff, completion, and exception states", () => {
    const model = buildProposalLifecycleWorkspaceModel({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      mode: "implementation",
      proposals,
    });

    expect(model.title).toBe("Implementation Status");
    expect(model.totalCount).toBe(2);
    expect(model.attentionCount).toBe(1);
    expect(model.rows[0]).toMatchObject({
      proposalId: "PRP-READY",
      readiness: "Ready",
      nextAction: "Ready for execution handoff",
      posture:
        "Source lifecycle marks this proposal ready for execution handoff.",
    });
    expect(model.rows[1]).toMatchObject({
      proposalId: "PRP-REJECTED",
      currentState: "REJECTED",
      readiness: "Review",
    });
  });

  it("keeps discussion-pack mode gated instead of client-ready", () => {
    const model = buildProposalLifecycleWorkspaceModel({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      mode: "discussion-pack",
      proposals,
    });

    expect(model.title).toBe("Discussion pack review");
    expect(model.subtitle).toBe(
      "Review the current meeting rationale, decision memo, disclosures and client-use controls.",
    );
    expect(model.emptyTitle).toBe("No discussion packs need review");
    expect(model.totalCount).toBe(1);
    expect(
      `${model.subtitle} ${model.primaryDecision} ${model.recommendedAction}`,
    ).not.toMatch(/client-ready/i);
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
    expect(model.title).toBe("Suitability review");
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
    expect(normalizeProposalLifecycleMode("proposal-builder")).toBe(
      "approval-queue",
    );
    expect(normalizeProposalLifecycleMode("suitability")).toBe("suitability");
  });
});
