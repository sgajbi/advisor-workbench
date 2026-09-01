import { describe, expect, it } from "vitest";

import {
  buildProofPackPanelModel,
  deriveProofPackContext,
} from "../../src/features/workbench/proof-pack-view-model";
import type {
  DpmOutcomeReviewGatewayResponse,
  DpmProofPackGatewayResponse,
  WorkbenchOverview,
} from "../../src/features/workbench/types";

const proofPackResponse: DpmProofPackGatewayResponse = {
  correlation_id: "corr-rfc40",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0040",
    state: "READY",
    proof_pack_id: "ppack_1",
    reason_codes: ["PROOF_PACK_READY"],
    section_state_counts: { READY: 2 },
    content_hash: "sha256:proof-pack",
    markdown_available: true,
    report_input_available: true,
    ai_evidence_input_available: true,
  },
  data: {
    proof_pack: {
      proof_pack_id: "ppack_1",
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      mandate_id: "MANDATE_PB_SG_GLOBAL_BAL_001",
      rebalance_run_id: "rr_1",
      alternative_set_id: "cas_1",
      selected_alternative_id: "alt_1",
      status: "READY",
      as_of_date: "2026-05-03",
      content_hash: "sha256:proof-pack",
      decision_summary: {
        approval_state: "SIGNATURE_PENDING",
        business_rationale: "Portfolio positioning remains within the mandate corridor.",
        expected_benefit: "Improves client handoff readiness.",
      },
      sections: [
        {
          section_type: "mandate_alignment",
          title: "Mandate Alignment",
          summary: "Ready for advisor review",
          state: "READY",
          source_service: "lotus-manage",
          content_hash: "sha256:policy",
        },
        {
          section_type: "risk_disclosure",
          title: "Risk Disclosure",
          summary: "Within approved profile",
          state: "READY",
          source_service: "lotus-risk",
          content_hash: "sha256:risk-section",
        },
      ],
      markdown_summary_ref: { ref_type: "mandate_alignment_report", ref_id: "doc_1" },
      report_input_ref: { ref_type: "client_report", ref_id: "doc_2" },
      source_hashes: {
        risk_snapshot_1: "sha256:risk",
      },
    },
  },
};

