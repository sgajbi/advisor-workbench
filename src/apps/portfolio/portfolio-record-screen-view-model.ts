import { formatCurrency, formatDate, formatPct, formatStatus } from "./formatters";
import { buildActivityMovementSummary } from "./portfolio-income-activity-view-model";
import type { PortfolioWorkspace } from "./types";

export type PortfolioRecordScreenKind = "allocation" | "positions" | "transactions" | "income" | "cashflow";

export type PortfolioRecordScreenCopy = {
  title: string;
  subtitle: string;
  kicker: string;
};

export type PortfolioRecordHeaderKpi = {
  label: string;
  value: string;
};

export const PORTFOLIO_RECORD_SCREEN_COPY: Record<
  PortfolioRecordScreenKind,
  PortfolioRecordScreenCopy
> = {
  allocation: {
    title: "Allocation",
    subtitle: "Review portfolio exposures and trace each direct allocation to its contributing holdings.",
    kicker: "Allocation review",
  },
  positions: {
    title: "Positions",
    subtitle:
      "Review the complete booked inventory, valuation, cost basis, portfolio weights, and recent holding activity.",
    kicker: "Booked holdings",
  },
  transactions: {
    title: "Transactions",
    subtitle: "Review booked activity, settlement state, booking components, and source lineage.",
    kicker: "Booked activity review",
  },
  income: {
    title: "Income & Activity",
    subtitle: "Review booked income, deductions, and portfolio cash movements in reporting currency.",
    kicker: "Booked income and cash movement",
  },
  cashflow: {
    title: "Cashflow",
    subtitle:
      "Review expected dated net cash movements across the selected horizon. Figures show movement, not projected cash balances.",
    kicker: "Projected cash movement",
  },
};

export function getPortfolioRecordScreenCopy(
  screen: PortfolioRecordScreenKind
): PortfolioRecordScreenCopy {
  return PORTFOLIO_RECORD_SCREEN_COPY[screen];
}

export function buildPortfolioRecordScreenSubtitle(
  screen: PortfolioRecordScreenKind
): string {
  const copy = getPortfolioRecordScreenCopy(screen);
  return copy.subtitle;
}

export function buildPortfolioRecordDisplayName(workspace: PortfolioWorkspace): string {
  if (workspace.portfolio.display_name && workspace.portfolio.display_name !== workspace.portfolio.portfolio_id) {
    return workspace.portfolio.display_name;
  }

  return `${formatStatus(workspace.profile.risk_exposure)} Mandate`;
}

export function buildPortfolioRecordHeaderMeta(workspace: PortfolioWorkspace): string {
  const parts = [
    `${formatStatus(workspace.profile.portfolio_type)} mandate`,
    workspace.portfolio.base_currency,
    `As of ${formatDate(workspace.as_of_date)}`,
    workspace.portfolio.client_id,
  ].filter(Boolean);
  return parts.join(" · ");
}

export function buildPortfolioRecordHeaderKpis(
  workspace: PortfolioWorkspace,
  windowLabel = "30D",
  screen?: PortfolioRecordScreenKind
): PortfolioRecordHeaderKpi[] {
  if (screen === "allocation") {
    return [
      {
        label: "AUM",
        value: formatCurrency(workspace.summary.market_value_base, workspace.portfolio.base_currency),
      },
      {
        label: "Exposure Views",
        value: String(workspace.allocation_views?.length ?? 0),
      },
      {
        label: "Positions",
        value: String(workspace.summary.position_count),
      },
    ];
  }

  if (screen === "income") {
    const income = workspace.income_summary;
    const activity = workspace.activity_summary;
    const activityMovement = buildActivityMovementSummary(activity);
    const reportingCurrency =
      income?.reporting_currency ??
      activity?.reporting_currency ??
      workspace.portfolio.base_currency;

    return [
      {
        label: "Net Income",
        value: income
          ? formatCurrency(
              income.totals_requested_window.net.reporting_currency_amount,
              income.reporting_currency
            )
          : "N/A",
      },
      {
        label: "Net Cash Movement",
        value: activityMovement == null
          ? "N/A"
          : formatCurrency(activityMovement.netMovement, reportingCurrency),
      },
      {
        label: "Reporting Currency",
        value: reportingCurrency,
      },
    ];
  }

  if (screen === "positions") {
    return [
      {
        label: "AUM",
        value: formatCurrency(workspace.summary.market_value_base, workspace.portfolio.base_currency),
      },
      {
        label: "Invested",
        value:
          workspace.summary.invested_market_value_base == null
            ? "N/A"
            : formatCurrency(
                workspace.summary.invested_market_value_base,
                workspace.portfolio.base_currency,
              ),
      },
      {
        label: "Cash",
        value: formatCurrency(workspace.summary.total_cash_base, workspace.portfolio.base_currency),
      },
    ];
  }

  if (screen === "transactions") {
    return [
      {
        label: "Portfolio Currency",
        value: workspace.portfolio.base_currency,
      },
      {
        label: "Latest Booking",
        value: formatDate(workspace.operations?.latest_booked_transaction_date),
      },
      {
        label: "30D Entries",
        value: String(
          workspace.transaction_ledger_page?.total ??
            workspace.recent_transactions.length,
        ),
      },
    ];
  }

  if (screen === "cashflow") {
    return [
      {
        label: "Current Cash",
        value: formatCurrency(workspace.summary.total_cash_base, workspace.portfolio.base_currency),
      },
      {
        label: "Cash Weight",
        value: formatPct(workspace.summary.cash_weight_pct),
      },
      {
        label: "Base Currency",
        value: workspace.portfolio.base_currency,
      },
    ];
  }

  return [
    {
      label: "AUM",
      value: formatCurrency(workspace.summary.market_value_base, workspace.portfolio.base_currency),
    },
    {
      label: "Positions",
      value: String(workspace.summary.position_count),
    },
    {
      label: "Window",
      value: windowLabel,
    },
  ];
}

export function resolvePortfolioRecordScreenWindow(asOfDate: string) {
  const end = new Date(`${asOfDate.slice(0, 10)}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 30);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}
