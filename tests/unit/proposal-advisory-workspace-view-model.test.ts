import { describe, expect, it } from "vitest";

import { buildProposalAdvisoryWorkspaceModel } from "../../src/features/proposals/proposal-advisory-workspace-view-model";

describe("proposal advisory workspace view model", () => {
  it("builds a front-office proposal workspace from source-owned trade and evidence posture", () => {
    const model = buildProposalAdvisoryWorkspaceModel({
      data: {
        proposal: {
          proposal_id: "pp_1",
          portfolio_id: "PB_SG_GLOBAL_BAL_001",
          current_state: "DRAFT",
          current_version_no: 2,
          title: "Balanced mandate rebalance",
        },
        current_version: {
          artifact_hash: "sha256:artifact",
          evidence_bundle: {
            hashes: {
              request_hash: "sha256:request",
              simulation_hash: "sha256:simulation",
            },
            allocation_comparison: [
              { label: "Global Equities", current: "65.2%", proposed: "60.0%" },
            ],
          },
          simulate_request: {
            body: {
              proposed_trades: [
                { side: "BUY", instrument_id: "VTI", quantity: "450.0000" },
                { side: "SELL", instrument_id: "AAPL", quantity: "200.0000" },
              ],
            },
          },
        },
      },
      approvals: {
        proposal_id: "pp_1",
        current_state: "DRAFT",
        approvals: [{ approval_id: "risk_1", approval_type: "RISK", approved: true, actor_id: "risk", occurred_at: "now" }],
      },
      lineage: { proposal_id: "pp_1", versions: [{ version_no: 2 }] },
      generatedAt: "2026-05-24T10:00:00Z",
      artifactHash: "sha256:artifact",
      requestHash: "sha256:request",
      simulationHash: "sha256:simulation",
    });

    expect(model.title).toBe("Balanced mandate rebalance");
    expect(model.portfolioLabel).toBe("PB_SG_GLOBAL_BAL_001");
    expect(model.trades.map((row) => `${row.side}:${row.instrument}:${row.quantity}`)).toEqual([
      "BUY:VTI:450.0000",
      "SELL:AAPL:200.0000",
    ]);
    expect(model.allocationRows).toEqual([
      { label: "Global Equities", current: "65.2%", proposed: "60.0%" },
    ]);
    expect(model.readiness.find((item) => item.label === "Risk Review")?.state).toBe("Ready");
    expect(model.readiness.find((item) => item.label === "Client-Ready Release")).toMatchObject({
      state: "Blocked",
      detail: "Client-ready publication is not promoted from this Workbench surface.",
    });
  });

  it("keeps missing source evidence explicit instead of inventing readiness or allocation impact", () => {
    const model = buildProposalAdvisoryWorkspaceModel({
      data: {
        proposal: {
          proposal_id: "pp_2",
          portfolio_id: "PB_SG_GLOBAL_BAL_001",
          current_state: "DRAFT",
        },
        current_version: {
          simulate_request: { body: {} },
        },
      },
    });

    expect(model.trades).toEqual([]);
    expect(model.allocationRows).toEqual([]);
    expect(model.artifactHashLabel).toBe("Not available");
    expect(model.readiness.find((item) => item.label === "Proposal Evidence")).toMatchObject({
      state: "Pending",
      detail: "Evidence bundle identifiers were not returned by Gateway.",
    });
  });

  it("marks compliance blocked when source evidence returns blocking reasons", () => {
    const model = buildProposalAdvisoryWorkspaceModel({
      data: {
        proposal: {
          proposal_id: "pp_3",
          current_state: "COMPLIANCE_REVIEW",
        },
        current_version: {
          artifact_hash: "sha256:artifact",
          evidence_bundle: {
            blocking_reasons: [{ code: "MISSING_DISCLOSURE_SIGNATURE" }],
          },
          simulate_request: { body: {} },
        },
      },
    });

    expect(model.readiness.find((item) => item.label === "Compliance Review")).toMatchObject({
      state: "Blocked",
      detail: "Source evidence returned blocking issues.",
    });
  });
});
