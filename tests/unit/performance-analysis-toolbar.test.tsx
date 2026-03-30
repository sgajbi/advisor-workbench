import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceAnalysisToolbar from "../../src/apps/performance/components/performance-analysis-toolbar";

describe("PerformanceAnalysisToolbar", () => {
  it("renders a shared toolbar with controls and optional context", () => {
    render(
      <PerformanceAnalysisToolbar context={<span>Versus Benchmark</span>}>
        <button type="button">Segment</button>
      </PerformanceAnalysisToolbar>
    );

    expect(document.querySelector(".performance-analysis-toolbar")).toBeTruthy();
    expect(document.querySelector(".performance-analysis-toolbar-context")).toBeTruthy();
    expect(screen.getByText("Segment")).toBeInTheDocument();
    expect(screen.getByText("Versus Benchmark")).toBeInTheDocument();
  });
});
