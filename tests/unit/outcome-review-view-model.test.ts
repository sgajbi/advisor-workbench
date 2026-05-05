import { describe, expect, it } from "vitest";

import { buildOutcomeReviewPanelModel } from "../../src/features/workbench/outcome-review-view-model";
import type { DpmOutcomeReviewGatewayResponse } from "../../src/features/workbench/types";

function response(
  data: Record<string, unknown>,
  supportability: Partial<DpmOutcomeReviewGatewayResponse["supportability"]> = {}
): DpmOutcomeReviewGatewayResponse {
  return {
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
      remediation_owner: null,
      ...supportability,
    },
    data,
  };
}

describe("outcome review view model", () => {
  it("normalizes list payloads into review, variance, lineage, and handoff posture", () => {
    const model = buildOutcomeReviewPanelModel(
      response({
        items: [
          {
            outcome_review_id: "or_1",
            state: "READY",
            portfolio_id: "PB_SG_GLOBAL_BAL_001",
            rebalance_run_id: "rr_1",
            wave_id: "wave_1",
            proof_pack_id: "ppack_1",
            expected_snapshot_hash: "sha256:expected",
            realized_snapshot_hash: "sha256:realized",
            retain_until: "2033-02-24",
            updated_at: "2026-02-24T10:00:00Z",
            dimension_results: [
              {
                dimension: "cash_weight",
                expected: { value: "0.0340", unit: "ratio" },
                realized: { value: "0.0342", unit: "ratio" },
                variance: { value: "0.0002", unit: "ratio" },
                state: "WITHIN_TOLERANCE",
              },
            ],
            source_lineage: [
              {
                source_service: "lotus-performance",
                source_ref: "perf_1",
                freshness_bucket: "fresh",
                hash: "sha256:perf",
              },
            ],
          },
        ],
      })
    );

    expect(model.state).toBe("ready");
    expect(model.items[0]).toEqual(
      expect.objectContaining({
        outcomeReviewId: "or_1",
        rebalanceRunId: "rr_1",
        proofPackId: "ppack_1",
        expectedSnapshotHash: "sha256:expected",
        realizedSnapshotHash: "sha256:realized",
        reportInputBlocked: false,
        aiEvidenceBlocked: false,
      })
    );
    expect(model.items[0].dimensions[0]).toEqual(
      expect.objectContaining({
        dimension: "cash_weight",
        expected: "0.0340 ratio",
        realized: "0.0342 ratio",
        variance: "0.0002 ratio",
      })
    );
    expect(model.items[0].lineage[0]).toEqual(
      expect.objectContaining({
        source: "lotus-performance",
        reference: "perf_1",
        freshness: "fresh",
        hash: "sha256:perf",
      })
    );
  });

  it("maps manage RFC-0042 source lineage fields without degrading them to N/A", () => {
    const model = buildOutcomeReviewPanelModel(
      response(
        {
          items: [
            {
              outcome_review_id: "dor_1",
              state: "READY",
              source_lineage: [
                {
                  source_system: "lotus-manage",
                  source_type: "DPM_SELECTED_ALTERNATIVE_EXPECTED_OUTCOME",
                  source_id: "selected-alternative-1",
                  content_hash: "sha256:selected",
                },
                {
                  source_system: "lotus-core",
                  source_type: "POST_TRADE_HOLDINGS_WINDOW",
                  source_id: "post-trade-holdings-1",
                  content_hash: "sha256:realized",
                },
              ],
            },
          ],
        },
        { state: "UNKNOWN" }
      )
    );

    expect(model.state).toBe("ready");
    expect(model.supportabilityState).toBe("READY");
    expect(model.items[0].lineage).toEqual([
      expect.objectContaining({
        source: "lotus-manage",
        reference: "selected-alternative-1",
        hash: "sha256:selected",
      }),
      expect.objectContaining({
        source: "lotus-core",
        reference: "post-trade-holdings-1",
        hash: "sha256:realized",
      }),
    ]);
  });

  it("marks blocked handoffs from manage supportability without inventing UI support", () => {
    const model = buildOutcomeReviewPanelModel(
      response(
        {
          items: [{ outcome_review_id: "or_2", state: "SOURCE_STALE" }],
        },
        {
          state: "BLOCKED",
          reason_codes: ["EXECUTION_EVIDENCE_PENDING"],
          blocked_actions: ["CREATE_REPORT_INPUT", "REQUEST_AI_NARRATIVE"],
          remediation_owner: "Portfolio Operations",
        }
      )
    );

    expect(model.state).toBe("blocked");
    expect(model.remediationOwner).toBe("Portfolio Operations");
    expect(model.items[0].reportInputBlocked).toBe(true);
    expect(model.items[0].aiEvidenceBlocked).toBe(true);
  });

  it("keeps empty and unavailable states explicit", () => {
    expect(buildOutcomeReviewPanelModel(response({ items: [] })).state).toBe("empty");
    expect(buildOutcomeReviewPanelModel(null)).toEqual(
      expect.objectContaining({
        state: "unavailable",
        supportabilityState: "UNAVAILABLE",
        items: [],
      })
    );
  });
});
