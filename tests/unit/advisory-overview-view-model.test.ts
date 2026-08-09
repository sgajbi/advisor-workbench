import { describe, expect, it } from "vitest";

import { buildAdvisoryOverviewModel } from "../../src/features/proposals/advisory-overview-view-model";
import type { ProposalSummary } from "../../src/features/proposals/types";

describe("buildAdvisoryOverviewModel", () => {
  it("summarizes advisory posture from proposal lifecycle states", () => {
    const proposals: ProposalSummary[] = [
      {
        proposal_id: "PRP-DRAFT",
        portfolio_id: "PB_SG_GLOBAL_BAL_001",
        current_state: "DRAFT",
        title: "Core fixed income addition",
      },
      {
        proposal_id: "PRP-RISK",
        portfolio_id: "PB_SG_GLOBAL_BAL_001",
        current_state: "RISK_REVIEW",
        title: "Technology concentration trim",
      },
      {
        proposal_id: "PRP-CONSENT",
        portfolio_id: "PB_SG_GLOBAL_BAL_001",
        current_state: "AWAITING_CLIENT_CONSENT",
        title: "Client discussion pack",
      },
      {
        proposal_id: "PRP-READY",
        portfolio_id: "PB_SG_GLOBAL_BAL_001",
        current_state: "EXECUTION_READY",
        title: "Implementation handoff",
      },
    ];

    const model = buildAdvisoryOverviewModel({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      proposals,
    });

    expect(model.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Visible Proposals", value: "4" }),
        expect.objectContaining({ label: "Review Blockers", value: "1", tone: "warn" }),
        expect.objectContaining({ label: "Client Discussion", value: "1" }),
        expect.objectContaining({ label: "Implementation", value: "1" }),
      ])
    );
    expect(model.recommendedAction).toMatch(/Resolve review blockers/);
    expect(model.proposalRows.map((row) => row.proposalId)).toEqual([
      "PRP-RISK",
      "PRP-CONSENT",
      "PRP-DRAFT",
      "PRP-READY",
    ]);
    expect(model.lifecycleStages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "construct", value: "1", valueLabel: "visible draft" }),
        expect.objectContaining({ key: "deliver", value: "2", tone: "warn" }),
        expect.objectContaining({ key: "implement", value: "1" }),
      ])
    );
    expect(model.hasPartialWindow).toBe(false);
    expect(model.sourceWindowLabel).toBe("Complete source window");
  });

  it("keeps lifecycle handoffs portfolio scoped", () => {
    const model = buildAdvisoryOverviewModel({
      portfolioId: "PB SG/001",
      proposals: [],
    });

    expect(model.recommendedAction).toMatch(/build a proposal/);
    expect(model.metrics.find((metric) => metric.label === "Review Blockers")).toMatchObject({
      value: "0",
      tone: "success",
    });
    expect(model.lifecycleStages.find((stage) => stage.key === "construct")).toMatchObject({
      href: "/proposals/simulate?portfolioId=PB%20SG%2F001",
      value: "0",
    });
  });

  it("discloses that metrics and ranking cover a partial source window", () => {
    const model = buildAdvisoryOverviewModel({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      proposals: [
        {
          proposal_id: "PRP-DRAFT",
          portfolio_id: "PB_SG_GLOBAL_BAL_001",
          current_state: "DRAFT",
          title: "Income allocation review",
        },
      ],
      hasMoreResults: true,
      windowNumber: 2,
    });

    expect(model.hasPartialWindow).toBe(true);
    expect(model.sourceWindowLabel).toBe("Proposal window 2");
    expect(model.sourceWindowDetail).toMatch(/only to proposals visible/);
    expect(model.metrics[0]).toMatchObject({
      label: "Visible Proposals",
      value: "1",
      detail: expect.stringContaining("Current source window 2"),
    });
  });
});
