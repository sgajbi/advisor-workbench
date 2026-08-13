import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PerformanceReturnViewControl from "../../src/apps/performance/components/performance-return-view-control";

describe("PerformanceReturnViewControl", () => {
  it("keeps return-path presentation independent from source selection", () => {
    const onChange = vi.fn();
    render(
      <PerformanceReturnViewControl
        value="absolute"
        hasBenchmarkSeries
        hasActiveSeries
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Relative" }));
    expect(onChange).toHaveBeenCalledWith("relative");
  });

  it("does not offer unsupported comparative presentations", () => {
    render(
      <PerformanceReturnViewControl
        value="absolute"
        hasBenchmarkSeries={false}
        hasActiveSeries={false}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("radio", { name: "Combined" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Relative" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});
