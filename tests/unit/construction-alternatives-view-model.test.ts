import { describe, expect, it } from "vitest";

import { buildConstructionPanelModel } from "../../src/features/workbench/construction-alternatives-view-model";
import type { DpmConstructionGatewayResponse } from "../../src/features/workbench/types";

const readyResponse: DpmConstructionGatewayResponse = {
  correlation_id: "corr-rfc39",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0039",
    state: "READY",
    reason_codes: ["REGIME_SCENARIO_PACK_READY"],
    selected_alternative_id: null,
  },
  data: {
    alternative_set_id: "cas_1",
    status: "READY",
    alternatives: [
      {
        alternative_id: "alt_min_turnover",
        method: "MIN_TURNOVER",
        method_status: "READY",
        comparison_metrics: {
          turnover_weight: "0.045",
          cash_weight: "0.08",
        },
        objective_trace: [{ term: "turnover" }],
        constraint_trace: [{ constraint: "cash_band" }],
        diagnostics: {
          method_plan: { reason_codes: ["TARGET_METHOD_COMPARISON_AVAILABLE"] },
          enrichment_summary: { reason_codes: ["REGIME_SCENARIO_PACK_READY"] },
        },
      },
    ],
  },
};

describe("construction alternatives view model", () => {
  it("keeps manage construction truth visible without recomputation", () => {
    const model = buildConstructionPanelModel(readyResponse);

    expect(model.state).toBe("ready");
    expect(model.alternativeSetId).toBe("cas_1");
    expect(model.supportabilityState).toBe("READY");
    expect(model.supportabilityReasons).toEqual(["REGIME_SCENARIO_PACK_READY"]);
    expect(model.alternatives[0]).toEqual({
      alternativeId: "alt_min_turnover",
      method: "MIN_TURNOVER",
      status: "READY",
      metrics: [
        { key: "turnover_weight", label: "turnover weight", value: "0.045" },
        { key: "cash_weight", label: "cash weight", value: "0.08" },
      ],
      reasonCodes: [
        "TARGET_METHOD_COMPARISON_AVAILABLE",
        "REGIME_SCENARIO_PACK_READY",
      ],
      objectiveTraceCount: 1,
      constraintTraceCount: 1,
    });
  });

  it("uses an idle state before Gateway returns an alternative set", () => {
    const model = buildConstructionPanelModel(null);

    expect(model.state).toBe("idle");
    expect(model.supportabilityState).toBe("NOT_GENERATED");
    expect(model.alternatives).toEqual([]);
  });

  it("preserves blocked posture from manage supportability", () => {
    const model = buildConstructionPanelModel({
      ...readyResponse,
      supportability: {
        ...readyResponse.supportability,
        state: "BLOCKED",
        reason_codes: ["SOURCE_READINESS_BLOCKED"],
      },
    });

    expect(model.state).toBe("blocked");
    expect(model.supportabilityReasons).toEqual(["SOURCE_READINESS_BLOCKED"]);
  });
});
