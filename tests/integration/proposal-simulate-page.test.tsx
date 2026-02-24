import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ProposalSimulatePage from "../../src/app/proposals/simulate/page";

describe("ProposalSimulatePage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders selected portfolio baseline and prefills simulation form", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return {
          ok: true,
          json: async () => ({
            correlation_id: "corr-1",
            contract_version: "1.0.0",
            as_of_date: "2026-02-24",
            portfolio: {
              portfolio_id: "PORT_UI_1001",
              client_id: "CLIENT_1",
              base_currency: "USD",
              booking_center_code: "SG",
            },
            overview: {
              market_value_base: 1250000,
              cash_weight_pct: 8.42,
              position_count: 12,
            },
            performance_snapshot: {
              period: "YTD",
              return_pct: 4.12,
              benchmark_return_pct: 3.87,
            },
            rebalance_snapshot: {
              status: "READY",
              last_rebalance_run_id: "run_001",
              last_run_at_utc: "2026-02-24T00:00:00Z",
            },
            warnings: ["PA_SNAPSHOT_UNAVAILABLE"],
            partial_failures: [],
          }),
        } as Response;
      })
    );

    render(
      await ProposalSimulatePage({
        searchParams: Promise.resolve({ portfolioId: "PORT_UI_1001" }),
      })
    );

    expect(screen.getByRole("heading", { name: /Selected Portfolio Baseline/i })).toBeInTheDocument();
    expect(screen.getByText("$1,250,000")).toBeInTheDocument();
    expect(screen.getByText(/Warnings:/i)).toHaveTextContent("PA_SNAPSHOT_UNAVAILABLE");
    expect(screen.getByLabelText("Portfolio ID")).toHaveValue("PORT_UI_1001");
  });
});

