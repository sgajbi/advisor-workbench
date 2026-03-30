import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceExecutiveReturnStrip from "../../src/apps/performance/components/performance-executive-return-strip";
import type { PerformanceExecutiveReturnPresentation } from "../../src/apps/performance/components/performance-workspace-view-helpers";

describe("PerformanceExecutiveReturnStrip", () => {
  it("renders the core front-office return metrics", () => {
    const presentation: PerformanceExecutiveReturnPresentation = {
      cards: [
        { label: "Portfolio Return", value: "5.42%", support: "Performance over the selected period.", emphasize: true },
        { label: "Benchmark Return", value: "4.91%", support: "Benchmark-relative return for the selected period." },
        { label: "Active Return", value: "0.51%", support: "Portfolio return minus benchmark return." },
        { label: "Money-Weighted Return", value: "5.12%", support: "Annualized 5.12%" },
        { label: "Basis", value: "Net", support: "Selected measurement basis." },
        { label: "Period", value: "YTD", support: "01 Jan 2026 - 29 Mar 2026" },
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
  });
});
