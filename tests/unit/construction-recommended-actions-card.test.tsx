import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ConstructionRecommendedActionsCard from "../../src/features/workbench/components/construction-recommended-actions-card";
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
      },
    ],
  },
};

describe("ConstructionRecommendedActionsCard", () => {
  it("renders advisor next-step links and delegates recommended selection", () => {
    const onSelectRecommended = vi.fn();
    const model = buildConstructionPanelModel(constructionResponse);

    render(
      <ConstructionRecommendedActionsCard
        model={model}
        portfolioId="PB_SG_GLOBAL_BAL_001"
        selectionPendingId={null}
        onSelectRecommended={onSelectRecommended}
      />,
    );

    expect(screen.getByText("Recommended Actions")).toBeInTheDocument();
    expect(screen.getByText("Balanced Transition")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review trade impact" })).toHaveAttribute(
      "href",
      "/workbench/PB_SG_GLOBAL_BAL_001?mode=waves",
    );
    expect(
      screen.getByRole("link", { name: "Resolve mandate attention item" }),
    ).toHaveAttribute("href", "/workbench/PB_SG_GLOBAL_BAL_001?mode=mandate");
    expect(screen.getByRole("link", { name: "Open evidence pack" })).toHaveAttribute(
      "href",
      "/workbench/PB_SG_GLOBAL_BAL_001?mode=proof",
    );

    fireEvent.click(screen.getByRole("button", { name: /Select recommended path/i }));

    expect(onSelectRecommended).toHaveBeenCalledWith("alt_balanced_transition");
    expect(screen.queryByText("Generate Order")).not.toBeInTheDocument();
    expect(screen.queryByText("Route Order")).not.toBeInTheDocument();
    expect(screen.queryByText("Mark Filled")).not.toBeInTheDocument();
    expect(screen.queryByText("Settle")).not.toBeInTheDocument();
  });

  it("fails closed when no source-backed recommended path exists", () => {
    const onSelectRecommended = vi.fn();

    render(
      <ConstructionRecommendedActionsCard
        model={buildConstructionPanelModel(null)}
        portfolioId="PB SG/Global Bal 001"
        selectionPendingId={null}
        onSelectRecommended={onSelectRecommended}
      />,
    );

    expect(screen.getByText("Not generated")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Select recommended path/i })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Review trade impact" })).toHaveAttribute(
      "href",
      "/workbench/PB%20SG%2FGlobal%20Bal%20001?mode=waves",
    );
    expect(onSelectRecommended).not.toHaveBeenCalled();
  });

  it("keeps recommended selection disabled while selection is pending or blocked", () => {
    const onSelectRecommended = vi.fn();
    const model = buildConstructionPanelModel(constructionResponse);
    const { rerender } = render(
      <ConstructionRecommendedActionsCard
        model={model}
        portfolioId="PB_SG_GLOBAL_BAL_001"
        selectionPendingId="alt_balanced_transition"
        onSelectRecommended={onSelectRecommended}
      />,
    );

    expect(screen.getByRole("button", { name: /Select recommended path/i })).toBeDisabled();

    rerender(
      <ConstructionRecommendedActionsCard
        model={{ ...model, state: "blocked" }}
        portfolioId="PB_SG_GLOBAL_BAL_001"
        selectionPendingId={null}
        onSelectRecommended={onSelectRecommended}
      />,
    );

    expect(screen.getByRole("button", { name: /Select recommended path/i })).toBeDisabled();
  });
});
