import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioReviewDecisionBrief from "../../src/apps/portfolio/components/portfolio-review-decision-brief";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";

describe("PortfolioReviewDecisionBrief", () => {
  it("presents source-owned review priorities in business order", () => {
    render(
      <PortfolioReviewDecisionBrief
        workspace={buildPortfolioWorkspace({
          exception_summaries: [
            {
              key: "pricing",
              title: "Pricing coverage incomplete",
              detail: "Two holdings do not have a current valuation.",
              tone: "warn",
              href: "#portfolio-attention",
            },
          ],
          workflow_actions: [
            {
              sequence: 1,
              title: "Review performance",
              impact: "Review portfolio return and benchmark context.",
              target: "Performance review",
              href: "/performance",
              cta_label: "Performance",
              recommended: true,
            },
          ],
          readiness_indicators: [
            { key: "holdings", label: "Holdings", status: "Ready", href: "/positions" },
            { key: "pricing", label: "Pricing", status: "Missing", href: "#portfolio-attention" },
            { key: "transactions", label: "Transactions", status: "Ready", href: "/transactions" },
            { key: "reporting", label: "Reporting", status: "Ready", href: "/portfolio" },
          ],
        })}
      />
    );

    expect(screen.getByRole("heading", { name: "Pricing coverage incomplete" })).toBeInTheDocument();
    expect(screen.getByText("Review focus")).toBeInTheDocument();
    expect(screen.getByText("Portfolio readiness")).toBeInTheDocument();
    expect(screen.getByText("Open exceptions")).toBeInTheDocument();
    expect(screen.getByText("Recommended next step")).toBeInTheDocument();
    expect(screen.getByText("Review performance")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.queryByText("Cash Review Needed")).not.toBeInTheDocument();

    expect(screen.queryByText("Liquidity horizon")).not.toBeInTheDocument();
    expect(screen.queryByText("Mandate workflow")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Asset Allocation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Top Holdings" })).not.toBeInTheDocument();
  });
});
