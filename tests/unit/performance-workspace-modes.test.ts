import { describe, expect, it } from "vitest";

import {
  getPerformanceWorkspaceModeDefinition,
  getPerformanceWorkspaceModeLabel,
  isPerformanceWorkspaceMode,
  normalizePerformanceWorkspaceMode,
} from "../../src/apps/performance/performance-workspace-modes";

describe("performance workspace mode registry", () => {
  it("keeps supported workspace labels and frame copy in one governed source", () => {
    expect(getPerformanceWorkspaceModeLabel("summary")).toBe("Summary");
    expect(getPerformanceWorkspaceModeLabel("advisor")).toBe("Adviser brief");
    expect(getPerformanceWorkspaceModeDefinition("risk")).toMatchObject({
      workspaceTitle: "Risk",
      workspaceSubtitle:
        "Benchmark-aware concentration, drawdown, rolling, and attribution review.",
    });
    expect(getPerformanceWorkspaceModeDefinition("analysis").intro).toMatchObject({
      ariaLabel: "Performance analysis mode intro",
      title: "Attribution, contribution, and benchmark-relative diagnostics",
    });
  });

  it("accepts only governed performance workspace modes", () => {
    expect(isPerformanceWorkspaceMode("summary")).toBe(true);
    expect(isPerformanceWorkspaceMode("advisor")).toBe(true);
    expect(isPerformanceWorkspaceMode("foo")).toBe(false);
  });

  it("normalizes supported route aliases to the governed workspace mode", () => {
    expect(normalizePerformanceWorkspaceMode("advisor")).toBe("advisor");
    expect(normalizePerformanceWorkspaceMode("advisor-brief")).toBe("advisor");
    expect(normalizePerformanceWorkspaceMode("summary")).toBe("summary");
    expect(normalizePerformanceWorkspaceMode("unknown-mode")).toBeNull();
  });
});
