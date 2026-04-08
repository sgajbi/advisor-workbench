import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RiskMetricCard from "../../src/apps/performance/components/risk/risk-metric-card";

describe("RiskMetricCard", () => {
  it("renders a shared risk metric card with definition-backed label treatment", () => {
    const { container } = render(
      <RiskMetricCard
        label="Largest Issuer Weight"
        value="21.40%"
        support="Aggregated exposure to the largest issuer group."
        definition="Combined weight of all holdings mapped to the largest issuer group."
        tone="warn"
      />
    );

    expect(
      screen.getByLabelText(
        "Largest Issuer Weight: Combined weight of all holdings mapped to the largest issuer group."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("21.40%")).toBeInTheDocument();
    expect(screen.getByText("Aggregated exposure to the largest issuer group.")).toBeInTheDocument();
    expect(container.querySelector(".performance-risk-metric-card-warn")).toBeTruthy();
  });

  it("renders the label without a tooltip trigger when no definition is supplied", () => {
    render(
      <RiskMetricCard
        label="Ulcer Index"
        value="5.39%"
        support="Shows how persistent and painful the underwater path was, not just how deep it got."
      />
    );

    expect(screen.getByText("Ulcer Index")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ulcer Index:/ })).not.toBeInTheDocument();
  });
});
