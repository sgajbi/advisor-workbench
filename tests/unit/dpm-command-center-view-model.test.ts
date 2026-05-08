import { describe, expect, it } from "vitest";

import { buildDpmCommandCenterPanelModel } from "../../src/features/workbench/dpm-command-center-view-model";
import type { DpmCommandCenterGatewayResponse } from "../../src/features/workbench/types";

const commandCenterResponse: DpmCommandCenterGatewayResponse = {
  correlation_id: "corr-rfc38",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0038",
    state: "PARTIAL",
    data_completeness_state: "PARTIAL",
    partial_readiness_reasons: ["PM_BOOK_DISCOVERY_NOT_AVAILABLE"],
    source_run_id: "dmr_1",
    remediation_owner: "Portfolio Operations",
  },
  data: {
    health_distribution: { READY: 3, PENDING_REVIEW: 1, BLOCKED: 1 },
    source_readiness_summary: { READY: 4, PARTIAL: 1 },
    evaluated_mandates: 5,
    active_exception_count: 2,
    latest_monitoring_run: {
      monitoring_run_id: "dmr_1",
      status: "SUCCEEDED",
    },
    attention_buckets: [
      {
        dimension: "SOURCE_READINESS",
        severity: "HIGH",
        reason_code: "TAX_LOT_SOURCE_PARTIAL",
        recommended_action: "REPAIR_SOURCE_DATA",
        count: 2,
      },
    ],
    recommended_actions: [
      {
        recommended_action: "SIMULATE_REBALANCE",
        severity: "MEDIUM",
        count: 3,
      },
    ],
  },
};

describe("DPM command-center view model", () => {
  it("preserves manage-published supportability and command-center rows", () => {
    const model = buildDpmCommandCenterPanelModel({
      commandCenter: commandCenterResponse,
      exceptions: {
        ...commandCenterResponse,
        data: {
          items: [
            {
              exception_id: "me_1",
              mandate_id: "MANDATE_PB_SG_GLOBAL_BAL_001",
              severity: "HIGH",
              reason_code: "TAX_LOT_SOURCE_PARTIAL",
              recommended_action: "REPAIR_SOURCE_DATA",
              state: "ACTIVE",
            },
          ],
        },
      },
      mandate: {
        ...commandCenterResponse,
        data: { mandate_id: "MANDATE_PB_SG_GLOBAL_BAL_001" },
      },
      mandateHealth: {
        ...commandCenterResponse,
        data: {
          mandate_id: "MANDATE_PB_SG_GLOBAL_BAL_001",
          health_score: 97,
          health_state: "PENDING_REVIEW",
          recommended_action: "SIMULATE_REBALANCE",
          dimension_scores: [
            {
              dimension: "SOURCE_READINESS",
              score: 90,
              state: "PENDING_REVIEW",
              reason_codes: ["TAX_LOT_SOURCE_PARTIAL"],
            },
          ],
        },
      },
    });

    expect(model.state).toBe("partial");
    expect(model.supportabilityState).toBe("PARTIAL");
    expect(model.dataCompletenessState).toBe("PARTIAL");
    expect(model.partialReadinessReasons).toEqual([
      "PM_BOOK_DISCOVERY_NOT_AVAILABLE",
    ]);
    expect(model.healthDistribution.map((row) => row.key)).toEqual([
      "READY",
      "PENDING_REVIEW",
      "BLOCKED",
    ]);
    expect(model.attentionRows[0]).toMatchObject({
      dimension: "SOURCE_READINESS",
      reasonCode: "TAX_LOT_SOURCE_PARTIAL",
      recommendedAction: "REPAIR_SOURCE_DATA",
    });
    expect(model.exceptionRows[0].exceptionId).toBe("me_1");
    expect(model.mandateHealthScore).toBe("97");
    expect(model.mandateHealthDimensions[0].reasons).toBe(
      "TAX_LOT_SOURCE_PARTIAL",
    );
  });

  it("does not infer ready supportability from monitoring run success", () => {
    const model = buildDpmCommandCenterPanelModel({
      commandCenter: {
        ...commandCenterResponse,
        supportability: {
          ...commandCenterResponse.supportability,
          state: "UNKNOWN",
          data_completeness_state: null,
          partial_readiness_reasons: [],
        },
        data: {
          latest_monitoring_run: {
            monitoring_run_id: "dmr_2",
            status: "SUCCEEDED",
          },
        },
      },
    });

    expect(model.state).toBe("partial");
    expect(model.supportabilityState).toBe("UNKNOWN");
    expect(model.latestMonitoringRunStatus).toBe("SUCCEEDED");
  });

  it("treats degraded supportability as explicit partial command-center posture", () => {
    const model = buildDpmCommandCenterPanelModel({
      commandCenter: {
        ...commandCenterResponse,
        supportability: {
          ...commandCenterResponse.supportability,
          state: "DEGRADED",
          data_completeness_state: "COMPLETE",
          partial_readiness_reasons: ["COMMAND_CENTER_SOURCE_READINESS_DEGRADED"],
        },
      },
    });

    expect(model.state).toBe("partial");
    expect(model.supportabilityState).toBe("DEGRADED");
    expect(model.partialReadinessReasons).toEqual([
      "COMMAND_CENTER_SOURCE_READINESS_DEGRADED",
    ]);
  });
});
