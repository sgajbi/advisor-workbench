import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ConstructionSelectedDetailCard from "../../src/features/workbench/components/construction-selected-detail-card";
import { buildConstructionPanelModel } from "../../src/features/workbench/construction-alternatives-view-model";
import type { DpmConstructionGatewayResponse } from "../../src/features/workbench/types";

const constructionResponse: DpmConstructionGatewayResponse = {
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
        diagnostics: {
          authority_context: {
            currency_overlay_context: {
              supportability_status: "BLOCKED",
              external_hedge_policy_source_product_name: "ExternalHedgePolicy",
              external_hedge_policy_source_product_version: "v1",
              external_hedge_policy_source_id: "sha256:external-hedge-policy",
              external_hedge_policy_content_hash:
                "sha256:external-hedge-policy-content",
              external_hedge_policy_rule_count: 0,
              external_hedge_policy_rules: [],
              missing_data_families: ["external_hedge_policy"],
              blocked_capabilities: ["hedge_policy_approval"],
              reason_codes: ["EXTERNAL_HEDGE_POLICY_FAIL_CLOSED"],
            },
          },
        },
      },
    ],
    trade_impact: {
      trade_count: 8,
      buy_count: 4,
      trim_count: 3,
      cash_reduction_count: 1,
    },
    allocation_comparison: [
      {
        label: "Equity",
        before_pct: "0.52",
        after_pct: "0.49",
      },
    ],
    constraints: [
      { name: "Asset allocation range", state: "PASS" },
      { name: "Cash range", state: "PASS" },
    ],
  },
};

describe("ConstructionSelectedDetailCard", () => {
  it("renders selected path detail and delegates selection", () => {
    const onSelectAlternative = vi.fn();
    const model = buildConstructionPanelModel(constructionResponse);

    render(
      <ConstructionSelectedDetailCard
        model={model}
        selectionPendingId={null}
        canSelectSelectedAlternative
        onSelectAlternative={onSelectAlternative}
      />,
    );

    expect(screen.getByText("Selected: Balanced Transition")).toBeInTheDocument();
    expect(screen.getByText("Business Rationale")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Balances drift reduction, cash deployment, transaction cost, and mandate fit.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Trade Impact Summary")).toBeInTheDocument();
    expect(screen.getByText("Total Trades")).toBeInTheDocument();
    expect(screen.getByText("Buys")).toBeInTheDocument();
    expect(screen.getByText("Allocation Comparison")).toBeInTheDocument();
    expect(screen.getByText("Equity")).toBeInTheDocument();
    expect(screen.getByText("52% to 49%")).toBeInTheDocument();
    expect(screen.getByText("Mandate Integrity Checks")).toBeInTheDocument();
    expect(screen.getByText("Asset Allocation Range")).toBeInTheDocument();
    expect(screen.getByText("Construction Authority Evidence")).toBeInTheDocument();
    expect(screen.getByText("ExternalHedgePolicy v1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Apply Selection" }));

    expect(onSelectAlternative).toHaveBeenCalledWith("alt_balanced_transition");
    expect(screen.queryByText("Generate Order")).not.toBeInTheDocument();
    expect(screen.queryByText("Route Order")).not.toBeInTheDocument();
    expect(screen.queryByText("Mark Filled")).not.toBeInTheDocument();
    expect(screen.queryByText("Settle")).not.toBeInTheDocument();
  });

  it("shows applied and pending selection posture from parent state", () => {
    const onSelectAlternative = vi.fn();
    const selectedModel = {
      ...buildConstructionPanelModel(constructionResponse),
      selectedAlternativeId: "alt_balanced_transition",
    };
    const { rerender } = render(
      <ConstructionSelectedDetailCard
        model={selectedModel}
        selectionPendingId={null}
        canSelectSelectedAlternative={false}
        onSelectAlternative={onSelectAlternative}
      />,
    );

    expect(screen.getByRole("button", { name: "Selection Applied" })).toBeDisabled();

    rerender(
      <ConstructionSelectedDetailCard
        model={selectedModel}
        selectionPendingId="alt_balanced_transition"
        canSelectSelectedAlternative={false}
        onSelectAlternative={onSelectAlternative}
      />,
    );

    expect(screen.getByRole("button", { name: "Applying selection" })).toBeDisabled();
  });

  it("renders empty detail posture without enabling construction commands", () => {
    const onSelectAlternative = vi.fn();

    render(
      <ConstructionSelectedDetailCard
        model={buildConstructionPanelModel(null)}
        selectionPendingId={null}
        canSelectSelectedAlternative={false}
        onSelectAlternative={onSelectAlternative}
      />,
    );

    expect(screen.getByText("Selected: N/A")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply Selection" })).toBeDisabled();
    expect(screen.getByText("Generate alternatives to compare implementation paths.")).toBeInTheDocument();
    expect(screen.getByText("No constraint matrix returned")).toBeInTheDocument();
    expect(screen.queryByText("Construction Authority Evidence")).not.toBeInTheDocument();
  });
});