describe("proof pack view model", () => {
  it("keeps manage proof-pack identity, section posture, and hashes visible", () => {
    const model = buildProofPackPanelModel(proofPackResponse);

    expect(model.state).toBe("ready");
    expect(model.proofPackId).toBe("ppack_1");
    expect(model.portfolioId).toBe("PB_SG_GLOBAL_BAL_001");
    expect(model.mandateId).toBe("MANDATE_PB_SG_GLOBAL_BAL_001");
    expect(model.rebalanceRunId).toBe("rr_1");
    expect(model.contentHash).toBe("sha256:proof-pack");
    expect(model.sectionStateSummary).toBe("READY: 2");
    expect(model.evidenceStatusLabel).toBe("Available");
    expect(model.approvalReadinessLabel).toBe("Signature Pending");
    expect(model.mandateCoverageLabel).toBe("Complete");
    expect(model.reportReadinessLabel).toBe("Ready");
    expect(model.selectedEvidenceTitle).toBe("Mandate Alignment");
    expect(model.selectedEvidenceSummary).toBe("Ready for advisor review");
    expect(model.advisorRationale).toBe("Portfolio positioning remains within the mandate corridor.");
    expect(model.sections).toEqual([
      {
        key: "section_1-0",
        section: "section_1",
        state: "READY",
        source: "lotus-manage",
        hash: "sha256:policy",
      },
      {
        key: "section_2-1",
        section: "section_2",
        state: "READY",
        source: "lotus-risk",
        hash: "sha256:risk-section",
      },
    ]);
    expect(model.evidenceRows[0]).toEqual({
      key: "mandate_alignment-0",
      area: "Mandate Alignment",
      status: "READY",
      finding: "Ready for advisor review",
      action: "View details",
    });
    expect(model.documents.map((document) => document.label)).toEqual([
      "Mandate Alignment Report",
      "Client Report",
    ]);
    expect(model.sourceHashes).toEqual([
      {
        key: "N/A-risk_snapshot_1-0",
        source: "N/A",
        reference: "risk_snapshot_1",
        hash: "sha256:risk",
      },
    ]);
    expect(model.markdownAvailable).toBe(true);
    expect(model.reportInputAvailable).toBe(true);
    expect(model.aiEvidenceInputAvailable).toBe(true);
  });

  it("derives proof-pack launch context from the Workbench rebalance snapshot", () => {
    const outcomeReviews: DpmOutcomeReviewGatewayResponse = {
      correlation_id: "corr-rfc42",
      contract_version: "v1",
      source_service: "lotus-manage",
      upstream_status: 200,
      supportability: {
        source_service: "lotus-manage",
        authority: "lotus-manage:RFC-0042",
        state: "SUPPORTED",
        reason_codes: [],
        blocked_actions: [],
      },
      data: {
        items: [
          {
            outcome_review_id: "or_1",
            proof_pack_id: "dpp_rfc0042_1",
            rebalance_run_id: "rr_1",
            mandate_id: "MANDATE_PB_SG_GLOBAL_BAL_001",
          },
        ],
      },
    };
    const rebalanceSnapshot: WorkbenchOverview["rebalance_snapshot"] = {
      status: "READY",
      last_rebalance_run_id: "run_001",
      last_run_at_utc: "2026-05-07T01:00:00Z",
      recent_runs: [
        {
          rebalance_run_id: "run_001",
          status: "READY",
          created_at_utc: "2026-05-07T01:00:00Z",
          error_code: null,
          workflow_state: "REVIEW_READY",
        },
      ],
    };

    expect(deriveProofPackContext(outcomeReviews, rebalanceSnapshot)).toEqual({
      proofPackId: "dpp_rfc0042_1",
      rebalanceRunId: "run_001",
      mandateId: "MANDATE_PB_SG_GLOBAL_BAL_001",
    });
  });

  it("does not use outcome-review run ids as proof-pack generation sources", () => {
    const outcomeReviews: DpmOutcomeReviewGatewayResponse = {
      correlation_id: "corr-rfc42",
      contract_version: "v1",
      source_service: "lotus-manage",
      upstream_status: 200,
      supportability: {
        source_service: "lotus-manage",
        authority: "lotus-manage:RFC-0042",
        state: "SUPPORTED",
        reason_codes: [],
        blocked_actions: [],
      },
      data: {
        items: [
          {
            outcome_review_id: "or_1",
            proof_pack_id: "dpp_rfc0042_1",
            rebalance_run_id: "rr_rfc0042_expected_snapshot",
            mandate_id: "MANDATE_PB_SG_GLOBAL_BAL_001",
          },
        ],
      },
    };

    expect(deriveProofPackContext(outcomeReviews)).toEqual({
      proofPackId: "dpp_rfc0042_1",
      rebalanceRunId: null,
      mandateId: "MANDATE_PB_SG_GLOBAL_BAL_001",
    });
  });

  it("does not claim support before Gateway returns a proof pack", () => {
    const model = buildProofPackPanelModel(null);

    expect(model.state).toBe("unavailable");
    expect(model.supportabilityState).toBe("UNAVAILABLE");
    expect(model.proofPackId).toBe("N/A");
    expect(model.markdownAvailable).toBe(false);
  });

  it("preserves blocked supportability from manage", () => {
    const model = buildProofPackPanelModel({
      ...proofPackResponse,
      supportability: {
        ...proofPackResponse.supportability,
        state: "BLOCKED",
        reason_codes: ["PROOF_PACK_SOURCE_BLOCKED"],
      },
    });

    expect(model.state).toBe("blocked");
    expect(model.supportabilityReasons).toEqual(["PROOF_PACK_SOURCE_BLOCKED"]);
  });

  it("fails closed when Manage marks a retained proof pack unavailable", () => {
    const model = buildProofPackPanelModel({
      ...proofPackResponse,
      supportability: {
        ...proofPackResponse.supportability,
        state: "UNAVAILABLE",
        reason_codes: ["PROOF_PACK_SOURCE_UNAVAILABLE"],
      },
    });

    expect(model.state).toBe("unavailable");
    expect(model.proofPackId).toBe("ppack_1");
    expect(model.sections).toHaveLength(2);
    expect(model.supportabilityReasons).toEqual(["PROOF_PACK_SOURCE_UNAVAILABLE"]);
  });
});
