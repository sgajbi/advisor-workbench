import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RiskExecutiveOverview from "../../src/apps/performance/components/risk/risk-executive-overview";

describe("RiskExecutiveOverview", () => {
  it("keeps posture and what-matters reading in one compact executive briefing surface", () => {
    const { container } = render(
      <RiskExecutiveOverview
        overview={[
          {
            key: "risk_posture",
            label: "Risk posture",
            value: "Moderate",
            support: "Portfolio risk is controlled and broadly aligned with mandate expectations.",
            tone: "default",
          },
          {
            key: "drawdown_posture",
            label: "Drawdown posture",
            value: "Recovered",
            support: "The worst realized loss path has already recovered in the selected window.",
            tone: "success",
          },
          {
            key: "concentration_posture",
            label: "Concentration posture",
            value: "High",
            support: "Issuer concentration remains elevated versus the rest of the book.",
            tone: "warn",
          },
          {
            key: "evidence_posture",
            label: "Evidence posture",
            value: "Partial",
            support: "Benchmark-relative review is available, but one deeper diagnostic remains qualified.",
            tone: "warn",
          },
        ]}
        mattersNow={[
          {
            key: "total_risk",
            title: "Total risk posture",
            body: "Risk remains moderate and does not currently point to immediate portfolio action.",
          },
          {
            key: "drawdown",
            title: "Loss-path review",
            body: "Realized drawdown is contained and the book has already recovered.",
          },
          {
            key: "concentration",
            title: "Concentration review",
            body: "Issuer concentration still warrants follow-up before deeper rolling diagnostics.",
          },
        ]}
      />
    );

    const overview = screen.getByLabelText("Risk executive overview");
    expect(within(overview).getByRole("heading", { name: "Risk posture" })).toBeInTheDocument();
    expect(within(overview).getByText("What matters now")).toBeInTheDocument();
    expect(container.querySelector(".performance-risk-executive-band")).toBeTruthy();
    expect(container.querySelector(".performance-risk-matters")).toBeTruthy();
    expect(container.querySelectorAll(".performance-risk-matters-item")).toHaveLength(3);
    expect(container.querySelectorAll(".performance-risk-executive-secondary-card")).toHaveLength(3);
  });
});
