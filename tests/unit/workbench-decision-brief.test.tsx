import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import WorkbenchDecisionBrief from "../../src/design-system/components/workbench-decision-brief";

describe("WorkbenchDecisionBrief", () => {
  it("renders a compact workflow summary with semantic source status", () => {
    render(
      <WorkbenchDecisionBrief
        ariaLabel="Mandate decision review"
        eyebrow="Review focus"
        title="Allocation drift needs attention"
        support="Equity exposure is outside the approved range."
        score={{
          label: "Review coverage",
          value: "75%",
          tone: "warn",
          support: "One source control remains open",
        }}
        attentionItems={[
          {
            key: "allocation-drift",
            title: "Allocation drift",
            detail: "Review the affected mandate sleeve.",
            tone: "warn",
          },
        ]}
        facts={[
          {
            label: "Recommended next step",
            value: "Open mandate review",
            support: "Confirm the target allocation before rebalancing",
          },
        ]}
        emptyMessage="No items need attention."
      />
    );

    expect(screen.getByRole("region", { name: "Mandate decision review" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Allocation drift needs attention" })).toBeInTheDocument();
    expect(screen.getByText("75%")).toHaveClass("semantic-badge-warn");
    expect(screen.getByText("One source control remains open")).toBeInTheDocument();
    expect(screen.getByText("Recommended next step")).toBeInTheDocument();
  });

  it("states when the source reports no attention items", () => {
    render(
      <WorkbenchDecisionBrief
        ariaLabel="Portfolio decision review"
        eyebrow="Review focus"
        title="Portfolio review is ready"
        support="Review valuation and performance."
        score={{ label: "Review coverage", value: "100%", tone: "success" }}
        attentionItems={[]}
        facts={[]}
        emptyMessage="No source-reported items need attention."
      />
    );

    expect(screen.getByText("No source-reported items need attention.")).toBeInTheDocument();
  });
});
