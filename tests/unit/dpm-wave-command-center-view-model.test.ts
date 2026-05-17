import { describe, expect, it } from "vitest";

import { buildDpmWaveCommandCenterModel } from "../../src/features/workbench/dpm-wave-command-center-view-model";
import type {
  DpmOperationsHandoffSummaryResponse,
  DpmWaveAiPmMemoResponse,
  DpmWaveGatewayResponse,
} from "../../src/features/workbench/types";

const waveListResponse: DpmWaveGatewayResponse = {
  correlation_id: "corr-wave-list",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0041",
    state: "ready",
    reason_codes: ["wave_supportability_ready"],
    blocked_actions: [],
    wave_id: "dwv_001",
    wave_state: "HANDOFF_READY",
    item_count: 1,
    issue_count: 0,
    remediation_owner: "Portfolio Operations",
  },
  data: {
    items: [
      {
        wave_id: "dwv_001",
        state: "HANDOFF_READY",
        trigger_type: "EXPLICIT_PORTFOLIO_LIST",
        as_of_date: "2026-05-03",
        item_count: 1,
        supportability_state: "ready",
        supportability_reason: "wave_supportability_ready",
        aggregate_metrics: { item_count: 1, ready_item_count: 1 },
      },
    ],
  },
};

describe("DPM wave command-center view model", () => {
  it("preserves manage wave supportability, item, proof-pack, and handoff truth", () => {
    const model = buildDpmWaveCommandCenterModel({
      waveList: waveListResponse,
      waveDetail: {
        ...waveListResponse,
        data: {
          wave: {
            wave_id: "dwv_001",
            state: "HANDOFF_READY",
            aggregate_metrics: {
              item_count: 1,
              ready_item_count: 1,
              blocked_item_count: 0,
            },
            proof_pack_posture: {
              proof_pack_refs: [
                {
                  proof_pack_id: "ppack_1",
                  wave_item_id: "dwi_1",
                  proof_pack_state: "READY",
                  content_hash: "sha256:proof",
                },
              ],
              handoff_refs: [
                {
                  handoff_ref_id: "dwh_1",
                  item_ids: ["dwi_1"],
                  content_hash: "sha256:handoff",
                },
              ],
              external_execution_claimed: false,
            },
          },
        },
      },
      waveItems: {
        ...waveListResponse,
        data: {
          items: [
            {
              wave_item_id: "dwi_1",
              portfolio_id: "PB_SG_GLOBAL_BAL_001",
              state: "HANDOFF_READY",
              source_readiness_state: "READY",
              selected_alternative_id: "alt_1",
              proof_pack_id: "ppack_1",
              handoff_ref_id: "dwh_1",
              reason_codes: ["READY_FOR_HANDOFF"],
              diagnostics: {
                proposed_changes: [
                  {
                    security_id: "EQ_1",
                    action: "Buy",
                    estimated_value: "2000.0",
                    currency: "SGD",
                    reason: "Align",
                    reason_code: "DRIFT_REBALANCE",
                  },
                ],
              },
            },
          ],
        },
      },
    });

    expect(model.state).toBe("ready");
    expect(model.selectedWaveId).toBe("dwv_001");
    expect(model.selectedWaveState).toBe("HANDOFF_READY");
    expect(model.metricRows.map((row) => row.key)).toContain("ready_item_count");
    expect(model.itemRows[0]).toMatchObject({
      waveItemId: "dwi_1",
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      security: "EQ_1",
      proposedAction: "Buy",
      estimatedValue: "2000.0",
      reason: "Align",
      reasonCodes: "DRIFT_REBALANCE",
      proofPackId: "ppack_1",
      handoffRef: "dwh_1",
    });
    expect(model.proofPackRows[0].value).toContain("sha256:proof");
    expect(model.handoffRows[0].label).toBe("dwh_1");
    expect(model.externalExecutionClaimed).toBe("No");
  });

  it("surfaces report-input and AI PM memo posture without deriving execution truth", () => {
    const aiMemoResponse: DpmWaveAiPmMemoResponse = {
      correlation_id: "corr-wave-ai-memo",
      contract_version: "v1",
      source_service: "lotus-ai",
      evidence_source_service: "lotus-manage",
      manage_upstream_status: 200,
      ai_upstream_status: 200,
      supportability: waveListResponse.supportability,
      wave_report_input: {
        wave_id: "dwv_001",
        report_input_ref: "report-input:dwv_001",
      },
      memo_request: {
        requested_outputs: ["wave_pm_memo", "approval_checklist"],
        audience: ["portfolio_manager", "investment_control"],
      },
      data: {
        run_id: "wf_run_wave_memo_001",
        status: "REVIEW_REQUIRED",
      },
    };

    const model = buildDpmWaveCommandCenterModel({
      waveList: waveListResponse,
      waveReportInput: {
        ...waveListResponse,
        data: {
          wave_id: "dwv_001",
          evidence_ref: {
            ref_id: "dwv_001:dpm_wave_report_input",
          },
        },
      },
      waveAiMemo: aiMemoResponse,
    });

    expect(model.reportInputStatus).toBe("READY");
    expect(model.reportInputRef).toBe("dwv_001:dpm_wave_report_input");
    expect(model.aiMemoStatus).toBe("REVIEW_REQUIRED");
    expect(model.aiMemoRunId).toBe("wf_run_wave_memo_001");
    expect(model.externalExecutionClaimed).toBe("N/A");
  });

  it("surfaces operations handoff summary posture as support-only workflow-pack truth", () => {
    const operationsSummary: DpmOperationsHandoffSummaryResponse = {
      correlation_id: "corr-ops-summary",
      contract_version: "v1",
      source_service: "lotus-ai",
      evidence_source_service: "lotus-manage",
      manage_upstream_status: 200,
      ai_upstream_status: 200,
      supportability: waveListResponse.supportability,
      wave_report_input: {
        wave_id: "dwv_001",
        report_input_ref: "report-input:dwv_001",
      },
      handoff_summary_request: {
        requested_outputs: ["operations_summary", "blocking_conditions"],
        audience: ["operations", "portfolio_manager"],
      },
      data: {
        workflow_pack_run: {
          run_id: "wf_run_ops_summary_001",
          review_state: "REVIEW_REQUIRED",
        },
      },
    };

    const model = buildDpmWaveCommandCenterModel({
      waveList: waveListResponse,
      operationsHandoffSummary: operationsSummary,
    });

    expect(model.operationsHandoffSummaryStatus).toBe("REVIEW_REQUIRED");
    expect(model.operationsHandoffSummaryRunId).toBe("wf_run_ops_summary_001");
    expect(model.aiMemoStatus).toBe("NOT_REQUESTED");
  });

  it("surfaces manage-owned campaign lifecycle events without deriving campaign state", () => {
    const model = buildDpmWaveCommandCenterModel({
      waveList: waveListResponse,
      campaignLifecycleEvents: {
        correlation_id: "corr-campaign-lifecycle",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        data: {
          campaign_id: "campaign-holdings-202605",
          campaign_version: "2026.05",
          events: [
            {
              event_type: "CAMPAIGN_DEFINITION_CREATED",
              occurred_at: "2026-05-14T09:30:00Z",
              actor_id: "pm_sg_1",
              status: "RECORDED",
              reason_code: "source_backed_candidate_set",
            },
          ],
        },
      },
    });

    expect(model.campaignLifecycleRows).toEqual([
      {
        key: "CAMPAIGN_DEFINITION_CREATED:2026-05-14T09:30:00Z",
        eventType: "Campaign Definition Created",
        occurredAt: "2026-05-14T09:30:00Z",
        actor: "pm_sg_1",
        status: "RECORDED",
        reason: "source_backed_candidate_set",
      },
    ]);
  });

  it("enriches campaign rows from manage-owned campaign discovery without calculating membership", () => {
    const model = buildDpmWaveCommandCenterModel({
      waveList: waveListResponse,
      campaignDefinitions: {
        correlation_id: "corr-campaign-definitions",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        data: {
          items: [
            {
              campaign_id: "campaign-holdings-202605",
              campaign_version: "2026.05",
              display_name: "Apple and Tesla holdings review",
              status: "ACTIVE",
              as_of_date: "2026-05-10",
              eligible_portfolio_types: ["DISCRETIONARY"],
              candidates: [{ portfolio_id: "PB_SG_GLOBAL_BAL_001" }],
            },
          ],
        },
      },
      campaignDiscovery: {
        correlation_id: "corr-campaign-discovery",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        data: {
          items: [
            {
              product_name: "BulkReviewCampaignDiscovery",
              campaign_id: "campaign-holdings-202605",
              campaign_version: "2026.05",
              campaign_status: "ACTIVE",
              candidate_count: 12,
              eligible_candidate_count: 10,
              governance_status: "APPROVED",
              expiry_state: "ACTIVE",
              access_purpose: "rebalance_review",
              source_ref_count: 4,
            },
          ],
        },
      },
    });

    expect(model.campaignRows[0]).toMatchObject({
      campaignId: "campaign-holdings-202605",
      candidateCount: "12",
      eligibleCandidateCount: "10",
      governanceState: "APPROVED",
      expiryState: "ACTIVE",
      accessPurpose: "rebalance_review",
      sourcePosture: "Source-backed",
    });
  });

  it("uses manage-owned launch package readiness without deriving launch state", () => {
    const model = buildDpmWaveCommandCenterModel({
      waveList: waveListResponse,
      campaignLaunchPackage: {
        correlation_id: "corr-campaign-launch-package",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        data: {
          product_name: "BulkReviewCampaignDefinitionLaunchPackage",
          launch_state: "READY",
          requested_as_of_date: "2026-05-10",
          actor_id: "pm_sg_1",
          reason_codes: [],
        },
      },
      campaignLaunchResponse: {
        ...waveListResponse,
        upstream_status: 201,
        data: {
          wave: {
            wave_id: "dwv_campaign_launch_001",
            state: "CREATED",
            trigger_type: "BULK_REVIEW_CAMPAIGN",
          },
          idempotent_replay: true,
        },
      },
    });

    expect(model.campaignLaunchPosture).toEqual({
      state: "READY",
      canLaunch: true,
      reason: "Ready",
      requestedAsOfDate: "2026-05-10",
      actor: "pm_sg_1",
      launchedWaveId: "dwv_campaign_launch_001",
      replayPosture: "Replay preserved",
    });
  });

  it("does not infer readiness from a present wave when manage supportability is blocked", () => {
    const model = buildDpmWaveCommandCenterModel({
      waveList: {
        ...waveListResponse,
        supportability: {
          ...waveListResponse.supportability,
          state: "blocked",
          reason_codes: ["wave_blocked_items"],
          blocked_actions: ["simulate", "approve"],
          issue_count: 2,
        },
      },
    });

    expect(model.state).toBe("blocked");
    expect(model.supportabilityState).toBe("BLOCKED");
    expect(model.blockedActions).toEqual(["simulate", "approve"]);
    expect(model.selectedWaveIssueCount).toBe("2");
  });
});
