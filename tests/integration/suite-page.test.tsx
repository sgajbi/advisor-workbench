import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import SuitePage from "../../src/app/suite/page";

vi.mock("@/features/platform-capabilities/use-platform-capabilities", () => ({
  usePlatformCapabilities: vi.fn(() => ({
    loading: false,
    partialFailure: false,
    errors: [],
    normalized: {
      navigation: {
        command_center: true,
        portfolio_intake: true,
        analytics_studio: true,
        advisory_pipeline: true,
        scenario_builder: true,
        decision_console: true,
      },
      workflowFlags: {},
      inputModesBySource: {},
      inputModesUnion: [],
      moduleHealth: {
        lotus_core: "available",
        lotus_performance: "available",
        lotus_manage: "available",
      },
      policyVersionsBySource: {
        lotus_core: "lotus-core-default-v1",
        lotus_performance: "lotus-performance-default-v1",
        lotus_manage: "lotus-manage-default-v1",
      },
      lotusCorePolicyDiagnostics: {
        available: true,
        allowedSections: ["OVERVIEW", "HOLDINGS"],
        warnings: ["SECTIONS_FILTERED_BY_POLICY"],
        policyProvenance: {
          policyVersion: "lotus-core-default-v1",
          policySource: "tenant",
          matchedRuleId: "tenant.default.consumers.UI",
          strictMode: true,
        },
      },
    },
  })),
}));

describe("SuitePage", () => {
  it("renders role-based navigation journeys", () => {
    render(<SuitePage />);

    expect(screen.getByText("Client Advisor Journey")).toBeInTheDocument();
    expect(screen.getByText("Portfolio Manager Journey")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /1\. Portfolio Intake/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /1\. Decision Console/i })).toBeInTheDocument();
    expect(screen.getByText((text) => text.includes("lotus-core-default-v1"))).toBeInTheDocument();
    expect(screen.getByText((text) => text.includes("lotus-performance-default-v1"))).toBeInTheDocument();
    expect(screen.getByText((text) => text.includes("lotus-manage-default-v1"))).toBeInTheDocument();
    expect(screen.getByText((text) => text.includes("strict mode: on"))).toBeInTheDocument();
    expect(
      screen.getByText((text) => text.includes("tenant.default.consumers.UI"))
    ).toBeInTheDocument();
  });
});
