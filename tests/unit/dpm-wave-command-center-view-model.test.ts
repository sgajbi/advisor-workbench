import { describe, expect, it } from "vitest";

import { buildDpmWaveCommandCenterModel } from "../../src/features/workbench/dpm-wave-command-center-view-model";
import type { DpmWaveGatewayResponse } from "../../src/features/workbench/types";

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
      proofPackId: "ppack_1",
      handoffRef: "dwh_1",
    });
    expect(model.proofPackRows[0].value).toContain("sha256:proof");
    expect(model.handoffRows[0].label).toBe("dwh_1");
    expect(model.externalExecutionClaimed).toBe("No");
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
