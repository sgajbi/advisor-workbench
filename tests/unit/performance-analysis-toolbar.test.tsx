import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceAnalysisToolbar from "../../src/apps/performance/components/performance-analysis-toolbar";

describe("PerformanceAnalysisToolbar", () => {
  it("renders a shared toolbar with controls and optional context", () => {
    render(
      <PerformanceAnalysisToolbar context={<span>Benchmark Global Balanced 60/40 • USD</span>}>
        <button type="button">Segment</button>
      </PerformanceAnalysisToolbar>
    );

    expect(document.querySelector(".performance-analysis-toolbar")).toBeTruthy();
    expect(document.querySelector(".performance-analysis-toolbar-context")).toBeTruthy();
    expect(screen.getByLabelText("Analysis context")).toBeInTheDocument();
    expect(screen.getByText("Segment")).toBeInTheDocument();
    expect(screen.getByText("Benchmark Global Balanced 60/40 • USD")).toBeInTheDocument();
    expect(document.querySelector(".performance-analysis-toolbar-context")?.textContent).toContain(
      "Benchmark Global Balanced 60/40 • USD"
    );
    expect(
      document.querySelector(".performance-analysis-toolbar-context")?.textContent
    ).not.toContain("Versus");
  });
});
