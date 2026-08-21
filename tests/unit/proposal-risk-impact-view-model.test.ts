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
      id: "RISK_REVIEW:proposal-decision.2026-04:MATERIAL_CONCENTRATION_CHANGE",
      type: "Risk Review",
      blocking: true,
      severity: "High",
    });
    expect(model.workflowGate.disclaimer).toContain("does not prove");
    expect(model.lineage.correlationId).toBe("corr-proposal-risk-impact-001");
    expect(model.lineage.contractVersion).toBe("proposal-risk-impact.v1");
    expect(model.lineage.decisionSupportReference).toBe(
      "current_version.proposal_result.proposal_decision_summary",
    );
    expect(model.lineage.workflowGateSupportReference).toBe(
      "current_version.proposal_result.workflow_gate_snapshot",
    );
  });

  it("keeps an unavailable decision register unknown instead of inferring zero blockers", () => {
    const envelope = proposalRiskImpactFixture();
    envelope.data.decision.state = "unavailable";
    envelope.data.decision.approval_requirements = [];
    envelope.data.decision.material_changes = [];
    envelope.data.decision.missing_evidence = [];

    const model = buildProposalRiskImpactModel(envelope);

    expect(model.decision.isAvailable).toBe(false);
    expect(model.decision.blockingCount).toBeNull();
    expect(model.decision.status).toBe("Decision not confirmed");
    expect(model.decision.state.label).toBe("Source evidence unavailable");
  });

  it("formats proposal dates in UTC for deterministic banking records", () => {
    const envelope = proposalRiskImpactFixture();
    envelope.data.version_created_at = "2026-08-19T20:30:00Z";

    expect(buildProposalRiskImpactModel(envelope).identity.recorded).toBe(
      "19 Aug 2026",
    );
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

  it("withholds exact allocation figures when the section is unusable", () => {
    const envelope = proposalRiskImpactFixture();
    envelope.data.allocation.state = "unavailable";

    const model = buildProposalRiskImpactModel(envelope);

    expect(model.allocation.isAvailable).toBe(false);
    expect(model.allocation.views).toEqual([]);
    expect(model.supportability.label).toBe("Partial source evidence");
  });

  it("withholds workflow conclusions when the gate is not ready", () => {
    const envelope = proposalRiskImpactFixture();
    envelope.data.workflow_gate.state = "unavailable";

    const model = buildProposalRiskImpactModel(envelope);

    expect(model.workflowGate.isAvailable).toBe(false);
    expect(model.workflowGate.gate).toBe("Gate not confirmed");
    expect(model.workflowGate.nextStep).toBe(
      "Source next step not confirmed",
    );
    expect(model.workflowGate.reasons).toEqual([]);
  });

  it("withholds risk conclusions when risk evidence is unusable", () => {
    const envelope = proposalRiskImpactFixture();
    envelope.data.risk.state = "not_supported";

    const model = buildProposalRiskImpactModel(envelope);

    expect(model.risk.isAvailable).toBe(false);
    expect(model.risk.highlights).toEqual([]);
    expect(model.risk.summary).toBe(
      "The source has not confirmed proposal risk evidence.",
    );
  });

  it("withholds every core section when aggregate evidence is unavailable", () => {
    const envelope = proposalRiskImpactFixture();
    envelope.data.overall_state = "unavailable";

    const model = buildProposalRiskImpactModel(envelope);

    expect(model.supportability.label).toBe("Source evidence unavailable");
    expect(model.decision.isAvailable).toBe(false);
    expect(model.decision.state.label).toBe("Source evidence unavailable");
    expect(model.allocation.isAvailable).toBe(false);
    expect(model.allocation.state.label).toBe("Source evidence unavailable");
    expect(model.allocation.views).toEqual([]);
    expect(model.risk.isAvailable).toBe(false);
    expect(model.risk.state.label).toBe("Source evidence unavailable");
    expect(model.risk.highlights).toEqual([]);
    expect(model.workflowGate.isAvailable).toBe(false);
    expect(model.workflowGate.state.label).toBe(
      "Source evidence unavailable",
    );
    expect(model.workflowGate.reasons).toEqual([]);
    expect(
      model.capabilities
        .filter(({ key }) =>
          [
            "allocation_comparison",
            "proposal_risk_lens",
            "decision_posture",
            "workflow_gate",
          ].includes(key),
        )
        .map(({ status }) => status),
    ).toEqual(Array(4).fill("Source evidence unavailable"));
  });

  it("names expected allocation dimensions that the source did not return", () => {
    const envelope = proposalRiskImpactFixture();
    envelope.data.allocation.state = "partial";
    envelope.data.allocation.expected_dimensions.push("currency", "sector");

    expect(
      buildProposalRiskImpactModel(envelope).allocation
        .missingExpectedDimensions,
    ).toEqual(["Currency", "Sector"]);
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
