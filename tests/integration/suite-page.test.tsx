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
      moduleHealth: { pas: "available", pa: "available", dpm: "available" },
      policyVersionsBySource: {
        pas: "pas-default-v1",
        pa: "pa-default-v1",
        dpm: "dpm-default-v1",
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
    expect(screen.getByText((text) => text.includes("pas-default-v1"))).toBeInTheDocument();
    expect(screen.getByText((text) => text.includes("pa-default-v1"))).toBeInTheDocument();
    expect(screen.getByText((text) => text.includes("dpm-default-v1"))).toBeInTheDocument();
  });
});
