import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioMemoryRecommendedActionsRail from "../../src/features/workbench/components/portfolio-memory-recommended-actions-rail";
import type { PortfolioMemoryRecommendedAction } from "../../src/features/workbench/portfolio-memory-view-model";

const actions: PortfolioMemoryRecommendedAction[] = [
  {
    key: "review-latest",
    title: "Review latest memory event",
    body: "Check the most recent mandate, rebalance, review, or evidence update.",
    icon: "refresh",
  },
  {
    key: "review-supportability",
    title: "Review supportability posture",
    body: "Use the source-owned supportability and reason-code posture before follow-up.",
    icon: "verify",
  },
];

describe("PortfolioMemoryRecommendedActionsRail", () => {
  it("renders advisor review guidance without enabling local workflow actions", () => {
    render(<PortfolioMemoryRecommendedActionsRail actions={actions} />);

    expect(screen.getByRole("heading", { name: "Recommended Actions" })).toBeInTheDocument();
    expect(screen.getByText("Review latest memory event")).toBeInTheDocument();
    expect(screen.getByText("Review supportability posture")).toBeInTheDocument();
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(document.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(2);
    expect(document.querySelector(".material-symbols-outlined")).toBeNull();
    expect(screen.queryByText("autorenew")).not.toBeInTheDocument();
    expect(screen.queryByText("fact_check")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("Add advisor note")).not.toBeInTheDocument();
    expect(screen.queryByText(/client preference/i)).not.toBeInTheDocument();
  });

  it("renders fail-closed empty posture without inventing client or execution controls", () => {
    render(<PortfolioMemoryRecommendedActionsRail actions={[]} />);

    expect(screen.getByText("No recommended review steps returned")).toBeInTheDocument();
    expect(screen.queryByText("Message client")).not.toBeInTheDocument();
    expect(screen.queryByText("Approve client communication")).not.toBeInTheDocument();
    expect(screen.queryByText("Generate Order")).not.toBeInTheDocument();
    expect(screen.queryByText("Route Order")).not.toBeInTheDocument();
    expect(screen.queryByText("Mark Filled")).not.toBeInTheDocument();
    expect(screen.queryByText("Settle")).not.toBeInTheDocument();
  });
});
