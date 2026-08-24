import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ManageOverviewDecisionWorklist from "../../src/features/workbench/components/manage-overview-decision-worklist";
import type { ManageOverviewDecision } from "../../src/features/workbench/manage-overview-model";

const decisions: ManageOverviewDecision[] = [
  buildDecision("decision-a", "Review mandate evidence"),
  buildDecision("decision-b", "Review proposed rebalance"),
  buildDecision("decision-c", "Resolve source evidence"),
];

describe("ManageOverviewDecisionWorklist", () => {
  it("retains the admitted fallback after removal and source reordering", () => {
    const { rerender } = render(
      <ManageOverviewDecisionWorklist
        selectionScopeKey="portfolio-a"
        decisions={decisions.slice(0, 2)}
      />,
    );

    rerender(
      <ManageOverviewDecisionWorklist
        selectionScopeKey="portfolio-a"
        decisions={[decisions[1]]}
      />,
    );
    rerender(
      <ManageOverviewDecisionWorklist
        selectionScopeKey="portfolio-a"
        decisions={[decisions[2], decisions[1]]}
      />,
    );

    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveTextContent("Resolve source evidence");
    expect(options[0]).toHaveAttribute("aria-selected", "false");
    expect(options[1]).toHaveTextContent("Review proposed rebalance");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("region", {
        name: "Selected portfolio-management decision",
      }),
    ).toHaveTextContent("Continue Review proposed rebalance");
  });
});

function buildDecision(
  key: string,
  title: string,
): ManageOverviewDecision {
  return {
    key,
    kind: "attention",
    title,
    subtitle: "Source-owned portfolio decision",
    status: "Needs attention",
    tone: "warn",
    facts: [{ label: "Priority", value: "High" }],
    nextAction: `Continue ${title}`,
    evidence: [{ label: "Evidence", value: "Available" }],
    actionHref: `/workbench/portfolio-a?decision=${key}`,
    actionLabel: "Open source workflow",
  };
}
