import { describe, expect, it } from "vitest";

import {
  buildPortfolioRecordEvidenceRailViewModel,
  buildReportingSourcePosture,
} from "../../src/apps/portfolio/portfolio-record-evidence-view-model";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";

describe("portfolio record evidence view model", () => {
  it("builds position evidence without requiring component rendering", () => {
    const viewModel = buildPortfolioRecordEvidenceRailViewModel({
      screen: "positions",
      workspace: buildPortfolioWorkspace({
        positions: [
          {
            security_id: "EQ_1",
            instrument_name: "Apple Inc.",
            asset_class: "EQUITY",
            quantity: 10,
            market_price: 210,
            market_value_base: 2100,
            weight_pct: 2.1,
            currency: "USD",
          },
          {
            security_id: "BOND_1",
            instrument_name: "Siemens Bond",
            asset_class: "FIXED_INCOME",
            quantity: 10,
            market_price: null,
            market_value_base: null,
            weight_pct: null,
            currency: "EUR",
            reprocessing_status: "STALE_PRICE",
          },
        ],
        operations: {
          stale_reprocessing_keys: 1,
        },
      }),
    });

    expect(viewModel.status).toEqual({ label: "Partial", tone: "warn" });
    expect(viewModel.facts).not.toContainEqual({
      label: "Portfolio",
      value: "PB_SG_GLOBAL_BAL_001",
    });
    expect(viewModel.facts).toContainEqual({ label: "Currency", value: "USD" });
    expect(viewModel.facts).toContainEqual({ label: "Review Area", value: "Positions" });
    expect(viewModel.sourcePostureItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Pricing source",
          detail: "1 position missing price or valuation",
          status: "Partial",
          tone: "warn",
        }),
        expect.objectContaining({
          label: "Position ledger",
          detail: "2 positions available for review",
        }),
        expect.objectContaining({
          label: "Position status",
          detail:
            "1 position requires review; 1 position status not reported; 1 source key stale",
          status: "Review required",
          tone: "warn",
        }),
      ])
    );
    expect(viewModel.adjacentWorkflows.map((workflow) => workflow.label)).toEqual([
      "Portfolio Review",
      "Allocation",
      "Transactions",
      "Income & Activity",
      "Projected cash flow",
      "Mandate Operations",
    ]);
    expect(viewModel.adjacentWorkflows.map((workflow) => workflow.label)).not.toContain(
      "Positions",
    );
  });

  it("keeps missing position status explicit in the detailed and overall posture", () => {
    const viewModel = buildPortfolioRecordEvidenceRailViewModel({
      screen: "positions",
      workspace: buildPortfolioWorkspace({
        positions: [
          {
            security_id: "EQ_1",
            instrument_name: "Apple Inc.",
            asset_class: "EQUITY",
            quantity: 10,
            market_price: 210,
            market_value_base: 2100,
            weight_pct: 2.1,
            currency: "USD",
            reprocessing_status: null,
          },
        ],
      }),
    });

    expect(viewModel.status).toEqual({ label: "Partial", tone: "warn" });
    expect(viewModel.sourcePostureItems).toContainEqual(
      expect.objectContaining({
        label: "Position status",
        detail: "1 position status not reported",
        status: "Not reported",
        tone: "warn",
      }),
    );
  });

  it("shows an all-current posture only for explicitly current positions", () => {
    const viewModel = buildPortfolioRecordEvidenceRailViewModel({
      screen: "positions",
      workspace: buildPortfolioWorkspace({
        positions: [
          {
            security_id: "EQ_1",
            instrument_name: "Apple Inc.",
            asset_class: "EQUITY",
            quantity: 10,
            market_price: 210,
            market_value_base: 2100,
            weight_pct: 2.1,
            currency: "USD",
            reprocessing_status: "CURRENT",
          },
        ],
      }),
    });

    expect(viewModel.status).toEqual({ label: "Ready", tone: "success" });
    expect(viewModel.sourcePostureItems).toContainEqual(
      expect.objectContaining({
        label: "Position status",
        detail: "1 position status current",
        status: "Current",
        tone: "success",
      }),
    );
  });

  it("promotes warning source evidence into the overall record posture", () => {
    const workspace = buildPortfolioWorkspace({});
    workspace.cashflow_outlook = {
      ...workspace.cashflow_outlook!,
      total_net_cashflow_base: 750,
      upcoming_points: [],
    };

    expect(
      buildPortfolioRecordEvidenceRailViewModel({ screen: "cashflow", workspace }).status,
    ).toEqual({ label: "Partial", tone: "warn" });
  });

  it("builds income and activity evidence with front-office copy", () => {
    const viewModel = buildPortfolioRecordEvidenceRailViewModel({
      screen: "income",
      workspace: buildPortfolioWorkspace({
        income_summary: null,
        activity_summary: null,
        partial_failures: [
          {
            source_service: "portfolio",
            error_code: "income_unavailable",
            detail: "income unavailable",
          },
        ],
      }),
    });

    expect(viewModel.status).toEqual({ label: "Partial", tone: "warn" });
    expect(viewModel.sourcePostureItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Income source",
          source: "Portfolio records",
          detail: "No classified income returned for the selected reporting window",
          status: "Unavailable",
        }),
        expect.objectContaining({
          label: "Activity buckets",
          source: "Activity classification",
          detail: "No activity buckets returned for the selected reporting window",
          status: "Unavailable",
        }),
      ])
    );
  });

  it("keeps aggregate-only projected movement distinct from dated flow counts", () => {
    const workspace = buildPortfolioWorkspace({});
    workspace.cashflow_outlook = {
      ...workspace.cashflow_outlook!,
      total_net_cashflow_base: -750,
      upcoming_points: [],
    };

    const viewModel = buildPortfolioRecordEvidenceRailViewModel({
      screen: "cashflow",
      workspace,
    });

    expect(viewModel.sourcePostureItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Projection Coverage",
          detail: expect.stringContaining("dated projection points unavailable"),
          status: "Partial",
          tone: "warn",
        }),
        expect.objectContaining({
          label: "Projection Basis",
          detail: "Net projected movement of -750 USD; dated positive and negative movement counts unavailable",
          status: "Aggregate only",
          tone: "warn",
        }),
      ])
    );
  });

  it("binds Cashflow evidence to the active projection instead of the server-seeded horizon", () => {
    const workspace = buildPortfolioWorkspace({});
    const activeOutlook = {
      ...workspace.cashflow_outlook!,
      projection_days: 30,
      range_end_date: "2026-06-11",
      upcoming_points: [
        {
          projection_date: "2026-05-13",
          net_cashflow_base: 125_000,
          projected_cumulative_cashflow_base: 125_000,
        },
        {
          projection_date: "2026-05-18",
          net_cashflow_base: -80_000,
          projected_cumulative_cashflow_base: 45_000,
        },
        {
          projection_date: "2026-06-04",
          net_cashflow_base: 55_000,
          projected_cumulative_cashflow_base: 100_000,
        },
      ],
    };

    const viewModel = buildPortfolioRecordEvidenceRailViewModel({
      screen: "cashflow",
      workspace,
      cashflowProjection: {
        selectedHorizonDays: 30,
        state: "ready",
        snapshot: {
          requestedHorizonDays: 30,
          outlook: activeOutlook,
          response: null,
          warnings: [],
          partialFailures: [],
        },
      },
    });

    expect(viewModel.status).toEqual({ label: "Ready", tone: "success" });
    expect(viewModel.sourcePostureItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Projection Coverage",
          detail: "3 projected points through 11 Jun 2026",
          status: "Available",
        }),
        expect.objectContaining({
          label: "Projection Basis",
          detail: "2 positive movement dates and 1 negative movement date in the returned projection",
          status: "30 days",
        }),
        expect.objectContaining({
          label: "Cash Position",
          source: "Booked cash",
          detail: expect.stringContaining(
            "projected movements are not applied as an ending balance",
          ),
        }),
      ]),
    );
    expect(
      viewModel.sourcePostureItems.find(
        (item) => item.label === "Reporting Snapshot",
      ),
    ).toBeUndefined();
  });

  it("keeps an unavailable selected Cashflow horizon explicit", () => {
    const viewModel = buildPortfolioRecordEvidenceRailViewModel({
      screen: "cashflow",
      workspace: buildPortfolioWorkspace({}),
      cashflowProjection: {
        selectedHorizonDays: 90,
        state: "unavailable",
        snapshot: null,
      },
    });

    expect(viewModel.status).toEqual({ label: "Unavailable", tone: "danger" });
    expect(viewModel.sourcePostureItems[0]).toEqual(
      expect.objectContaining({
        source: "Projected movement source unavailable",
        detail: "No 90-day projected cash movement is available for review",
        status: "Unavailable",
        tone: "danger",
      }),
    );
  });

  it.each([
    {
      input: { status: "READY", generated_at_utc: null, row_count: 11 },
      expected: {
        state: "source_ready",
        source: "Reportable book ready",
        detail: "11 reportable rows available; a reporting snapshot has not been generated",
        status: "Not generated",
        tone: "warn",
      },
    },
    {
      input: { status: "COMPLETE", generated_at_utc: "2026-05-12T00:00:00Z", row_count: 11 },
      expected: {
        state: "generated",
        source: "Generated 12 May 2026, 00:00 UTC",
        detail: "11 reportable rows in the latest generated snapshot",
        status: "Generated",
        tone: "success",
      },
    },
    {
      input: { status: "PARTIAL", generated_at_utc: null, row_count: 4 },
      expected: {
        state: "pending",
        source: "Reporting source pending",
        detail: "4 reportable rows available; a reporting snapshot has not been generated",
        status: "Partial",
        tone: "warn",
      },
    },
    {
      input: { status: "PENDING", generated_at_utc: "2026-05-10T00:00:00Z", row_count: 8 },
      expected: {
        state: "pending",
        source: "Last generated 10 May 2026, 00:00 UTC",
        detail: "8 reportable rows available; the current reporting refresh is not complete",
        status: "Pending",
        tone: "warn",
      },
    },
    {
      input: { status: "EMPTY", generated_at_utc: null, row_count: 0 },
      expected: {
        state: "empty",
        source: "No reporting snapshot",
        detail: "No reportable rows are available for snapshot generation",
        status: "Empty",
        tone: "warn",
      },
    },
    {
      input: { status: "STALE", generated_at_utc: "2026-05-01T00:00:00Z", row_count: 7 },
      expected: {
        state: "stale",
        source: "Last generated 01 May 2026, 00:00 UTC",
        detail: "7 reportable rows available; confirm the current reporting source before client use",
        status: "Stale",
        tone: "warn",
      },
    },
    {
      input: { status: "FAILED", generated_at_utc: null, row_count: 0 },
      expected: {
        state: "failed",
        source: "Reporting source failed",
        detail: "No current reporting snapshot is available because the latest refresh failed",
        status: "Failed",
        tone: "danger",
      },
    },
    {
      input: { status: "UNAVAILABLE", generated_at_utc: null, row_count: 0 },
      expected: {
        state: "unavailable",
        source: "Reporting source unavailable",
        detail: "No current reporting snapshot is available for client review",
        status: "Unavailable",
        tone: "danger",
      },
    },
    {
      input: { status: "UNRECOGNIZED", generated_at_utc: null, row_count: 0 },
      expected: {
        state: "unavailable",
        source: "Reporting status unavailable",
        detail: "Reporting snapshot availability cannot be confirmed from the current source",
        status: "Unavailable",
        tone: "danger",
      },
    },
    {
      input: { status: "UNRECOGNIZED", generated_at_utc: "2026-05-01T00:00:00Z", row_count: 7 },
      expected: {
        state: "unavailable",
        source: "Last generated 01 May 2026, 00:00 UTC",
        detail: "7 reportable rows retained; current output availability is not confirmed",
        status: "Unavailable",
        tone: "danger",
      },
    },
  ])("builds one consistent reporting posture for $input.status", ({ input, expected }) => {
    const workspace = buildPortfolioWorkspace({});
    workspace.readiness.reporting = input;

    expect(buildReportingSourcePosture(workspace)).toEqual({
      label: "Reporting Snapshot",
      ...expected,
    });
  });

  it("uses the same reporting posture on record screens where reporting is decision context", () => {
    const workspace = buildPortfolioWorkspace({});
    workspace.readiness.reporting = {
      status: "READY",
      generated_at_utc: null,
      row_count: 11,
    };

    for (const screen of [
      "positions",
      "allocation",
      "transactions",
      "income",
    ] as const) {
      const reporting = buildPortfolioRecordEvidenceRailViewModel({ screen, workspace })
        .sourcePostureItems.find((item) => item.label === "Reporting Snapshot");

      expect(reporting).toEqual(
        expect.objectContaining({
          source: "Reportable book ready",
          status: "Not generated",
          tone: "warn",
        })
      );
    }
  });
});
