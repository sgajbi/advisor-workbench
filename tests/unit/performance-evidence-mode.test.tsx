import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceEvidenceMode from "../../src/apps/performance/components/performance-evidence-mode";
import { partial, supported, unavailable } from "../../src/shell/workspace-capabilities";

describe("PerformanceEvidenceMode", () => {
  it("renders an honest unavailable state when evidence is not exposed by the contract", () => {
    render(
      <PerformanceEvidenceMode
        capability={unavailable(
          "Evidence and lineage surfaces are not exposed by the current gateway contract."
        )}
      />
    );

    expect(screen.getByText("Evidence unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Execution status, lineage artifacts, and calculation evidence are not exposed by the current backend contract."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("Evidence and lineage surfaces are not exposed by the current gateway contract.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Evidence and Calculation Context")).not.toBeInTheDocument();
  });

  it("renders a partial capability state when the contract is incomplete", () => {
    render(
      <PerformanceEvidenceMode
        capability={partial("Lineage artifacts are available, but execution evidence is incomplete.")}
      />
    );

    expect(screen.getByText("Evidence partially available")).toBeInTheDocument();
    expect(
      screen.getByText("Lineage artifacts are available, but execution evidence is incomplete.")
    ).toBeInTheDocument();
  });

  it("renders the evidence workspace when the backend contract supports it", () => {
    render(
      <PerformanceEvidenceMode
        capability={supported("Execution and lineage evidence can be reviewed for this portfolio.")}
      />
    );

    expect(screen.getByText("Evidence and Calculation Context")).toBeInTheDocument();
    expect(
      screen.getByText(/execution status, lineage artifacts, and calculation evidence/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText("Execution and lineage evidence can be reviewed for this portfolio.")
    ).toBeInTheDocument();
  });
});
