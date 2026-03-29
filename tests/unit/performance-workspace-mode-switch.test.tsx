import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PerformanceWorkspaceModeSwitch from "../../src/apps/performance/components/performance-workspace-mode-switch";

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
});
