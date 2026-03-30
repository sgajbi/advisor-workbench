import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import WorkbenchDataGridFrame from "../../src/design-system/components/workbench-data-grid-frame";

describe("WorkbenchDataGridFrame", () => {
  it("renders a shared grid frame with controls and body", () => {
    render(
      <WorkbenchDataGridFrame
        id="transactions-grid"
        title="Transactions"
        subtitle="Latest booked activity"
        actions={<button type="button">Export</button>}
        controls={<div>Grid controls</div>}
      >
        <div>AG Grid body</div>
      </WorkbenchDataGridFrame>
    );

    expect(document.querySelector(".workbench-data-grid-frame")).toBeTruthy();
    expect(document.querySelector("#transactions-grid.workbench-data-grid-frame")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Transactions" })).toBeInTheDocument();
    expect(screen.getByText("Grid controls").closest(".workbench-data-grid-frame-controls")).toBeTruthy();
    expect(screen.getByText("AG Grid body").closest(".workbench-data-grid-frame-body")).toBeTruthy();
  });
});
