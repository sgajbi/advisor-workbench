import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceAnalysisLevelSection from "../../src/apps/performance/components/performance-analysis-level-section";

describe("PerformanceAnalysisLevelSection", () => {
  it("renders a shared analysis level heading and body", () => {
    render(
      <PerformanceAnalysisLevelSection title="Asset Class">
        <div>Level body</div>
      </PerformanceAnalysisLevelSection>
    );

    expect(document.querySelector(".performance-analysis-level-section")).toBeTruthy();
    expect(document.querySelector(".performance-analysis-level-header")).toBeTruthy();
    expect(screen.getByText("Asset Class")).toBeInTheDocument();
    expect(screen.getByText("Level body")).toBeInTheDocument();
  });
});
