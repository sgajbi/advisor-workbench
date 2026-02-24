import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DecisionReadinessPanel from "../../src/features/workbench/components/decision-readiness-panel";

describe("DecisionReadinessPanel", () => {
  it("shows ready states when backend dependencies are available", () => {
    render(
      <DecisionReadinessPanel
        hasValuationData
        hasAnalytics
        hasReporting
        hasActiveSandbox
        warningCount={0}
        failureCount={0}
        hhiProposed={0.12}
      />
    );

    expect(screen.getByRole("heading", { name: /Decision Readiness/i })).toBeInTheDocument();
    expect(screen.getAllByText("READY").length).toBeGreaterThanOrEqual(5);
    expect(screen.getByText("LOW")).toBeInTheDocument();
  });

  it("shows attention states when dependencies are missing", () => {
    render(
      <DecisionReadinessPanel
        hasValuationData={false}
        hasAnalytics={false}
        hasReporting={false}
        hasActiveSandbox={false}
        warningCount={2}
        failureCount={1}
        hhiProposed={0.3}
      />
    );

    expect(screen.getAllByText("PENDING").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("ATTENTION")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });
});
