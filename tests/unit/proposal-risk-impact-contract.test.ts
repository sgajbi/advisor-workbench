import { describe, expect, it } from "vitest";

import { parseProposalRiskImpactEnvelope } from "../../src/features/proposals/proposal-risk-impact-contract";
import { proposalRiskImpactFixture } from "../fixtures/proposal-risk-impact";

describe("proposal risk and impact contract", () => {
  it("parses exact selected-proposal evidence", () => {
    const envelope = parseProposalRiskImpactEnvelope(
      proposalRiskImpactFixture(),
      "PRP-RISK",
      "PB_SG_GLOBAL_BAL_001",
      3,
    );

    expect(envelope.contract_version).toBe("proposal-risk-impact.v1");
    expect(envelope.data.allocation.views[0]?.current?.buckets[0]?.weight).toBe(
      "0.6800",
    );
    expect(
      envelope.data.decision.approval_requirements[0]?.blocking_until_approved,
    ).toBe(true);
    expect(envelope.data.workflow_gate.gate).toBe("RISK_REVIEW_REQUIRED");
  });

  it("fails closed when the source version differs from the selected proposal version", () => {
    expect(() =>
      parseProposalRiskImpactEnvelope(
        proposalRiskImpactFixture(),
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
        4,
      ),
    ).toThrow(/version_no does not match the selected proposal version/);
  });

  it.each([
    [
      "wrong contract version",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.contract_version = "proposal-risk-impact.v2" as never;
      },
    ],
    [
      "selected proposal mismatch",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.proposal_id = "PRP-OTHER";
      },
    ],
    [
      "selected portfolio mismatch",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.portfolio_id = "PB-OTHER";
      },
    ],
    [
      "JSON float weight",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.allocation.views[0]!.current!.buckets[0]!.weight =
          0.68 as never;
      },
    ],
    [
      "lowercase currency",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.allocation.views[0]!.current!.total_value.currency = "usd";
      },
    ],
    [
      "duplicate dimension",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.allocation.expected_dimensions.push("asset_class");
      },
    ],
    [
      "duplicate material-change identifier",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.decision.material_changes.push({
          ...payload.data.decision.material_changes[0]!,
        });
      },
    ],
    [
      "unknown lifecycle vocabulary",
      (payload: ReturnType<typeof proposalRiskImpactFixture>) => {
        payload.data.current_state = "UNKNOWN" as never;
      },
    ],
  ])("fails closed on %s", (_case, mutate) => {
    const payload = proposalRiskImpactFixture();
    mutate(payload);

    expect(() =>
      parseProposalRiskImpactEnvelope(
        payload,
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
      ),
    ).toThrow(/Proposal risk and impact response was invalid/);
  });

  it("fails closed when capability supportability is omitted", () => {
    const payload = proposalRiskImpactFixture();
    payload.data.capabilities = payload.data.capabilities.filter(
      ({ key }) => key !== "valuation_as_of",
    );

    expect(() =>
      parseProposalRiskImpactEnvelope(
        payload,
        "PRP-RISK",
        "PB_SG_GLOBAL_BAL_001",
      ),
    ).toThrow(/capability registry is incomplete/);
  });
});
