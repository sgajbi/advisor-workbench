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
        riskWorkspaceHref="/performance?portfolioId=PF_1001&mode=risk"
      />
    );

    expect(screen.getByRole("heading", { name: /Decision Readiness/i })).toBeInTheDocument();
    expect(screen.getAllByText("READY").length).toBeGreaterThanOrEqual(5);
    expect(screen.getByRole("link", { name: "Open Risk" })).toHaveAttribute(
      "href",
      "/performance?portfolioId=PF_1001&mode=risk"
    );
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
        riskWorkspaceHref="/performance?portfolioId=PF_2001&mode=risk"
      />
    );

    expect(screen.getAllByText("PENDING").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("ATTENTION")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Risk" })).toHaveAttribute(
      "href",
      "/performance?portfolioId=PF_2001&mode=risk"
    );
  });
});
