import { describe, expect, it } from "vitest";

import {
  buildCashflowExportFilename,
  buildCashflowMovementRows,
  buildCashflowResultLabel,
  buildCashflowSnapshot,
  buildCashflowScopeFacts,
  hasCashflowDegradation,
  hasProjectedCashMovements,
  resolveCashflowHorizonDays,
  resolveCashflowHorizonKey,
  selectCashflowPartialFailures,
  selectCashflowWarnings,
} from "../../src/apps/portfolio/portfolio-projected-cashflow-view-model";
import type { PortfolioProjectedCashflowResponse } from "../../src/apps/portfolio/types";

describe("portfolio projected cashflow view model", () => {
  it("maps the governed horizon choices without inventing unsupported presets", () => {
    expect(resolveCashflowHorizonKey(30)).toBe("30");
    expect(resolveCashflowHorizonKey(45)).toBe("10");
    expect(resolveCashflowHorizonDays("90")).toBe(90);
  });

  it("preserves the complete Gateway response with its source limitations", () => {
    const response = buildResponse();
    const snapshot = buildCashflowSnapshot(30, response)!;

    expect(snapshot.response).toBe(response);
    expect(snapshot.warnings).toEqual(["PORTFOLIO_CASHFLOW_DELAYED"]);
    expect(snapshot.partialFailures[0].error_code).toBe("PORTFOLIO_CASHFLOW_DELAYED");
    expect(hasCashflowDegradation(snapshot)).toBe(true);
    expect(buildCashflowScopeFacts(snapshot, "USD")).toContainEqual({
      label: "Projection basis",
      value: "Booked and projected events",
    });
  });

  it("labels and exports from returned data rather than the requested horizon", () => {
    const response = buildResponse();
    response.cashflow_outlook!.projection_days = 29;
    const snapshot = buildCashflowSnapshot(30, response)!;

    expect(buildCashflowResultLabel(snapshot)).toBe(
      "29-day projection returned for a 30-day request"
    );
    expect(buildCashflowExportFilename(snapshot, "PF_001")).toBe(
      "portfolio-projected-cash-movement-PF_001-2026-03-28-29d.csv"
    );
  });

  it("keeps only actual movement dates in the decision table", () => {
    const outlook = buildResponse().cashflow_outlook!;

    expect(buildCashflowMovementRows(outlook).map((point) => point.projection_date)).toEqual([
      "2026-03-30",
    ]);
  });

  it("treats a non-zero aggregate as movement when dated points are unavailable", () => {
    const outlook = buildResponse().cashflow_outlook!;
    outlook.upcoming_points = [];

    expect(hasProjectedCashMovements(outlook)).toBe(true);

    outlook.total_net_cashflow_base = 0;
    expect(hasProjectedCashMovements(outlook)).toBe(false);
  });

  it("selects only cashflow-owned degradation from a broader workspace response", () => {
    expect(selectCashflowWarnings(["REPORTING_DELAYED", "PORTFOLIO_CASHFLOW_DELAYED"])).toEqual([
      "PORTFOLIO_CASHFLOW_DELAYED",
    ]);
    expect(
      selectCashflowPartialFailures([
        {
          source_service: "lotus-report",
          error_code: "REPORTING_DELAYED",
          detail: "delayed",
        },
        {
          source_service: "lotus-core",
          error_code: "PORTFOLIO_CASHFLOW_DELAYED",
          detail: "delayed",
        },
      ])
    ).toHaveLength(1);
  });
});

function buildResponse(): PortfolioProjectedCashflowResponse {
  return {
    correlation_id: "corr-cashflow-001",
    contract_version: "v1",
    portfolio_id: "PF_001",
    as_of_date: "2026-03-28",
    cashflow_outlook: {
      as_of_date: "2026-03-28",
      range_end_date: "2026-04-27",
      total_net_cashflow_base: 500,
      projection_days: 30,
      include_projected: true,
      notes: "Projection includes booked and projected settlement events.",
      upcoming_points: [
        {
          projection_date: "2026-03-29",
          net_cashflow_base: 0,
          projected_cumulative_cashflow_base: 0,
        },
        {
          projection_date: "2026-03-30",
          net_cashflow_base: 500,
          projected_cumulative_cashflow_base: 500,
        },
      ],
    },
    warnings: ["PORTFOLIO_CASHFLOW_DELAYED"],
    partial_failures: [
      {
        source_service: "lotus-core",
        error_code: "PORTFOLIO_CASHFLOW_DELAYED",
        detail: "one input is delayed",
      },
    ],
  };
}
