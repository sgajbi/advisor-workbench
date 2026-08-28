import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ConstructionCommandSummaryCard from "../../src/features/workbench/components/construction-command-summary-card";
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
      },
    ],
  },
};

describe("ConstructionCommandSummaryCard", () => {
  it("renders idle posture and delegates Gateway-backed generation", () => {
    const onGenerateAlternatives = vi.fn();

    render(
      <ConstructionCommandSummaryCard
        model={buildConstructionPanelModel(null)}
        portfolioId="PB_SG_GLOBAL_BAL_001"
        generatePending={false}
        actionMessage={null}
        actionError={null}
        onGenerateAlternatives={onGenerateAlternatives}
      />,
    );

    expect(
      screen.getByText("Construction alternatives have not been generated"),
    ).toBeInTheDocument();
    expect(screen.getByText(/PB_SG_GLOBAL_BAL_001/)).toBeInTheDocument();
    expect(screen.getByText("Recommended Path")).toBeInTheDocument();
    expect(screen.getAllByText("Not generated").length).toBeGreaterThan(0);
    expect(
      screen.queryByText("Construction Alternatives Not Requested"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Review required")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Generate alternatives" }));
    expect(onGenerateAlternatives).toHaveBeenCalledTimes(1);
  });

  it("renders source-owned generated summary without exposing source identifiers", () => {
    render(
      <ConstructionCommandSummaryCard
        model={buildConstructionPanelModel(constructionResponse)}
        portfolioId="PB_SG_GLOBAL_BAL_001"
        generatePending={false}
        actionMessage="Construction alternatives generated from mandate data."
        actionError={null}
        onGenerateAlternatives={vi.fn()}
      />,
    );

    expect(screen.queryByText("Construction alternatives have not been generated")).not.toBeInTheDocument();
    expect(screen.getByText("Balanced Transition")).toBeInTheDocument();
    expect(screen.getByText("Within Range")).toBeInTheDocument();
    expect(screen.getByText("72.4%")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(
      screen.getByText("Construction alternatives generated from mandate data."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Regime Scenario Pack Ready")).not.toBeInTheDocument();
    expect(screen.queryByText("Review required")).not.toBeInTheDocument();
    expect(screen.queryByText("cas_1")).not.toBeInTheDocument();
    expect(screen.queryByText("corr-rfc39")).not.toBeInTheDocument();
  });

  it("fails closed for pending and error posture without client communication or execution controls", () => {
    render(
      <ConstructionCommandSummaryCard
        model={buildConstructionPanelModel(null)}
        portfolioId="PB_SG_GLOBAL_BAL_001"
        generatePending={true}
        actionMessage={null}
        actionError="Gateway unavailable"
        onGenerateAlternatives={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Construction alternatives unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Existing portfolio and mandate information remains available. Try again before selecting an implementation path.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Gateway unavailable")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generating alternatives" })).toBeDisabled();
    expect(screen.queryByText("Message client")).not.toBeInTheDocument();
    expect(screen.queryByText("Generate Order")).not.toBeInTheDocument();
    expect(screen.queryByText("Route Order")).not.toBeInTheDocument();
    expect(screen.queryByText("Mark Filled")).not.toBeInTheDocument();
    expect(screen.queryByText("Settle")).not.toBeInTheDocument();
  });
});
