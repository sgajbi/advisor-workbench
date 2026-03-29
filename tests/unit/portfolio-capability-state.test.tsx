import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioCapabilityState from "../../src/apps/portfolio/components/portfolio-capability-state";

describe("PortfolioCapabilityState", () => {
  it("renders a partial module-state panel when capability support is incomplete", () => {
    render(
      <PortfolioCapabilityState
        capability={{
          state: "partial",
          reason: "Holdings are present, but allocation views have not been generated from current valuations.",
        }}
        partialTitle="Allocation is partially available"
        unavailableTitle="No allocation data yet"
        body="Holdings are present, but allocation views have not been generated from current valuations."
        hint="Publish current prices and valuation outputs to complete the composition view."
      />
    );

    expect(screen.getByText("Allocation is partially available")).toBeInTheDocument();
    expect(screen.getByText("Publish current prices and valuation outputs to complete the composition view.")).toBeInTheDocument();
  });

  it("renders an unavailable empty-state panel when capability support is absent", () => {
    render(
      <PortfolioCapabilityState
        capability={{
          state: "unavailable",
          reason: "Allocation becomes available once funded holdings are valued.",
        }}
        partialTitle="Allocation is partially available"
        unavailableTitle="No allocation data yet"
        body="Allocation becomes available once funded holdings are valued."
        hint="Book positions and publish prices to generate allocation views."
        illustration
      />
    );

    expect(screen.getByText("No allocation data yet")).toBeInTheDocument();
    expect(screen.getByText("Book positions and publish prices to generate allocation views.")).toBeInTheDocument();
  });
});
