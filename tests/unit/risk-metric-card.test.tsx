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

  it("supports a compact density for tighter first-paint risk cards", () => {
    const { container } = render(
      <RiskMetricCard
        label="Information Ratio"
        value="0.58"
        support="Active return earned per unit of tracking error."
        density="compact"
      />
    );

    expect(container.querySelector(".performance-risk-metric-card-compact")).toBeTruthy();
  });

  it("stacks the value below the header copy in the shared card layout", () => {
    const { container } = render(
      <RiskMetricCard
        label="Volatility"
        value="9.40%"
        support="Overall realised risk level of the portfolio over the selected period."
        definition="Annualized realized volatility of portfolio returns over the selected period."
        displaySupport={false}
      />
    );

    const card = container.querySelector(".performance-risk-metric-card");
    const copy = container.querySelector(".performance-risk-metric-card-copy");
    const value = container.querySelector(".performance-risk-metric-card-value");

    expect(card).toBeTruthy();
    expect(copy).toBeTruthy();
    expect(value).toBeTruthy();
    expect(
      (copy as Node).compareDocumentPosition(value as Node) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("can hide support copy and show metadata for shared key-figure rendering", () => {
    render(
      <RiskMetricCard
        label="Volatility"
        value="9.40%"
        support="Overall realised risk level of the portfolio over the selected period."
        metadata="Typical 4.07% • Range 0.00% to 12.17%"
        displaySupport={false}
        displayMetadata
      />
    );

    expect(screen.queryByText("Overall realised risk level of the portfolio over the selected period.")).not.toBeInTheDocument();
    expect(screen.getByText("Typical 4.07% • Range 0.00% to 12.17%")).toBeInTheDocument();
  });

  it("preserves the hover definition when inline support copy is hidden", () => {
    render(
      <RiskMetricCard
        label="Sharpe"
        value="2.51"
        support="Return earned for each unit of total risk taken."
        definition="Risk-adjusted return based on excess return per unit of realised volatility."
        displaySupport={false}
      />
    );

    expect(screen.queryByText("Return earned for each unit of total risk taken.")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Sharpe: Risk-adjusted return based on excess return per unit of realised volatility.",
      })
    ).toBeInTheDocument();
  });
});
