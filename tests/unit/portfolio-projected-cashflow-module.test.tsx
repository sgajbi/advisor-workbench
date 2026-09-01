import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PortfolioProjectedCashflowModule from "../../src/apps/portfolio/components/portfolio-projected-cashflow-module";
import type {
  PortfolioCashflowOutlook,
  PortfolioProjectedCashflowResponse,
} from "../../src/apps/portfolio/types";

const getPortfolioProjectedCashflow = vi.fn();

vi.mock("../../src/apps/portfolio/api", () => ({
  getPortfolioProjectedCashflow: (...args: unknown[]) => getPortfolioProjectedCashflow(...args),
}));

describe("PortfolioProjectedCashflowModule", () => {
  beforeEach(() => {
    getPortfolioProjectedCashflow.mockImplementation(
      async () => await new Promise<PortfolioProjectedCashflowResponse | null>(() => {})
    );
  });

  afterEach(() => {
    getPortfolioProjectedCashflow.mockReset();
  });

  it("selects an explicit horizon and binds the rendered result to the returned projection", async () => {
    getPortfolioProjectedCashflow
      .mockResolvedValueOnce(buildResponse(buildOutlook()))
      .mockResolvedValueOnce(
        buildResponse(buildOutlook({ projectionDays: 30, totalNetMovement: 1250 }))
      );

    renderModule({ initialCashflowOutlook: buildOutlook() });

    expect(screen.getByRole("radio", { name: "10D" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("10-day projection · USD")).toBeInTheDocument();
    await waitFor(() => {
      expect(getPortfolioProjectedCashflow).toHaveBeenCalledWith("MANUAL_PB_USD_001", {
        asOfDate: "2026-03-28",
        horizonDays: 10,
        includeProjected: true,
      });
    });

    fireEvent.click(screen.getByRole("radio", { name: "30D" }));

    expect(screen.getByText("Loading 30-day projection")).toBeInTheDocument();
    await waitFor(() => {
      expect(getPortfolioProjectedCashflow).toHaveBeenCalledWith("MANUAL_PB_USD_001", {
        asOfDate: "2026-03-28",
        horizonDays: 30,
        includeProjected: true,
      });
    });
    expect(await screen.findByText("30-day projection · USD")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "30D" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Projection scope")).toHaveTextContent("Projection as of");
  });

  it("clears a superseded seed refresh when returning to a cached horizon", async () => {
    const pendingSeedRefresh = new Promise<PortfolioProjectedCashflowResponse | null>(() => {});
    getPortfolioProjectedCashflow
      .mockReturnValueOnce(pendingSeedRefresh)
      .mockResolvedValueOnce(
        buildResponse(buildOutlook({ projectionDays: 30, totalNetMovement: 1250 }))
      )
      .mockReturnValueOnce(pendingSeedRefresh);

    renderModule({ initialCashflowOutlook: buildOutlook() });

    fireEvent.click(screen.getByRole("radio", { name: "30D" }));
    expect(await screen.findByText("30-day projection · USD")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "10D" }));
    expect(await screen.findByText("Refreshing projection evidence")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "30D" }));

    await waitFor(() => {
      expect(screen.queryByText("Refreshing projection evidence")).not.toBeInTheDocument();
    });
    expect(screen.getByText("30-day projection · USD")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeEnabled();
  });

  it("never relabels prior-horizon data after a failed refresh", async () => {
    getPortfolioProjectedCashflow.mockResolvedValue(null);

    renderModule({
      initialCashflowOutlook: buildOutlook({ totalNetMovement: 500 }),
    });

    expect(screen.getByLabelText("Projected cash movement summary")).toHaveTextContent("500 USD");
    fireEvent.click(screen.getByRole("radio", { name: "30D" }));

    expect(await screen.findByText("30-day projection unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Expected cash movements could not be retrieved for this horizon. No prior-horizon figures are being shown as current."
      )
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Projected cash movement summary")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
  });

  it("preserves degraded Gateway evidence with a returned projection", async () => {
    getPortfolioProjectedCashflow.mockResolvedValue(
      buildResponse(buildOutlook({ projectionDays: 10 }), {
        warnings: ["PORTFOLIO_CASHFLOW_DELAYED"],
        partialFailures: [
          {
            source_service: "lotus-core",
            error_code: "PORTFOLIO_CASHFLOW_DELAYED",
            detail: "one projection input is delayed",
          },
        ],
      })
    );

    renderModule({ initialCashflowOutlook: null });

    expect(await screen.findByText("Projection available with limitations")).toBeInTheDocument();
    fireEvent.mouseOver(screen.getByRole("button", { name: "Support reference" }));
    expect(await screen.findByText("corr-cashflow-001 · Contract v1")).toBeInTheDocument();
    expect(screen.getByLabelText("Projected cash movement summary")).toBeInTheDocument();
  });

  it("shows an unavailable envelope without rendering a fabricated empty projection", async () => {
    getPortfolioProjectedCashflow.mockResolvedValue(
      buildResponse(null, {
        warnings: ["PORTFOLIO_CASHFLOW_UNAVAILABLE"],
        partialFailures: [
          {
            source_service: "lotus-core",
            error_code: "PORTFOLIO_CASHFLOW_UNAVAILABLE",
            detail: "cashflow unavailable",
          },
        ],
      })
    );

    renderModule({ initialCashflowOutlook: null });

    expect(await screen.findByText("10-day projection unavailable")).toBeInTheDocument();
    fireEvent.mouseOver(screen.getByRole("button", { name: "Support reference" }));
    expect(await screen.findByText("corr-cashflow-001 · Contract v1")).toBeInTheDocument();
    expect(screen.queryByText("No projected cash movement")).not.toBeInTheDocument();
  });

  it("hydrates support evidence for the server-seeded horizon", async () => {
    getPortfolioProjectedCashflow
      .mockResolvedValueOnce(
        buildResponse(null, {
          warnings: ["PORTFOLIO_CASHFLOW_UNAVAILABLE"],
          partialFailures: [
            {
              source_service: "lotus-core",
              error_code: "PORTFOLIO_CASHFLOW_UNAVAILABLE",
              detail: "endpoint projection is unavailable",
            },
          ],
        })
      )
      .mockResolvedValueOnce(buildResponse(buildOutlook()));

    renderModule({ initialCashflowOutlook: buildOutlook() });

    expect(screen.getByLabelText("Projected cash movement summary")).toBeInTheDocument();
    expect(await screen.findByText("Projection evidence refresh unavailable")).toBeInTheDocument();
    fireEvent.mouseOver(screen.getByRole("button", { name: "Support reference" }));
    expect(await screen.findByText("corr-cashflow-001 · Contract v1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Retry evidence refresh" }));

    await waitFor(() => {
      expect(screen.queryByText("Projection evidence refresh unavailable")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Export" })).toBeEnabled();
    expect(getPortfolioProjectedCashflow).toHaveBeenLastCalledWith("MANUAL_PB_USD_001", {
      asOfDate: "2026-03-28",
      horizonDays: 10,
      includeProjected: true,
    });
    expect(getPortfolioProjectedCashflow).toHaveBeenCalledWith("MANUAL_PB_USD_001", {
      asOfDate: "2026-03-28",
      horizonDays: 10,
      includeProjected: true,
    });
  });

  it("marks seeded figures unconfirmed and retries when envelope hydration fails", async () => {
    getPortfolioProjectedCashflow
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(buildResponse(buildOutlook()));

    renderModule({ initialCashflowOutlook: buildOutlook() });

    expect(screen.getByLabelText("Projected cash movement summary")).toBeInTheDocument();
    expect(await screen.findByText("Projection evidence refresh unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Refreshing projection evidence")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Retry evidence refresh" }));

    await waitFor(() => {
      expect(screen.queryByText("Projection evidence refresh unavailable")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Export" })).toBeEnabled();
    expect(getPortfolioProjectedCashflow).toHaveBeenLastCalledWith("MANUAL_PB_USD_001", {
      asOfDate: "2026-03-28",
      horizonDays: 10,
      includeProjected: true,
    });
  });

  it("forces a fresh request when retrying an unavailable envelope", async () => {
    getPortfolioProjectedCashflow
      .mockResolvedValueOnce(
        buildResponse(null, {
          warnings: ["PORTFOLIO_CASHFLOW_UNAVAILABLE"],
        })
      )
      .mockResolvedValueOnce(buildResponse(buildOutlook()));

    renderModule({ initialCashflowOutlook: null });

    expect(await screen.findByText("10-day projection unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry projection" }));

    expect(await screen.findByLabelText("Projected cash movement summary")).toBeInTheDocument();
    expect(getPortfolioProjectedCashflow).toHaveBeenLastCalledWith("MANUAL_PB_USD_001", {
      asOfDate: "2026-03-28",
      horizonDays: 10,
      includeProjected: true,
    });
  });

  it("clears failure posture while an unavailable projection retry is pending", async () => {
    getPortfolioProjectedCashflow
      .mockResolvedValueOnce(
        buildResponse(null, {
          warnings: ["PORTFOLIO_CASHFLOW_UNAVAILABLE"],
        })
      )
      .mockReturnValueOnce(
        new Promise<PortfolioProjectedCashflowResponse | null>(() => {})
      );

    renderModule({ initialCashflowOutlook: null });

    expect(await screen.findByText("10-day projection unavailable")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry projection" }));

    expect(await screen.findByText("Loading 10-day projection")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry projection" })).not.toBeInTheDocument();
    expect(getPortfolioProjectedCashflow).toHaveBeenLastCalledWith("MANUAL_PB_USD_001", {
      asOfDate: "2026-03-28",
      horizonDays: 10,
      includeProjected: true,
    });
  });

  it("treats a source-backed flat horizon as no movement rather than partial liquidity", () => {
    renderModule({
      initialCashflowOutlook: buildOutlook({
        totalNetMovement: 0,
        pointMovements: [0, 0],
      }),
    });

    expect(screen.getByText("No projected cash movement")).toBeInTheDocument();
    expect(
      screen.getByText("The source returned no dated projected net movement for this horizon.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/liquidity/i)).not.toBeInTheDocument();
  });

  it("keeps an aggregate movement visible when no dated schedule is returned", () => {
    renderModule({
      initialCashflowOutlook: buildOutlook({
        totalNetMovement: -750,
        pointMovements: [],
      }),
    });

    expect(screen.getByLabelText("Projected cash movement summary")).toHaveTextContent("-750 USD");
    expect(screen.getAllByText("Dated detail unavailable")).toHaveLength(3);
    expect(screen.queryByText("No negative movement")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Dated chart unavailable; the source returned aggregate net movement only."
      )
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Cash movement chart key")).not.toBeInTheDocument();
    expect(screen.getByText("Dated movement schedule unavailable")).toBeInTheDocument();
    expect(screen.queryByText("No projected cash movement")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
  });

  it("renders only movement dates in the table while disclosing full export coverage", () => {
    renderModule({
      initialCashflowOutlook: buildOutlook({
        pointMovements: [0, 500, 0, -250],
      }),
    });

    expect(
      screen.getByRole("table", { name: "Projected cash movement schedule" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Showing 2 movement dates from 4 returned projection points. Export includes every returned point."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("Positive Net Movement").closest("div"),
    ).toHaveTextContent("500 USD");
    expect(
      screen.getByText("Negative Net Movement").closest("div"),
    ).toHaveTextContent("-250 USD");
    expect(
      screen.getByText("Largest Negative Movement").closest("div"),
    ).toHaveTextContent("-250 USD");
    expect(
      screen.queryByText("Horizon", { exact: true }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Cash movement chart key")).toHaveTextContent(
      "Bars: dated net movementLine: cumulative movement",
    );
    expect(
      screen.getByRole("region", {
        name: "Projected cash movement schedule, horizontally scrollable",
      }),
    ).toHaveAttribute("tabindex", "0");
    expect(
      screen.getByText(
        "Swipe, or focus the schedule and use the arrow keys, to compare every column.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });
});

function renderModule({
  initialCashflowOutlook,
}: {
  initialCashflowOutlook: PortfolioCashflowOutlook | null;
}) {
  return render(
    <PortfolioProjectedCashflowModule
      portfolioId="MANUAL_PB_USD_001"
      baseCurrency="USD"
      asOfDate="2026-03-28"
      defaultExpanded
      initialCashflowOutlook={initialCashflowOutlook}
      initialWarnings={[]}
      initialPartialFailures={[]}
    />
  );
}

function buildResponse(
  cashflowOutlook: PortfolioCashflowOutlook | null,
  options: {
    warnings?: string[];
    partialFailures?: PortfolioProjectedCashflowResponse["partial_failures"];
  } = {}
): PortfolioProjectedCashflowResponse {
  return {
    correlation_id: "corr-cashflow-001",
    contract_version: "v1",
    portfolio_id: "MANUAL_PB_USD_001",
    as_of_date: cashflowOutlook?.as_of_date ?? "2026-03-28",
    cashflow_outlook: cashflowOutlook,
    warnings: options.warnings ?? [],
    partial_failures: options.partialFailures ?? [],
  };
}

function buildOutlook({
  projectionDays = 10,
  totalNetMovement = 250,
  pointMovements = [250],
}: {
  projectionDays?: number;
  totalNetMovement?: number;
  pointMovements?: number[];
} = {}): PortfolioCashflowOutlook {
  let cumulative = 0;
  return {
    as_of_date: "2026-03-28",
    range_end_date: "2026-04-07",
    total_net_cashflow_base: totalNetMovement,
    projection_days: projectionDays,
    include_projected: true,
    notes: "Projection includes booked and projected settlement events.",
    upcoming_points: pointMovements.map((movement, index) => {
      cumulative += movement;
      return {
        projection_date: new Date(Date.UTC(2026, 2, 29 + index)).toISOString().slice(0, 10),
        net_cashflow_base: movement,
        projected_cumulative_cashflow_base: cumulative,
      };
    }),
  };
}
