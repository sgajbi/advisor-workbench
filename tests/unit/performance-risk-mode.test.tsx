import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceRiskMode from "../../src/apps/performance/components/performance-risk-mode";
import { buildSupportedPerformanceScenario } from "../fixtures/performance-workspace-fixtures";

function renderRiskMode(options: { isDetailsPending?: boolean } = {}) {
  const scenario = buildSupportedPerformanceScenario();
  render(
    <PerformanceRiskMode
      workspace={scenario.workspace}
      capabilities={scenario.capabilities}
      period="YTD"
      detailBasis="NET"
      contributionDimension="asset_class"
      attributionDimension="asset_class"
      chartFrequency="monthly"
      isUpdating={false}
      isDetailsPending={options.isDetailsPending ?? false}
    />
  );
}

describe("PerformanceRiskMode", () => {
  it("renders the fixture-backed Risk shell using shared analytical sections", () => {
    renderRiskMode();

    expect(screen.getByRole("region", { name: "Risk" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Stateful Risk" })).toBeInTheDocument();
    expect(screen.getByLabelText("Risk mode status")).toHaveTextContent("Stateful only");
    expect(screen.getByLabelText("Risk context")).toHaveTextContent("Portfolio");
    expect(screen.getByLabelText("Risk snapshot headline metrics")).toHaveTextContent("Volatility");
    expect(screen.getByLabelText("Risk snapshot metric table")).toHaveTextContent("Tracking Error");
    expect(screen.getByLabelText("Risk concentration headline metrics")).toHaveTextContent("Top Issuer");
    expect(screen.getByLabelText("Risk support rail")).toHaveTextContent("Issuer enrichment");
    expect(screen.getByLabelText("Risk provenance")).toHaveTextContent("risk-workspace.v1");
  });

  it("shows a controlled loading state instead of fixture metrics while details are pending", () => {
    renderRiskMode({ isDetailsPending: true });

    expect(screen.getByText("Loading stateful risk")).toBeInTheDocument();
    expect(screen.queryByLabelText("Risk snapshot metric table")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Risk provenance")).toHaveTextContent("Stateful only");
  });
});
