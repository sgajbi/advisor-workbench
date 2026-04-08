import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RiskExecutiveOverview from "../../src/apps/performance/components/risk/risk-executive-overview";

describe("RiskExecutiveOverview", () => {
  it("keeps only posture labels and states in the executive overview strip", () => {
    const { container } = render(
      <RiskExecutiveOverview
        overview={[
          {
            key: "risk_posture",
            label: "Risk posture",
            value: "Moderate",
            tone: "default",
          },
          {
            key: "drawdown_posture",
            label: "Drawdown posture",
            value: "Recovered",
            tone: "success",
          },
          {
            key: "concentration_posture",
            label: "Concentration posture",
            value: "High",
            tone: "warn",
          },
          {
            key: "evidence_posture",
            label: "Evidence posture",
            value: "Partial",
            tone: "warn",
          },
        ]}
      />
    );

    const overview = screen.getByLabelText("Risk executive overview");
    expect(within(overview).getByText("Risk posture")).toBeInTheDocument();
    expect(within(overview).getAllByText("Moderate").length).toBeGreaterThan(0);
    expect(container.querySelector(".performance-risk-executive-band")).toBeTruthy();
    expect(container.querySelectorAll(".performance-risk-executive-secondary-card")).toHaveLength(3);
    expect(within(overview).queryByText("What matters now")).not.toBeInTheDocument();
  });
});
