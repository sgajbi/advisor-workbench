import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CapabilityStatePanel from "../../src/design-system/components/capability-state-panel";

describe("CapabilityStatePanel", () => {
  it("renders a partial capability using the shared analysis surface", () => {
    const { container } = render(
      <CapabilityStatePanel
        capability={{ state: "partial", reason: "Attribution rows are incomplete." }}
        partialTitle="Attribution detail is partial"
        unavailableTitle="Attribution detail unavailable"
        body="Attribution rows are incomplete."
        partialHint="Aggregate totals remain available."
        surface="analysis"
      />
    );

    expect(screen.getByText("Attribution detail is partial")).toBeInTheDocument();
    expect(screen.getByText("Attribution rows are incomplete.")).toBeInTheDocument();
    expect(screen.getByText("Aggregate totals remain available.")).toBeInTheDocument();
    expect(container.querySelector(".performance-analysis-state-panel-partial")).not.toBeNull();
  });

  it("renders an unavailable capability using the shared portfolio empty-state surface", () => {
    const { container } = render(
      <CapabilityStatePanel
        capability={{ state: "unavailable", reason: "No income activity is available." }}
        partialTitle="Income is not classified yet"
        unavailableTitle="No income activity"
        body="No income activity is available."
        unavailableHint="Book dividend and coupon events to populate this view."
        surface="portfolio"
        illustration
        centered
      />
    );

    expect(screen.getByText("No income activity")).toBeInTheDocument();
    expect(screen.getByText("No income activity is available.")).toBeInTheDocument();
    expect(
      screen.getByText("Book dividend and coupon events to populate this view.")
    ).toBeInTheDocument();
    expect(container.querySelector(".portfolio-empty-state-illustrated")).not.toBeNull();
    expect(container.querySelector(".portfolio-empty-state-centered")).not.toBeNull();
  });
});
