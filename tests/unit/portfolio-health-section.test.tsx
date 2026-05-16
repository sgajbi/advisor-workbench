import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioHealthSection from "../../src/apps/portfolio/components/portfolio-health-section";
import {
  buildPortfolioWorkspace,
  buildPortfolioWorkspaceContext,
} from "../fixtures/portfolio-workspace-component-fixtures";

describe("PortfolioHealthSection", () => {
  it("renders mandate, readiness, and warning posture from the source-backed workspace", () => {
    render(
      <PortfolioHealthSection
        workspace={buildPortfolioWorkspace({
          profile: {
            status: "ACTIVE",
            portfolio_type: "DISCRETIONARY",
            risk_exposure: "BALANCED",
            investment_time_horizon: "LONG_TERM",
            objective: "Long-term wealth growth with controlled income and liquidity.",
            is_leverage_allowed: false,
            advisor_id: "RM_SG_001",
            open_date: "2025-01-06",
          },
          readiness: {
            has_positions: false,
            reporting: {
              status: "PENDING",
              generated_at_utc: "2026-05-12T00:00:00Z",
              row_count: 11,
            },
          },
          operations: {
            publish_allowed: false,
          },
          partial_failures: [
            {
              source_service: "core",
              error_code: "valuation_pending",
              detail: "Valuation is pending for one position.",
            },
          ],
          warnings: ["PORTFOLIO_CASH_BALANCES_UNAVAILABLE"],
        })}
        context={buildPortfolioWorkspaceContext({ selectedAsOfDate: "2026-05-16" })}
      />
    );

    expect(screen.getByRole("heading", { name: "Portfolio Health Snapshot" })).toBeInTheDocument();
    expect(screen.getByText("Readiness and coverage as of 16 May 2026.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mandate Overview" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Health and Coverage" })).toBeInTheDocument();
    expect(screen.getByText("Long-term wealth growth with controlled income and liquidity.")).toBeInTheDocument();
    expect(screen.getByText("Holdings Coverage")).toBeInTheDocument();
    expect(screen.getAllByText("Pending")).toHaveLength(2);
    expect(screen.getByText("Publishing Allowed")).toBeInTheDocument();
    expect(screen.getAllByText("No")).toHaveLength(2);
    expect(screen.getByText("Cash balances temporarily unavailable")).toBeInTheDocument();
  });
});
