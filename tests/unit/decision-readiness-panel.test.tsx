import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DecisionReadinessPanel from "../../src/features/workbench/components/decision-readiness-panel";

describe("DecisionReadinessPanel", () => {
  it("shows ready business evidence when decision inputs are available", () => {
    render(
      <DecisionReadinessPanel
        hasValuationData
        hasAnalytics
        hasReporting
        hasActiveSandbox
        warningCount={0}
        failureCount={0}
        riskWorkspaceHref="/performance?portfolioId=PF_1001&mode=risk"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Decision readiness" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Ready")).toHaveLength(5);
    expect(screen.getByText("Valuation evidence")).toBeInTheDocument();
    expect(screen.getByText("Scenario analysis")).toBeInTheDocument();
    expect(screen.queryByText(/backend|sandbox/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review risk" })).toHaveAttribute(
      "href",
      "/performance?portfolioId=PF_1001&mode=risk",
    );
  });

  it("uses one explicit review state when decision inputs are missing", () => {
    render(
      <DecisionReadinessPanel
        hasValuationData={false}
        hasAnalytics={false}
        hasReporting={false}
        hasActiveSandbox={false}
        warningCount={2}
        failureCount={1}
        riskWorkspaceHref="/performance?portfolioId=PF_2001&mode=risk"
      />,
    );

    expect(screen.getAllByText("Review required")).toHaveLength(5);
    expect(screen.queryByText(/pending|attention/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review risk" })).toHaveAttribute(
      "href",
      "/performance?portfolioId=PF_2001&mode=risk",
    );
  });
});
