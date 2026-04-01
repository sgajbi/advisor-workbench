import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioAnalyticsCapabilityBody from "../../src/apps/portfolio/components/portfolio-analytics-capability-body";

describe("PortfolioAnalyticsCapabilityBody", () => {
  it("renders a loading skeleton while detailed data is pending", () => {
    const { container } = render(
      <PortfolioAnalyticsCapabilityBody
        capability={{ state: "supported" }}
        detailsLoading
        supportedData={{}}
        partialTitle="Partial"
        unavailableTitle="Unavailable"
        body="Body"
        partialHint="Partial hint"
        unavailableHint="Unavailable hint"
      >
        {() => <div>Supported content</div>}
      </PortfolioAnalyticsCapabilityBody>
    );

    expect(screen.getByText("Loading analytics")).toBeInTheDocument();
    expect(
      screen.getByText("Analytical detail is loading for the selected portfolio context.")
    ).toBeInTheDocument();
    expect(container.querySelector(".portfolio-module-state")).not.toBeNull();
    expect(container.querySelector(".workbench-loading-state")).not.toBeNull();
    expect(container.querySelector(".module-skeleton")).not.toBeNull();
    expect(screen.queryByText("Supported content")).not.toBeInTheDocument();
  });

  it("renders supported content when the capability is supported and data exists", () => {
    render(
      <PortfolioAnalyticsCapabilityBody
        capability={{ state: "supported" }}
        detailsLoading={false}
        supportedData={{ ready: true }}
        partialTitle="Partial"
        unavailableTitle="Unavailable"
        body="Body"
        partialHint="Partial hint"
        unavailableHint="Unavailable hint"
      >
        {() => <div>Supported content</div>}
      </PortfolioAnalyticsCapabilityBody>
    );

    expect(screen.getByText("Supported content")).toBeInTheDocument();
  });

  it("renders a partial capability panel when the contract is incomplete", () => {
    const { container } = render(
      <PortfolioAnalyticsCapabilityBody
        capability={{ state: "partial", reason: "Aggregation is incomplete." }}
        detailsLoading={false}
        supportedData={null}
        partialTitle="Income is not classified yet"
        unavailableTitle="No income activity"
        body="Aggregation is incomplete."
        partialHint="Publish the classified summary."
        unavailableHint="Book events to populate this view."
      >
        {() => <div>Supported content</div>}
      </PortfolioAnalyticsCapabilityBody>
    );

    expect(screen.getByText("Income is not classified yet")).toBeInTheDocument();
    expect(screen.getByText("Publish the classified summary.")).toBeInTheDocument();
    expect(container.querySelector(".portfolio-module-state")).not.toBeNull();
    expect(container.querySelector(".module-state-panel-partial")).not.toBeNull();
  });

  it("renders an unavailable empty state when there is no backend support", () => {
    const { container } = render(
      <PortfolioAnalyticsCapabilityBody
        capability={{ state: "unavailable", reason: "No activity summary is available." }}
        detailsLoading={false}
        supportedData={null}
        partialTitle="Activity totals are incomplete"
        unavailableTitle="No client activity"
        body="No activity summary is available."
        partialHint="Publish activity aggregation."
        unavailableHint="Funding and trade events will populate the activity view."
      >
        {() => <div>Supported content</div>}
      </PortfolioAnalyticsCapabilityBody>
    );

    expect(screen.getByText("No client activity")).toBeInTheDocument();
    expect(screen.getByText("Funding and trade events will populate the activity view.")).toBeInTheDocument();
    expect(container.querySelector(".portfolio-module-state")).not.toBeNull();
    expect(container.querySelector(".portfolio-empty-state")).not.toBeNull();
  });
});
