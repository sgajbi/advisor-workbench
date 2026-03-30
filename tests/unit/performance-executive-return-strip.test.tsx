import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceExecutiveReturnStrip from "../../src/apps/performance/components/performance-executive-return-strip";
import type { PerformanceExecutiveReturnPresentation } from "../../src/apps/performance/components/performance-workspace-view-helpers";

describe("PerformanceExecutiveReturnStrip", () => {
  it("renders the core front-office return metrics", () => {
    const presentation: PerformanceExecutiveReturnPresentation = {
      cards: [
        { label: "Portfolio Return", value: "5.42%", support: "Selected portfolio performance", emphasize: true, priority: "primary" },
        { label: "Benchmark Return", value: "4.91%", support: "Assigned benchmark result", priority: "comparison" },
        { label: "Active Return", value: "0.51%", support: "Portfolio versus benchmark", priority: "comparison" },
        { label: "Money-Weighted Return", value: "5.12%", support: "Annualized 5.12%", priority: "supporting" },
        { label: "Basis", value: "Net", support: "Measurement basis", priority: "utility" },
        { label: "Period", value: "YTD", support: "01 Jan 2026 - 29 Mar 2026", priority: "utility" },
      ],
    };

    render(<PerformanceExecutiveReturnStrip presentation={presentation} />);

    expect(screen.getByLabelText("Executive return strip")).toBeInTheDocument();
    expect(screen.getByText("Portfolio Return")).toBeInTheDocument();
    expect(screen.getByText("Benchmark Return")).toBeInTheDocument();
    expect(screen.getByText("Active Return")).toBeInTheDocument();
    expect(screen.getByText("Money-Weighted Return")).toBeInTheDocument();
    expect(screen.getByText("Basis")).toBeInTheDocument();
    expect(screen.getByText("Period")).toBeInTheDocument();
    expect(screen.queryByText("Benchmark")).not.toBeInTheDocument();
    expect(document.querySelector(".performance-summary-kpi-card-primary")).toBeTruthy();
    expect(document.querySelectorAll(".performance-summary-kpi-card-comparison")).toHaveLength(2);
    expect(document.querySelectorAll(".performance-summary-kpi-card-utility")).toHaveLength(2);
  });
});
