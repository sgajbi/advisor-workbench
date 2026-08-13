import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PerformanceAnalysisSegmentToolbar from "../../src/apps/performance/components/performance-analysis-segment-toolbar";

describe("PerformanceAnalysisSegmentToolbar", () => {
  it("normalizes stale deep-link values before they reach the MUI select", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <PerformanceAnalysisSegmentToolbar
        fieldLabel="Attribution"
        ariaLabel="Attribution dimension"
        value="issuer"
        options={["asset_class", "sector", "country", "currency"]}
        isOptionSupported={() => true}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Attribution dimension")).not.toHaveTextContent("Issuer");
    expect(
      consoleError.mock.calls.some(([message]) =>
        String(message).includes("out-of-range value")
      )
    ).toBe(false);

    consoleError.mockRestore();
  });

  it("returns focus to the segment control after its source refresh settles", () => {
    const onChange = vi.fn();
    const properties = {
      ariaLabel: "Contribution dimension",
      value: "asset_class",
      options: ["asset_class", "sector"],
      isOptionSupported: () => true,
      onChange,
    } as const;
    const { rerender } = render(<PerformanceAnalysisSegmentToolbar {...properties} />);
    const segmentControl = screen.getByRole("combobox", {
      name: "Contribution dimension",
    });

    fireEvent.mouseDown(segmentControl);
    fireEvent.click(screen.getByRole("option", { name: "Sector" }));
    expect(onChange).toHaveBeenCalledWith("sector");

    rerender(<PerformanceAnalysisSegmentToolbar {...properties} disabled />);
    rerender(<PerformanceAnalysisSegmentToolbar {...properties} />);

    expect(segmentControl).toHaveFocus();
  });
});
