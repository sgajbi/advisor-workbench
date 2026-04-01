import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AnalyticsRankedList from "../../src/design-system/components/analytics-ranked-list";

describe("AnalyticsRankedList", () => {
  it("renders ranked rows through the shared workbench summary visual contract", () => {
    const { container } = render(
      <AnalyticsRankedList
        title="Top contributors"
        label="Contribution"
        scale={1}
        rows={[
          {
            key: "msft",
            title: "Microsoft",
            subtitle: "Technology",
            value: "1.42%",
            magnitudePct: 1.42,
            tone: "positive",
          },
          {
            key: "aapl",
            title: "Apple",
            subtitle: "Equity",
            value: "-0.91%",
            magnitudePct: 0.91,
            tone: "negative",
          },
        ]}
      />
    );

    const heading = screen.getByText("Top contributors");
    expect(heading).toHaveClass("workbench-summary-visual-heading");
    expect(screen.getByText("Contribution")).toHaveClass("workbench-summary-visual-meta");
    expect(container.querySelector(".workbench-ranked-bar-track")).not.toBeNull();

    const microsoftLabel = screen.getByText("Microsoft");
    const microsoftRow = microsoftLabel.parentElement?.parentElement;
    expect(microsoftRow).not.toBeNull();
    expect(microsoftLabel).toHaveClass(
      "workbench-summary-visual-label"
    );
    expect(within(microsoftRow as HTMLElement).getByText("Technology")).toHaveClass(
      "workbench-summary-visual-meta"
    );
    expect(within(microsoftRow as HTMLElement).getByText("1.42%")).toHaveClass(
      "workbench-summary-visual-value"
    );
    expect(container.querySelectorAll(".workbench-summary-visual-track")).toHaveLength(2);
    expect(container.querySelectorAll(".workbench-ranked-bar-value")).toHaveLength(2);
  });

  it("renders an explicit empty message when no ranked rows are available", () => {
    const { container } = render(
      <AnalyticsRankedList
        title="Lowest"
        label="Contribution"
        rows={[]}
        scale={1}
        emptyMessage="No detractors are present for the selected analytical slice."
      />
    );

    expect(screen.getByText("Lowest")).toBeInTheDocument();
    expect(
      screen.getByText("No detractors are present for the selected analytical slice.")
    ).toBeInTheDocument();
    expect(screen.getByText("Lowest")).toHaveClass("workbench-summary-visual-heading");
    expect(container.querySelector(".workbench-summary-visual-meta")).not.toBeNull();
  });
});
