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
      reviewContext: { portfolioId: "PB_SG_GLOBAL_BAL_001" },
      proposals,
    });

    expect(model.recommendedAction).toMatch(/Resolve review blockers/);
    expect(model.attentionCount).toBe(4);
    expect(model.proposalRows.map((row) => row.proposalId)).toEqual([
      "PRP-RISK",
      "PRP-CONSENT",
      "PRP-DRAFT",
      "PRP-READY",
    ]);
    expect(model.proposalRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          proposalId: "PRP-RISK",
          status: "Risk review required",
          statusTone: "warn",
          nextAction: "Risk officer approval needed",
        }),
        expect.objectContaining({
          proposalId: "PRP-READY",
          status: "Implementation ready",
          statusTone: "success",
        }),
      ]),
    );
    expect(model.hasPartialWindow).toBe(false);
    expect(model.sourceWindowLabel).toBe("Complete source window");
  });

  it("counts an execution-ready proposal as an implementation follow-up", () => {
    const model = buildAdvisoryOverviewModel({
      reviewContext: { portfolioId: "PB_SG_GLOBAL_BAL_001" },
      proposals: [
        {
          proposal_id: "PRP-READY",
          portfolio_id: "PB_SG_GLOBAL_BAL_001",
          current_state: "EXECUTION_READY",
          title: "Implementation handoff",
        },
      ],
    });

    expect(model.attentionCount).toBe(1);
    expect(model.recommendedAction).toMatch(/implementation/);
  });

  it("keeps the requested review context on proposal handoffs", () => {
    const model = buildAdvisoryOverviewModel({
      reviewContext: {
        portfolioId: "PB SG/001",
        asOfDate: "2026-06-30",
        period: "YTD",
        reportingCurrency: "SGD",
      },
      proposals: [
        {
          proposal_id: "PRP-DRAFT",
          portfolio_id: "PB SG/001",
          current_state: "DRAFT",
          title: "Income allocation review",
        },
      ],
    });

    expect(model.recommendedAction).toMatch(/Submit ready adviser drafts/);
    expect(model.proposalRows[0]).toMatchObject({
      href: "/proposals/PRP-DRAFT?portfolioId=PB+SG%2F001&asOfDate=2026-06-30&period=YTD&reportingCurrency=SGD&selectedRecordId=PRP-DRAFT&fromMode=overview",
      status: "Adviser draft",
    });
  });

  it("normalizes source timestamps to disclosed UTC and fails closed without zone evidence", () => {
    const buildRow = (createdAt: string | undefined) =>
      buildAdvisoryOverviewModel({
        reviewContext: { portfolioId: "PB_SG_GLOBAL_BAL_001" },
        proposals: [
          {
            proposal_id: "PRP-DRAFT",
            portfolio_id: "PB_SG_GLOBAL_BAL_001",
            current_state: "DRAFT",
            title: "Income allocation review",
            created_at: createdAt,
          },
        ],
      }).proposalRows[0];

    expect(buildRow("2026-03-28T16:00:00+08:00").recordedAt).toBe(
      "28 Mar 2026, 08:00 UTC",
    );
    expect(buildRow("2026-03-28T08:00:00").recordedAt).toBe("Not reported");
    expect(buildRow("not-a-timestamp").recordedAt).toBe("Not reported");
    expect(buildRow(undefined).recordedAt).toBe("Not reported");
  });

  it("preserves the exact proposal creator reference and fails closed when it is blank", () => {
    const buildRow = (createdBy: string | undefined) =>
      buildAdvisoryOverviewModel({
        reviewContext: { portfolioId: "PB_SG_GLOBAL_BAL_001" },
        proposals: [
          {
            proposal_id: "PRP-DRAFT",
            portfolio_id: "PB_SG_GLOBAL_BAL_001",
            current_state: "DRAFT",
            title: "Income allocation review",
            created_by: createdBy,
          },
        ],
      }).proposalRows[0];

    expect(buildRow("advisor_sg_01").createdBy).toBe("advisor_sg_01");
    expect(buildRow("   ").createdBy).toBe("Not reported");
    expect(buildRow(undefined).createdBy).toBe("Not reported");
  });

  it("discloses that metrics and ranking cover a partial source window", () => {
    const model = buildAdvisoryOverviewModel({
      reviewContext: { portfolioId: "PB_SG_GLOBAL_BAL_001" },
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
    expect(model.visibleProposalCount).toBe(1);
    expect(model.sourceWindowDetail).toContain("Review adjacent windows");
  });
});
