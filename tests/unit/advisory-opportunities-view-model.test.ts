import { describe, expect, it } from "vitest";

import { buildAdvisoryOpportunitiesModel } from "../../src/features/proposals/advisory-opportunities-view-model";
import type { ProposalSummary } from "../../src/features/proposals/types";

describe("buildAdvisoryOpportunitiesModel", () => {
  it("uses draft proposals as advisor idea candidates", () => {
    const proposals: ProposalSummary[] = [
      {
        proposal_id: "PRP-DRAFT",
        portfolio_id: "PB_SG_GLOBAL_BAL_001",
        current_state: "DRAFT",
        title: "Emerging markets sleeve",
        created_by: "rm_1",
        created_at: "2026-05-25T01:00:00Z",
      },
      {
        proposal_id: "PRP-RISK",
        portfolio_id: "PB_SG_GLOBAL_BAL_001",
        current_state: "RISK_REVIEW",
        title: "Risk review item",
      },
    ];

    const model = buildAdvisoryOpportunitiesModel({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      proposals,
    });

    expect(model.draftCount).toBe(1);
    expect(model.recommendedAction).toMatch(/Open a draft idea/);
    expect(model.rows).toEqual([
      expect.objectContaining({
        proposalId: "PRP-DRAFT",
        title: "Emerging markets sleeve",
        advisor: "rm_1",
        nextAction: "Submit for risk or compliance review",
      }),
    ]);
  });

  it("keeps an empty idea queue action-oriented", () => {
    const model = buildAdvisoryOpportunitiesModel({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      proposals: [],
    });

    expect(model.draftCount).toBe(0);
    expect(model.rows).toEqual([]);
    expect(model.recommendedAction).toMatch(/Start with the live portfolio book/);
  });
});
