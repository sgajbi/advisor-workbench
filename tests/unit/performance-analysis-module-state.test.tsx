import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceAnalysisModuleState from "../../src/apps/performance/components/performance-analysis-module-state";

describe("PerformanceAnalysisModuleState", () => {
  it("renders children when the capability is supported", () => {
    render(
      <PerformanceAnalysisModuleState
        capability={{ state: "supported" }}
        isDetailsPending={false}
        loadingText="Loading detail."
        partialTitle="Detail is partial"
        unavailableTitle="Detail unavailable"
        body="Detail is unavailable."
      >
        <div>Ready content</div>
      </PerformanceAnalysisModuleState>
    );

    expect(screen.getByText("Ready content")).toBeInTheDocument();
  });

  it("renders a shared loading panel when details are pending", () => {
    render(
      <PerformanceAnalysisModuleState
        capability={{ state: "unavailable", reason: "Not exposed." }}
        isDetailsPending
        loadingText="Loading detail."
        partialTitle="Detail is partial"
        unavailableTitle="Detail unavailable"
        body="Detail is unavailable."
      >
        <div>Ready content</div>
      </PerformanceAnalysisModuleState>
    );

    expect(screen.getByText("Loading detail.")).toBeInTheDocument();
    expect(
      document.querySelector(".performance-analysis-state-panel-loading .module-state-panel")
    ).toBeTruthy();
  });

  it("renders the shared unavailable panel when details are unavailable", () => {
    render(
      <PerformanceAnalysisModuleState
        capability={{ state: "unavailable", reason: "Not exposed." }}
        isDetailsPending={false}
        loadingText="Loading detail."
        partialTitle="Detail is partial"
        unavailableTitle="Detail unavailable"
        body="Detail is unavailable."
        hint="Needs source-backed detail."
      >
        <div>Ready content</div>
      </PerformanceAnalysisModuleState>
    );

    expect(screen.getByText("Detail unavailable")).toBeInTheDocument();
    expect(screen.getByText("Detail is unavailable.")).toBeInTheDocument();
    expect(screen.getByText("Needs source-backed detail.")).toBeInTheDocument();
    expect(
      document.querySelector(".performance-analysis-state-panel-unavailable .module-state-panel")
    ).toBeTruthy();
  });
});
