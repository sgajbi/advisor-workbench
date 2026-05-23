import React from "react";
import { render, screen } from "@testing-library/react";
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
});
