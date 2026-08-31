import { describe, expect, it } from "vitest";

import {
  canUsePortfolioHistoricalReview,
  isPortfolioHistoricalDateInRange,
} from "@/apps/portfolio/portfolio-control-capabilities";
import type { PortfolioWorkspace } from "@/apps/portfolio/types";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";

const REQUIRED_MODULES = [
  "workspace",
  "book",
  "liquidity",
  "allocations",
  "positions",
  "transactions",
  "income_summary",
  "activity_summary",
  "readiness",
  "workflow",
  "insights",
] as const;

function buildPartialHistoricalWorkspace(
  overrides: Partial<
    NonNullable<
      PortfolioWorkspace["control_capabilities"]
    >["historical_snapshots"]
  > = {},
): PortfolioWorkspace {
  return buildPortfolioWorkspace({
    control_capabilities: {
      historical_snapshots: {
        state: "partial",
        reason:
          "Dated portfolio records are supported; performance is period-fenced and rebalance remains latest-run.",
        requested_as_of_date: "2026-05-12",
        effective_as_of_date: "2026-05-12",
        earliest_available_as_of_date: "2024-01-15",
        latest_available_as_of_date: "2026-05-12",
        module_capabilities: [
          ...REQUIRED_MODULES.map((module) => ({
            module,
            state: "supported" as const,
            reason: `${module} confirms the review date.`,
          })),
          {
            module: "performance_snapshot",
            state: "partial",
            reason: "Performance confirms an exact report end date.",
          },
          {
            module: "rebalance",
            state: "unsupported",
            reason: "Rebalance is always the latest source run.",
          },
        ],
        ...overrides,
      },
      reporting_currency_restatement: {
        state: "partial",
        reason: "Reporting-currency restatement is not uniform.",
        requested_reporting_currency: null,
        effective_reporting_currency: "USD",
        supported_currencies: ["USD"],
        module_capabilities: [],
      },
    },
  });
}

describe("portfolio control capabilities", () => {
  it("rejects a partial aggregate even when its module flags look supported", () => {
    const workspace = buildPartialHistoricalWorkspace();

    expect(canUsePortfolioHistoricalReview(workspace)).toBe(false);
    expect(isPortfolioHistoricalDateInRange(workspace, "2025-12-31")).toBe(
      false,
    );
  });

  it("fails closed when a required dated module is absent or partial", () => {
    const workspace = buildPartialHistoricalWorkspace();
    const moduleCapabilities =
      workspace.control_capabilities!.historical_snapshots.module_capabilities;

    expect(
      canUsePortfolioHistoricalReview(
        buildPartialHistoricalWorkspace({
          module_capabilities: moduleCapabilities.filter(
            ({ module }) => module !== "positions",
          ),
        }),
      ),
    ).toBe(false);
    expect(
      canUsePortfolioHistoricalReview(
        buildPartialHistoricalWorkspace({
          module_capabilities: moduleCapabilities.map((capability) =>
            capability.module === "income_summary"
              ? { ...capability, state: "partial" }
              : capability,
          ),
        }),
      ),
    ).toBe(false);
  });

  it("enforces the source-published date range", () => {
    const workspace = buildPartialHistoricalWorkspace({ state: "supported" });

    expect(isPortfolioHistoricalDateInRange(workspace, "2024-01-14")).toBe(
      false,
    );
    expect(isPortfolioHistoricalDateInRange(workspace, "2026-05-13")).toBe(
      false,
    );
  });
});
