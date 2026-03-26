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
        pas: "lotus-core-default-v1",
        pa: "lotus-performance-default-v1",
        dpm: "lotus-manage-default-v1",
      },
      lotusCorePolicyDiagnostics: {
        available: true,
        allowedSections: ["OVERVIEW"],
        warnings: [],
        policyProvenance: {
          policyVersion: "lotus-core-default-v1",
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

    expect(screen.queryByRole("link", { name: "Home" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Portfolio" })).toHaveAttribute("href", "/portfolio");
    expect(screen.getByRole("link", { name: "Recommendations" })).toHaveAttribute(
      "href",
      "/recommendations"
    );

    const clientsDisabled = screen.getByText("Relationship Book");
    const analyticsDisabled = screen.getByText("Performance");
    const riskDisabled = screen.getByText("Suitability");
    const reportingDisabled = screen.getByText("Reporting");

    expect(clientsDisabled.tagName).toBe("SPAN");
    expect(clientsDisabled).toHaveAttribute("aria-disabled", "true");
    expect(analyticsDisabled.tagName).toBe("SPAN");
    expect(analyticsDisabled).toHaveAttribute("aria-disabled", "true");
    expect(riskDisabled.tagName).toBe("SPAN");
    expect(riskDisabled).toHaveAttribute("aria-disabled", "true");
    expect(reportingDisabled.tagName).toBe("SPAN");
    expect(reportingDisabled).toHaveAttribute("aria-disabled", "true");
  });
});
