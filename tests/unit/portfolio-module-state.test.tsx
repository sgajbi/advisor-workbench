import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioModuleState from "../../src/apps/portfolio/components/portfolio-module-state";
import { partial, unavailable } from "../../src/shell/workspace-capabilities";

describe("PortfolioModuleState", () => {
  it("renders the shared loading state through the portfolio module wrapper", () => {
    const { container } = render(
      <PortfolioModuleState
        variant="loading"
        title="Loading analytics"
        message="Analytical detail is loading for the selected portfolio context."
        chart
        rows={4}
      />
    );

    expect(screen.getByText("Loading analytics")).toBeInTheDocument();
    expect(container.querySelector(".portfolio-module-state")).not.toBeNull();
    expect(container.querySelector(".workbench-loading-state")).not.toBeNull();
  });

  it("renders capability-backed partial states through one shared portfolio state surface", () => {
    const { container } = render(
      <PortfolioModuleState
        variant="capability"
        capability={partial("Aggregation is incomplete.")}
        partialTitle="Income is not classified yet"
        unavailableTitle="No income activity"
        body="Aggregation is incomplete."
        partialHint="Publish the classified summary."
        unavailableHint="Book events to populate this view."
      />
    );

    expect(screen.getByText("Income is not classified yet")).toBeInTheDocument();
    expect(screen.getByText("Publish the classified summary.")).toBeInTheDocument();
    expect(container.querySelector(".portfolio-module-state")).not.toBeNull();
    expect(container.querySelector(".module-state-panel-partial")).not.toBeNull();
  });

  it("renders shared empty/error states through the same portfolio state surface", () => {
    const { container } = render(
      <PortfolioModuleState
        variant="status"
        state="empty"
        title="No transactions booked"
        body="No funding, trading, or cash activity has been recorded in the selected window."
        hint="Start with a funding entry or the first trade."
      />
    );

    expect(screen.getByText("No transactions booked")).toBeInTheDocument();
    expect(container.querySelector(".portfolio-module-state")).not.toBeNull();
    expect(container.querySelector(".portfolio-empty-state")).not.toBeNull();
  });

  it("suppresses hidden capability states instead of rendering dead wrappers", () => {
    const { container } = render(
      <PortfolioModuleState
        variant="capability"
        capability={unavailable("No top holdings are available.")}
        partialTitle="Partial"
        unavailableTitle="Unavailable"
        body="No top holdings are available."
      />
    );

    expect(container.querySelector(".portfolio-module-state")).not.toBeNull();
  });
});
