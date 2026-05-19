import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ConstructionAlternativesComparisonCard from "../../src/features/workbench/components/construction-alternatives-comparison-card";
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
    selected_alternative_id: "alt_balanced_transition",
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
        comparison_metrics: {
          turnover_weight: "0.048",
          cash_weight: "0.021",
          drift_improvement_pct: "0.724",
        },
      },
      {
        alternative_id: "alt_low_turnover",
        label: "Low Turnover Path",
        objective: "Minimize trading while reducing cash drag",
        mandate_fit: "Acceptable",
        method: "MIN_TURNOVER",
        method_status: "READY",
        comparison_metrics: {
          turnover_weight: "0.021",
          cash_weight: "0.045",
          drift_improvement_pct: "0.48",
        },
      },
    ],
  },
};

describe("ConstructionAlternativesComparisonCard", () => {
  it("renders source-backed construction alternatives and delegates selection", () => {
    const onSelectAlternative = vi.fn();
    const model = buildConstructionPanelModel(constructionResponse);

    render(
      <ConstructionAlternativesComparisonCard
        model={model}
        selectionPendingId={null}
        onSelectAlternative={onSelectAlternative}
      />,
    );

    expect(screen.getByText("Alternatives Comparison")).toBeInTheDocument();
    expect(screen.getByText("2 paths")).toBeInTheDocument();
    expect(screen.getByText("Balanced Transition")).toBeInTheDocument();
    expect(screen.getByText("Low Turnover Path")).toBeInTheDocument();
    expect(screen.getByText("Restore model weights with moderate turnover")).toBeInTheDocument();
    expect(screen.getByText("4.8%")).toBeInTheDocument();
    expect(screen.getAllByText("2.1%")).toHaveLength(2);
    expect(screen.getByText("72.4%")).toBeInTheDocument();
    expect(screen.getByText("Within Range")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Compare" }));

    expect(onSelectAlternative).toHaveBeenCalledWith("alt_low_turnover");
    expect(screen.queryByText("Generate Order")).not.toBeInTheDocument();
    expect(screen.queryByText("Route Order")).not.toBeInTheDocument();
    expect(screen.queryByText("Mark Filled")).not.toBeInTheDocument();
    expect(screen.queryByText("Settle")).not.toBeInTheDocument();
  });

  it("fails closed when the construction state blocks selection", () => {
    const onSelectAlternative = vi.fn();
    const model = {
      ...buildConstructionPanelModel(constructionResponse),
      state: "blocked" as const,
      selectedAlternativeId: null,
    };

    render(
      <ConstructionAlternativesComparisonCard
        model={model}
        selectionPendingId={null}
        onSelectAlternative={onSelectAlternative}
      />,
    );

    const actionButtons = screen.getAllByRole("button");
    expect(actionButtons).toHaveLength(2);
    actionButtons.forEach((button) => expect(button).toBeDisabled());
  });

  it("renders the empty comparison posture without command controls", () => {
    const onSelectAlternative = vi.fn();

    render(
      <ConstructionAlternativesComparisonCard
        model={buildConstructionPanelModel(null)}
        selectionPendingId={null}
        onSelectAlternative={onSelectAlternative}
      />,
    );

    expect(screen.getByText("0 paths")).toBeInTheDocument();
    expect(screen.getByText("No construction alternatives returned")).toBeInTheDocument();
    expect(screen.getByText("Generate an alternative set to compare construction choices.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
