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
    expect(screen.getByText("Partial")).toBeInTheDocument();
    expect(screen.getByText("Reporting coverage")).toBeInTheDocument();
    expect(screen.getByText("Open exceptions")).toBeInTheDocument();
    expect(screen.getByText("Recommended next step")).toBeInTheDocument();
    expect(screen.getByText("Review performance")).toBeInTheDocument();
    expect(screen.queryByText("75%")).not.toBeInTheDocument();
    expect(screen.queryByText("Cash Review Needed")).not.toBeInTheDocument();

    expect(screen.queryByText("Liquidity horizon")).not.toBeInTheDocument();
    expect(screen.queryByText("Mandate workflow")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Asset Allocation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Top Holdings" })).not.toBeInTheDocument();
  });

  it("does not declare a partial portfolio ready when no exception or action is present", () => {
    render(
      <PortfolioReviewDecisionBrief
        workspace={buildPortfolioWorkspace({
          readiness: {
            has_positions: true,
            reporting: {
              status: "PENDING",
              generated_at_utc: null,
              row_count: 10,
            },
          },
          exception_summaries: [],
          partial_failures: [],
          insights: [],
          workflow_actions: [],
        })}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Portfolio review needs completion" })
    ).toBeInTheDocument();
    expect(screen.getByText("10 report rows published")).toBeInTheDocument();
    expect(screen.queryByText("Review coverage")).not.toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    expect(screen.queryByText("Recommended next step")).not.toBeInTheDocument();
  });

  it("communicates a ready portfolio once without duplicate all-clear facts", () => {
    render(
      <PortfolioReviewDecisionBrief
        workspace={buildPortfolioWorkspace({
          exception_summaries: [],
          partial_failures: [],
          insights: [],
          workflow_actions: [],
          operations: {
            business_date: "2026-05-12",
            latest_booked_transaction_date: "2026-05-12",
            latest_booked_position_snapshot_date: "2026-05-12",
            publish_allowed: true,
            controls_blocking: null,
            active_reprocessing_keys: null,
            stale_reprocessing_keys: null,
            failed_valuation_jobs_within_window: null,
            failed_aggregation_jobs_within_window: null,
          },
        })}
      />
    );

    expect(screen.getByRole("heading", { name: "Portfolio review is ready" })).toBeInTheDocument();
    expect(screen.getByText("No source-reported items need attention.")).toBeInTheDocument();
    expect(screen.queryByText("Open exceptions")).not.toBeInTheDocument();
    expect(screen.queryByText("Clear")).not.toBeInTheDocument();
    expect(screen.queryByText("Recommended next step")).not.toBeInTheDocument();
  });
});
