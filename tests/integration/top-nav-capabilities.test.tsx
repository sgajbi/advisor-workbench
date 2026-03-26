import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TopNav from "../../src/app/top-nav";

vi.mock("@/features/platform-capabilities/use-platform-capabilities", () => ({
  usePlatformCapabilities: vi.fn(() => ({
    loading: false,
    partialFailure: false,
    errors: [],
    normalized: {
      navigation: {
        command_center: true,
        portfolio_intake: true,
        analytics_studio: false,
        advisory_pipeline: true,
        scenario_builder: false,
        decision_console: true,
      },
      workflowFlags: {},
      inputModesBySource: {},
      inputModesUnion: [],
      moduleHealth: { pas: "available", pa: "unavailable", dpm: "available" },
      policyVersionsBySource: {
        pas: "pas-default-v1",
        pa: "pa-default-v1",
        dpm: "dpm-default-v1",
      },
      pasPolicyDiagnostics: {
        available: true,
        allowedSections: ["OVERVIEW"],
        warnings: [],
        policyProvenance: {
          policyVersion: "pas-default-v1",
          policySource: "default",
          matchedRuleId: "default",
          strictMode: false,
        },
      },
    },
  })),
}));

describe("TopNav", () => {
  it("disables routes based on normalized navigation capabilities", () => {
    render(<TopNav />);

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Foundation" })).toHaveAttribute("href", "/portfolios");
    expect(screen.getByRole("link", { name: "Proposal" })).toHaveAttribute("href", "/proposals");
    expect(screen.getByRole("link", { name: "Manage" })).toHaveAttribute("href", "/workbench");
    expect(screen.getByRole("link", { name: "Platform" })).toHaveAttribute("href", "/suite");

    const analyticsDisabled = screen.getByText("Performance");
    const riskDisabled = screen.getByText("Risk");
    const reportingDisabled = screen.getByText("Reporting");

    expect(analyticsDisabled.tagName).toBe("SPAN");
    expect(analyticsDisabled).toHaveAttribute("aria-disabled", "true");
    expect(riskDisabled.tagName).toBe("SPAN");
    expect(riskDisabled).toHaveAttribute("aria-disabled", "true");
    expect(reportingDisabled.tagName).toBe("SPAN");
    expect(reportingDisabled).toHaveAttribute("aria-disabled", "true");
  });
});
