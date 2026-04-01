import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import WorkbenchChartShell from "../../src/design-system/components/workbench-chart-shell";

describe("WorkbenchChartShell", () => {
  it("renders shared chart module anatomy with context, toolbar, metrics, and body", () => {
    render(
      <WorkbenchChartShell
        title="Return path"
        subtitle="Selected analytical window"
        actions={<button type="button">Export</button>}
        contextRow={<div>Context row</div>}
        toolbar={<div>Toolbar row</div>}
        metricStrip={<div>Metric strip</div>}
      >
        <div>Chart body</div>
      </WorkbenchChartShell>
    );

    expect(document.querySelector(".workbench-chart-shell")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Return path" })).toBeInTheDocument();
    expect(screen.getByText("Selected analytical window")).toBeInTheDocument();
    expect(screen.getByText("Context row").closest(".workbench-chart-shell-context")).toBeTruthy();
    expect(screen.getByText("Toolbar row").closest(".workbench-chart-shell-toolbar")).toBeTruthy();
    expect(screen.getByText("Metric strip").closest(".workbench-chart-shell-metrics")).toBeTruthy();
    expect(screen.getByText("Chart body").closest(".workbench-chart-shell-body")).toBeTruthy();
  });

  it("renders fallback content when the chart body is unavailable", () => {
    render(
      <WorkbenchChartShell
        title="Return path"
        fallbackState={<div>Fallback state</div>}
      />
    );

    expect(screen.getByText("Fallback state")).toBeInTheDocument();
  });
});
