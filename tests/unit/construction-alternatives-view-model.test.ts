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
    objective: "Reduce cash drift while preserving balanced mandate bands",
    source_readiness: {
      "lotus-core": { state: "READY", last_updated: "2026-05-13T08:30:00Z" },
      "lotus-pricing": {
        state: "PARTIAL",
        reason_codes: ["PRICE_STALE"],
      },
    },
    constraints: [
      {
        name: "Asset allocation range",
        current: "Breach",
        after: "Pass",
        state: "PASS",
      },
    ],
    alternatives: [
      {
        alternative_id: "alt_balanced_transition",
        label: "Balanced Transition",
        objective: "Restore model weights with moderate turnover",
        mandate_fit: "Within Range",
        recommended: true,
        method: "BALANCED_TRANSITION",
        method_status: "READY",
        rationale: "Balances drift reduction, cash deployment, transaction cost, and mandate fit.",
        comparison_metrics: {
          turnover_weight: "0.048",
          cash_weight: "0.021",
          drift_improvement_pct: "0.724",
          trade_count: 8,
        },
        objective_trace: [{ term: "turnover" }],
        constraint_trace: [{ constraint: "cash_band" }],
        diagnostics: {
          authority_context: {
            currency_overlay_context: {
              supportability_status: "BLOCKED",
              source_system: "lotus-core",
              external_hedge_policy_source_product_name: "ExternalHedgePolicy",
              external_hedge_policy_source_product_version: "v1",
              external_hedge_policy_source_id: "sha256:external-hedge-policy",
              external_hedge_policy_content_hash:
                "sha256:external-hedge-policy-content",
              external_hedge_policy_rule_count: 0,
              external_hedge_policy_rules: [],
              missing_data_families: ["external_hedge_policy"],
              blocked_capabilities: [
                "hedge_policy_approval",
                "treasury_instruction",
                "counterparty_selection",
                "oms_acknowledgement",
              ],
              reason_codes: ["EXTERNAL_HEDGE_POLICY_FAIL_CLOSED"],
            },
          },
          method_plan: { reason_codes: ["TARGET_METHOD_COMPARISON_AVAILABLE"] },
          enrichment_summary: { reason_codes: ["REGIME_SCENARIO_PACK_READY"] },
        },
      },
    ],
    allocation_comparison: [
      { label: "Equities", before: "64%", after: "58%" },
      { label: "Fixed Income", before: "29%", after: "40%" },
      { label: "Cash", before: "7%", after: "2%" },
    ],
    trade_impact: {
      trade_count: 8,
      buy_count: 4,
      trim_count: 3,
      cash_reduction_count: 1,
    },
  },
};

describe("construction alternatives view model", () => {
  it("keeps manage construction truth visible without recomputation", () => {
    const model = buildConstructionPanelModel(readyResponse);

    expect(model.state).toBe("ready");
    expect(model.alternativeSetId).toBe("cas_1");
    expect(model.alternativeSetState).toBe("READY");
    expect(model.objective).toBe(
      "Reduce cash drift while preserving balanced mandate bands",
    );
    expect(model.supportabilityState).toBe("READY");
    expect(model.supportabilityReasons).toEqual(["REGIME_SCENARIO_PACK_READY"]);
    expect(model.recommendedPathLabel).toBe("Balanced Transition");
    expect(model.mandateFitLabel).toBe("Within Range");
    expect(model.driftImprovementLabel).toBe("72.4%");
    expect(model.approvalReadinessLabel).toBe("Ready");
    expect(model.alternatives[0]).toEqual({
      alternativeId: "alt_balanced_transition",
      method: "BALANCED_TRANSITION",
      status: "READY",
      label: "Balanced Transition",
      objective: "Restore model weights with moderate turnover",
      mandateFit: "Within Range",
      actionLabel: "Review",
      isRecommended: true,
      rationale: "Balances drift reduction, cash deployment, transaction cost, and mandate fit.",
      turnoverPct: "4.8%",
      cashAfterPct: "2.1%",
      driftImprovementPct: "72.4%",
      riskDelta: "N/A",
      trackingErrorDeltaBps: "N/A",
      tradeCount: "8",
      metrics: [
        { key: "turnover_weight", label: "turnover weight", value: "4.8%" },
        { key: "cash_weight", label: "cash weight", value: "2.1%" },
        { key: "drift_improvement_pct", label: "drift improvement pct", value: "72.4%" },
        { key: "trade_count", label: "trade count", value: "8" },
      ],
      reasonCodes: [
        "TARGET_METHOD_COMPARISON_AVAILABLE",
        "REGIME_SCENARIO_PACK_READY",
      ],
      objectiveTraceCount: 1,
      constraintTraceCount: 1,
    });
    expect(model.selectedAlternative?.alternativeId).toBe("alt_balanced_transition");
    expect(model.tradeImpact).toEqual({
      tradeCount: "8",
      buyCount: "4",
      trimCount: "3",
      cashReductionCount: "1",
    });
    expect(model.allocationRows.map((row) => `${row.label}:${row.before}->${row.after}`)).toEqual([
      "Equities:64%->58%",
      "Fixed Income:29%->40%",
      "Cash:7%->2%",
    ]);
    expect(model.constraints).toEqual([
      {
        key: "Asset allocation range-0",
        name: "Asset allocation range",
        state: "PASS",
        current: "Breach",
        after: "Pass",
      },
    ]);
    expect(model.sourceReadiness).toEqual([
      {
        key: "lotus-core-0",
        source: "lotus-core",
        state: "READY",
        lastUpdated: "2026-05-13T08:30:00Z",
        reasonCode: "-",
      },
      {
        key: "lotus-pricing-1",
        source: "lotus-pricing",
        state: "PARTIAL",
        lastUpdated: "N/A",
        reasonCode: "PRICE_STALE",
      },
    ]);
    expect(model.currencyOverlayEvidence).toEqual({
      state: "BLOCKED",
      sourceProductName: "ExternalHedgePolicy",
      sourceProductVersion: "v1",
      sourceId: "sha256:external-hedge-policy",
      contentHash: "sha256:external-hedge-policy-content",
      ruleCount: "0",
      rules: [],
      missingDataFamilies: ["external_hedge_policy"],
      blockedCapabilities: [
        "hedge_policy_approval",
        "treasury_instruction",
        "counterparty_selection",
        "oms_acknowledgement",
      ],
      reasonCodes: ["EXTERNAL_HEDGE_POLICY_FAIL_CLOSED"],
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
