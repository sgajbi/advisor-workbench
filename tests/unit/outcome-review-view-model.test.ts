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
  it.each([
    {
      state: "READY",
      overallOutcome: "READY_WITHIN_TOLERANCE",
      blockedActions: [] as string[],
      outcomeStatus: "Within expected tolerance",
      reviewPosture: "Ready for adviser review",
    },
    {
      state: "PENDING_REVIEW",
      overallOutcome: "PENDING_REVIEW",
      blockedActions: [] as string[],
      outcomeStatus: "Review pending",
      reviewPosture: "Adviser review pending",
    },
    {
      state: "BREACHED",
      overallOutcome: "BREACHED",
      blockedActions: [] as string[],
      outcomeStatus: "Outside expected tolerance",
      reviewPosture: "Escalation required",
    },
    {
      state: "BLOCKED",
      overallOutcome: "BLOCKED",
      blockedActions: [] as string[],
      outcomeStatus: "Blocked",
      reviewPosture: "Needs attention",
    },
    {
      state: "READY",
      overallOutcome: "READY",
      blockedActions: ["CREATE_REPORT_INPUT"],
      outcomeStatus: "Outcome evidence ready",
      reviewPosture: "Needs attention",
    },
    {
      state: "UNKNOWN",
      overallOutcome: "FUTURE_OUTCOME_STATE",
      blockedActions: [] as string[],
      outcomeStatus: "Review required",
      reviewPosture: "Review required",
    },
  ])(
    "keeps $overallOutcome comparison truth distinct from $state workflow posture",
    ({ state, overallOutcome, blockedActions, outcomeStatus, reviewPosture }) => {
      const model = buildOutcomeReviewPanelModel(
        response(
          {
            items: [
              {
                outcome_review_id: `or_${state.toLowerCase()}`,
                state,
                overall_outcome: overallOutcome,
              },
            ],
          },
          { blocked_actions: blockedActions },
        ),
      );

      expect(model.items[0]).toMatchObject({
        outcomeStatusLabel: outcomeStatus,
        reviewPostureLabel: reviewPosture,
      });
    },
  );

  it("preserves a source-authored business outcome instead of forcing an enum label", () => {
    const summary = "Implemented rebalance stayed inside expected bands.";
    const model = buildOutcomeReviewPanelModel(
      response({
        items: [
          {
            outcome_review_id: "or_source_summary",
            state: "READY",
            overall_outcome: summary,
          },
        ],
      }),
    );

    expect(model.items[0]).toMatchObject({
      outcomeStatusLabel: summary,
      reviewPostureLabel: "Ready for adviser review",
    });
    expect(model.items[0].mandateImpact).toContain(summary);
    expect(model.items[0].clientRationale).toContain(summary);
  });

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
            expected_snapshot: {
              source_hashes: { expected: "sha256:expected" },
            },
            realized_snapshot: {
              source_hashes: { realized: "sha256:realized" },
            },
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
        retentionUntil: "24 Feb 2033",
        sourceUpdatedAt: "2026-02-24T10:00:00Z",
        updatedAt: "24 Feb 2026, 10:00 UTC",
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
        sourceType: "N/A",
        reference: "perf_1",
        freshness: "fresh",
        hash: "sha256:perf",
      })
    );
  });

  it.each([
    {
      name: "both source snapshots",
      expectedHash: "sha256:expected",
      realizedHash: "sha256:realized",
      expectedMappedHash: "sha256:expected",
      realizedMappedHash: "sha256:realized",
    },
    {
      name: "only the expected source snapshot",
      expectedHash: "sha256:expected",
      realizedHash: undefined,
      expectedMappedHash: "sha256:expected",
      realizedMappedHash: "N/A",
    },
    {
      name: "no source snapshots",
      expectedHash: undefined,
      realizedHash: undefined,
      expectedMappedHash: "N/A",
      realizedMappedHash: "N/A",
    },
    {
      name: "blank and malformed source hashes",
      expectedHash: "   ",
      realizedHash: "not-a-source-hash",
      expectedMappedHash: "N/A",
      realizedMappedHash: "N/A",
    },
  ])(
    "fails closed while mapping $name",
    ({
      expectedHash,
      realizedHash,
      expectedMappedHash,
      realizedMappedHash,
    }) => {
      const model = buildOutcomeReviewPanelModel(
        response({
          items: [
            {
              outcome_review_id: "or_snapshot_evidence",
              expected_snapshot: {
                source_hashes: { expected: expectedHash },
              },
              realized_snapshot: {
                source_hashes: { realized: realizedHash },
              },
            },
          ],
        }),
      );

      expect(model.items[0]).toMatchObject({
        expectedSnapshotHash: expectedMappedHash,
        realizedSnapshotHash: realizedMappedHash,
      });
    },
  );

  it("fails closed when outcome audit and retention dates are not valid source values", () => {
    const model = buildOutcomeReviewPanelModel(
      response({
        items: [
          {
            outcome_review_id: "or_invalid_time",
            updated_at: "2026-02-24T10:00:00",
            retain_until: "2033-02-29",
          },
        ],
      }),
    );

    expect(model.items[0]?.updatedAt).toBe("Not reported");
    expect(model.items[0]?.sourceUpdatedAt).toBeNull();
    expect(model.items[0]?.retentionUntil).toBe("Not reported");
    expect(JSON.stringify(model)).not.toContain("2026-02-24T10:00:00");
    expect(JSON.stringify(model)).not.toContain("2033-02-29");
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
        sourceType: "DPM_SELECTED_ALTERNATIVE_EXPECTED_OUTCOME",
        reference: "selected-alternative-1",
        hash: "sha256:selected",
      }),
      expect.objectContaining({
        source: "lotus-core",
        sourceType: "POST_TRADE_HOLDINGS_WINDOW",
        reference: "post-trade-holdings-1",
        hash: "sha256:realized",
      }),
    ]);
  });

  it("preserves Manage source-lineage filters, facets, and support boundary", () => {
    const model = buildOutcomeReviewPanelModel(
      response(
        {
          items: [{ outcome_review_id: "or_1", state: "READY" }],
        },
        {
          applied_filters: {
            portfolio_id: "PB_SG_GLOBAL_BAL_001",
            source_system: "lotus-performance",
            source_type: "PortfolioCashMovementSummary:v1",
            source_scan_limit: 250,
          },
          source_owner_counts: { "lotus-performance": 2 },
          source_type_counts: {
            "PortfolioCashMovementSummary:v1": 1,
            "PortfolioRealizedTaxSummary:v1": 1,
          },
          support_boundary: {
            manage_persisted_lineage_only: true,
            source_owner_store_query: false,
            global_portfolio_discovery: false,
          },
        },
      ),
    );

    const sourceBoundary = model.sourceBoundary!;
    expect(sourceBoundary.sourceOwnerFacets).toEqual([
      {
        key: "owner-lotus-performance",
        label: "Performance analytics",
        count: "2",
        family: "owner",
      },
    ]);
    expect(sourceBoundary.sourceTypeFacets.map((row) => row.label)).toEqual([
      "Portfolio cash movement summary",
      "Portfolio realised tax summary",
    ]);
    expect(sourceBoundary.appliedFilters).toContain(
      "Source type: Portfolio cash movement summary",
    );
    expect(sourceBoundary.supportBoundary).toContain("Source owner store query: No");
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

  it("preserves source-owned client communication boundary without projecting capability", () => {
    const model = buildOutcomeReviewPanelModel(
      response({
        items: [
          {
            outcome_review_id: "or_boundary",
            state: "READY",
            client_communication_boundary: clientCommunicationBoundary(),
          },
        ],
      })
    );

    expect(model.items[0].clientCommunicationBoundary).toEqual(
      expect.objectContaining({
        boundaryId: "DPM_OUTCOME_CLIENT_COMMUNICATION_BOUNDARY",
        state: "BLOCKED",
        clientCommunicationProjected: false,
        clientApprovalProjected: false,
        requiredSourceProduct: "ClientCommunicationRecord:v1",
        reasonCode: "OUTCOME_CLIENT_COMMUNICATION_NOT_SUPPORTED",
      })
    );
    expect(model.items[0].clientCommunicationBoundary?.blockedCapabilities).toContain(
      "client_message_generation"
    );
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

function clientCommunicationBoundary(): Record<string, unknown> {
  return {
    boundary_id: "DPM_OUTCOME_CLIENT_COMMUNICATION_BOUNDARY",
    supportability_state: "BLOCKED",
    source_system: "lotus-manage",
    source_product_name: "DpmPostTradeOutcomeReview",
    source_product_version: "v1",
    client_communication_projected: false,
    client_approval_projected: false,
    reason_code: "OUTCOME_CLIENT_COMMUNICATION_NOT_SUPPORTED",
    blocked_capabilities: [
      "client_approval",
      "client_contact",
      "client_message_generation",
      "communication_audit",
      "delivery_confirmation",
    ],
    required_owner: "future client-communication owner",
    required_source_product: "ClientCommunicationRecord:v1",
    summary: "Manage does not publish client communication events for this outcome review.",
    content_hash: "sha256:client-communication-boundary",
  };
}
