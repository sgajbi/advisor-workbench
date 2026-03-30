import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PerformanceWorkspaceModeSwitch from "../../src/apps/performance/components/performance-workspace-mode-switch";
import { buildPerformanceCapabilities } from "../fixtures/performance-workspace-fixtures";

describe("PerformanceWorkspaceModeSwitch", () => {
  it("renders the three workspace modes and calls onChange with the selected mode", () => {
    const onChange = vi.fn();

    render(<PerformanceWorkspaceModeSwitch value="summary" onChange={onChange} />);

    expect(screen.getByRole("tab", { name: "Summary" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Analysis" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Evidence" })).toHaveAttribute("aria-selected", "false");

    fireEvent.click(screen.getByRole("tab", { name: "Analysis" }));
    fireEvent.click(screen.getByRole("tab", { name: "Evidence" }));

    expect(onChange).toHaveBeenNthCalledWith(1, "analysis");
    expect(onChange).toHaveBeenNthCalledWith(2, "evidence");
  });

  it("disables unavailable modes and shows readiness status when capabilities are provided", () => {
    const onChange = vi.fn();

    render(
      <PerformanceWorkspaceModeSwitch
        value="summary"
        onChange={onChange}
        capabilities={buildPerformanceCapabilities({
          returnPath: { state: "unavailable", reason: "No published return history." },
          attributionDetail: { state: "unavailable", reason: "No attribution detail." },
          contributionDetail: { state: "unavailable", reason: "No contribution detail." },
          evidence: { state: "unavailable", reason: "Evidence contract unavailable." },
        })}
      />
    );

    expect(screen.getByRole("tab", { name: "Analysis" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Evidence" })).toBeDisabled();
    expect(screen.getByRole("group", { name: "Performance mode readiness" })).toHaveTextContent(
      "Analysis unavailable"
    );
    expect(screen.getByRole("group", { name: "Performance mode readiness" })).toHaveTextContent(
      "Evidence unavailable"
    );

    fireEvent.click(screen.getByRole("tab", { name: "Analysis" }));
    fireEvent.click(screen.getByRole("tab", { name: "Evidence" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("surfaces aggregate fallback in analysis readiness when only aggregate contribution is available", () => {
    const onChange = vi.fn();

    render(
      <PerformanceWorkspaceModeSwitch
        value="summary"
        onChange={onChange}
        capabilities={buildPerformanceCapabilities({
          contributionDetail: {
            state: "partial",
            reason: "Contribution exists, but only aggregate rows are available.",
            coverageLevel: "aggregate",
            fallbackAvailable: true,
          },
        })}
      />
    );

    expect(screen.getByRole("group", { name: "Performance mode readiness" })).toHaveTextContent(
      "Analysis partial • aggregate fallback"
    );
    expect(screen.getByRole("tab", { name: "Analysis" })).not.toBeDisabled();
  });
});
