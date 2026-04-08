import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RiskPrimaryPanelGroup from "../../src/apps/performance/components/risk/risk-primary-panel-group";
import RiskSecondaryPanelGroup from "../../src/apps/performance/components/risk/risk-secondary-panel-group";

describe("Risk panel groups", () => {
  it("keeps the primary review path anchored on snapshot before drawdown and concentration", () => {
    render(
      <RiskPrimaryPanelGroup
        snapshot={<section aria-label="Snapshot panel">Snapshot</section>}
        drawdown={<section aria-label="Drawdown panel">Drawdown</section>}
        concentration={<section aria-label="Concentration panel">Concentration</section>}
      />
    );

    const primaryGroup = screen.getByLabelText("Primary risk review");
    expect(within(primaryGroup).getByText("Front-line risk review")).toBeInTheDocument();
    expect(within(primaryGroup).getByLabelText("Snapshot panel")).toBeInTheDocument();
    expect(within(primaryGroup).getByLabelText("Drawdown panel")).toBeInTheDocument();
    expect(within(primaryGroup).getByLabelText("Concentration panel")).toBeInTheDocument();
  });

  it("keeps rolling and attribution grouped as secondary analysis", () => {
    const { container } = render(
      <RiskSecondaryPanelGroup
        rolling={<section aria-label="Rolling panel">Rolling</section>}
        attribution={<section aria-label="Attribution panel">Attribution</section>}
      />
    );

    const secondaryGroup = screen.getByLabelText("Secondary risk analysis");
    expect(within(secondaryGroup).getByText("Analytical follow-through")).toBeInTheDocument();
    expect(within(secondaryGroup).getByLabelText("Rolling panel")).toBeInTheDocument();
    expect(within(secondaryGroup).getByLabelText("Attribution panel")).toBeInTheDocument();
    expect(container.querySelector(".performance-risk-secondary-panel-slot-rolling")).toBeTruthy();
    expect(container.querySelector(".performance-risk-secondary-panel-slot-attribution")).toBeTruthy();
  });
});
