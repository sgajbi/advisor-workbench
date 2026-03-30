import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import WorkspaceStatusPanel from "../../src/design-system/components/workspace-status-panel";

describe("WorkspaceStatusPanel", () => {
  it("renders empty states through the empty-state contract with actions", () => {
    const onClear = vi.fn();
    const { container } = render(
      <WorkspaceStatusPanel
        state="empty"
        title="No projected cashflow"
        body="No projected cash movements are available for the selected horizon."
        hint="Book future-dated events or refresh the forecast inputs to generate a liquidity path."
        action={
          <button type="button" onClick={onClear}>
            Retry
          </button>
        }
      />
    );

    expect(screen.getByText("No projected cashflow")).toBeInTheDocument();
    expect(container.querySelector(".portfolio-empty-state")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onClear).toHaveBeenCalled();
  });

  it("renders partial and error states through the module-state contract", () => {
    const { rerender, container } = render(
      <WorkspaceStatusPanel
        state="partial"
        title="Flat projected cashflow"
        body="Projected cash movements are flat across the current forecast horizon."
        hint="Current projections show no meaningful net liquidity movement."
      />
    );

    expect(screen.getByText("Flat projected cashflow")).toBeInTheDocument();
    expect(container.querySelector(".module-state-panel-partial")).not.toBeNull();

    rerender(
      <WorkspaceStatusPanel
        state="error"
        title="Projected cashflow unavailable"
        body="We could not load projected cashflow for the selected horizon."
        hint="Retry with another horizon or verify that cashflow projection data is available upstream."
      />
    );

    expect(screen.getByText("Projected cashflow unavailable")).toBeInTheDocument();
    expect(container.querySelector(".module-state-panel-error")).not.toBeNull();
  });
});
