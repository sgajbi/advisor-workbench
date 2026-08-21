import { describe, expect, it } from "vitest";

import { buildProposalRiskImpactModel } from "../../src/features/proposals/proposal-risk-impact-view-model";
import { proposalRiskImpactFixture } from "../fixtures/proposal-risk-impact";

describe("proposal risk and impact view model", () => {
  it("presents source-owned evidence as a decision brief without inferring approval", () => {
    const model = buildProposalRiskImpactModel(proposalRiskImpactFixture());

    expect(model.identity).toMatchObject({
      title: "Technology concentration trim",
      stage: "Risk Review",
      version: "Version 3",
    });
    expect(model.supportability.label).toBe("Source evidence ready");
    expect(model.decision.summary).toBe(
      "Review the proposed reduction in concentrated equity exposure.",
    );
    expect(model.decision.activeRequirements[0]).toMatchObject({
      type: "Risk Review",
      blocking: true,
      severity: "High",
    });
    expect(model.workflowGate.disclaimer).toContain("does not prove");
    expect(model.lineage.correlationId).toBe("corr-proposal-risk-impact-001");
  });

  it("keeps current and proposed source values separate without calculating a delta", () => {
    const model = buildProposalRiskImpactModel(proposalRiskImpactFixture());
    const equity = model.allocation.views[0]?.rows[0];

    expect(equity).toMatchObject({
      label: "Equity",
      currentWeight: "68%",
      currentValue: "USD 850,000.00",
      proposedWeight: "62%",
      proposedValue: "USD 775,000.00",
    });
    expect(equity).not.toHaveProperty("delta");
  });

  it("makes unsupported capability boundaries visible", () => {
    const model = buildProposalRiskImpactModel(proposalRiskImpactFixture());

    expect(model.capabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "benchmark_and_limits",
          name: "Benchmark and limits",
          status: "Not supported",
          tone: "warn",
        }),
        expect.objectContaining({
          key: "scenario_analysis",
          name: "Scenario analysis",
          tone: "warn",
        }),
        expect.objectContaining({
          key: "valuation_as_of",
          name: "Valuation as of",
          tone: "warn",
        }),
      ]),
    );
  });

  it("preserves partial evidence and blocking missing-evidence posture", () => {
    const envelope = proposalRiskImpactFixture();
    envelope.data.overall_state = "partial";
    envelope.data.decision.missing_evidence = [
      {
        evidence_type: "CLIENT_CONTEXT",
        reason_code: "CLIENT_CONTEXT_MISSING",
        summary: "Current client context must be confirmed.",
        blocking: true,
        evidence_refs: [],
      },
    ];

    const model = buildProposalRiskImpactModel(envelope);
    expect(model.supportability.label).toBe("Partial source evidence");
    expect(model.decision.blockingCount).toBe(2);
    expect(model.decision.missingEvidence[0]).toMatchObject({
      type: "Client Context",
      blocking: true,
    });
  });
});
