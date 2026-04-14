import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceEvidenceMode from "../../src/apps/performance/components/performance-evidence-mode";
import {
  buildPartialEvidencePerformanceScenario,
  buildSupportedEvidencePerformanceScenario,
  buildUnavailableEvidencePerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

describe("PerformanceEvidenceMode", () => {
  it("renders an honest unavailable state when evidence is not exposed by the contract", () => {
    const scenario = buildUnavailableEvidencePerformanceScenario();

    render(
      <PerformanceEvidenceMode capability={scenario.capabilities.evidence} />
    );

    expect(document.querySelector("#performance-evidence.workbench-data-grid-frame")).toBeTruthy();
    expect(document.querySelector(".performance-evidence-module")).toBeTruthy();
    expect(screen.getByText("Evidence unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Execution status, lineage artifacts, and calculation evidence are not exposed by the current backend contract."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("Evidence and lineage surfaces are not exposed by the current gateway contract.")
    ).toBeInTheDocument();
    expect(
      document.querySelector(".performance-evidence-state-panel .portfolio-empty-state")
    ).toBeTruthy();
    expect(screen.getByText("Evidence and Calculation Context")).toBeInTheDocument();
  });

  it("renders a partial capability state when the contract is incomplete", () => {
    const scenario = buildPartialEvidencePerformanceScenario();

    render(<PerformanceEvidenceMode capability={scenario.capabilities.evidence} />);

    expect(document.querySelector("#performance-evidence.workbench-data-grid-frame")).toBeTruthy();
    expect(screen.getByText("Evidence partially available")).toBeInTheDocument();
    expect(
      screen.getByText("Lineage artifacts are available, but execution evidence is incomplete.")
    ).toBeInTheDocument();
    expect(
      document.querySelector(".performance-evidence-state-panel .module-state-panel")
    ).toBeTruthy();
  });

  it("renders the evidence workspace when the backend contract supports it", () => {
    const scenario = buildSupportedEvidencePerformanceScenario();

    render(<PerformanceEvidenceMode capability={scenario.capabilities.evidence} />);

    expect(document.querySelector("#performance-evidence.workbench-data-grid-frame")).toBeTruthy();
    expect(document.querySelector(".performance-evidence-status-strip")).toBeTruthy();
    expect(screen.getByText("Evidence and Calculation Context")).toBeInTheDocument();
    expect(screen.getByLabelText("Evidence support status")).toBeInTheDocument();
    expect(screen.getAllByText("Exposed")).toHaveLength(3);
    expect(screen.getByText("Execution status")).toBeInTheDocument();
    expect(screen.getByText("Lineage artifacts")).toBeInTheDocument();
    expect(screen.getByText("Calculation evidence")).toBeInTheDocument();
    expect(
      screen.getByText("Execution and lineage evidence can be reviewed for this portfolio.")
    ).toBeInTheDocument();
  });

  it.each([
    {
      name: "unavailable evidence",
      scenario: buildUnavailableEvidencePerformanceScenario(),
      expectedHeading: "Evidence unavailable",
      expectedReason: "Evidence and lineage surfaces are not exposed by the current gateway contract.",
      supportsWorkspace: true,
    },
    {
      name: "partial evidence",
      scenario: buildPartialEvidencePerformanceScenario(),
      expectedHeading: "Evidence partially available",
      expectedReason: "Lineage artifacts are available, but execution evidence is incomplete.",
      supportsWorkspace: true,
    },
    {
      name: "supported evidence",
      scenario: buildSupportedEvidencePerformanceScenario(),
      expectedHeading: "Evidence and Calculation Context",
      expectedReason: "Execution and lineage evidence can be reviewed for this portfolio.",
      supportsWorkspace: true,
    },
  ])("renders a contract-backed evidence state for $name", ({ scenario, expectedHeading, expectedReason, supportsWorkspace }) => {
    render(<PerformanceEvidenceMode capability={scenario.capabilities.evidence} />);

    expect(screen.getByText(expectedHeading)).toBeInTheDocument();
    expect(screen.getByText(expectedReason)).toBeInTheDocument();

    if (supportsWorkspace) {
      expect(document.querySelector("#performance-evidence.workbench-data-grid-frame")).toBeTruthy();
    } else {
      expect(screen.queryByText("Evidence and Calculation Context")).not.toBeInTheDocument();
    }
  });
});
