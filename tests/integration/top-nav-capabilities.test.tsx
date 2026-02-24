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

    expect(screen.getByRole("link", { name: "Command Center" })).toHaveAttribute("href", "/suite");
    expect(screen.getByRole("link", { name: "Portfolio Intake" })).toHaveAttribute("href", "/pas/intake");
    expect(screen.getByRole("link", { name: "Advisory Pipeline" })).toHaveAttribute("href", "/proposals");

    const analyticsDisabled = screen.getByText("Analytics Studio");
    const scenarioDisabled = screen.getByText("Scenario Builder");

    expect(analyticsDisabled.tagName).toBe("SPAN");
    expect(analyticsDisabled).toHaveAttribute("aria-disabled", "true");
    expect(scenarioDisabled.tagName).toBe("SPAN");
    expect(scenarioDisabled).toHaveAttribute("aria-disabled", "true");
  });
});
