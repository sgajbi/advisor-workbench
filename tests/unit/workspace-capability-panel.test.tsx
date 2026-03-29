import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import WorkspaceCapabilityPanel from "../../src/design-system/components/workspace-capability-panel";

describe("WorkspaceCapabilityPanel", () => {
  it("renders partial capabilities through the module state panel contract", () => {
    const { container } = render(
      <WorkspaceCapabilityPanel
        capability={{ state: "partial", reason: "Classification is incomplete." }}
        partialTitle="Income is not classified yet"
        unavailableTitle="No income activity"
        body="Classification is incomplete."
        hint="Publish the classified summary to complete the view."
      />
    );

    expect(screen.getByText("Income is not classified yet")).toBeInTheDocument();
    expect(screen.getByText("Classification is incomplete.")).toBeInTheDocument();
    expect(screen.getByText("Publish the classified summary to complete the view.")).toBeInTheDocument();
    expect(container.querySelector(".module-state-panel-partial")).not.toBeNull();
  });

  it("renders unavailable capabilities through the empty state contract", () => {
    const { container } = render(
      <WorkspaceCapabilityPanel
        capability={{ state: "unavailable", reason: "No income activity is available in the current reporting window." }}
        partialTitle="Income is not classified yet"
        unavailableTitle="No income activity"
        body="No income activity is available in the current reporting window."
        hint="Dividend and coupon events will populate income once they are booked."
      />
    );

    expect(screen.getByText("No income activity")).toBeInTheDocument();
    expect(
      screen.getByText("No income activity is available in the current reporting window.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Dividend and coupon events will populate income once they are booked.")
    ).toBeInTheDocument();
    expect(container.querySelector(".portfolio-empty-state")).not.toBeNull();
  });
});
