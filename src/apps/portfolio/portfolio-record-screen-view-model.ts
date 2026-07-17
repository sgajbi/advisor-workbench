import { formatCurrency, formatDate, formatStatus } from "./formatters";
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
    subtitle: "Booked activity, settlement state, transaction components, and source lineage.",
    kicker: "Ledger",
  },
  income: {
    title: "Income & Activity",
    subtitle: "Income composition, booked activity, and cash movement for review.",
    kicker: "Income and activity",
  },
  cashflow: {
    title: "Cashflow Workspace",
    subtitle: "Forward liquidity path, projected settlements, and cumulative cash movement.",
    kicker: "Liquidity forecast",
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
    const activityAmount =
      activity?.buckets.reduce(
        (total, bucket) => total + bucket.requested_window.reporting_currency_amount,
        0
      ) ?? null;
    const eventCount =
      (income?.totals_requested_window.net.transaction_count ?? 0) +
      (activity?.buckets.reduce(
        (total, bucket) => total + bucket.requested_window.transaction_count,
        0
      ) ?? 0);

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
        label: "Net Activity",
        value: activityAmount == null
          ? "N/A"
          : formatCurrency(activityAmount, activity?.reporting_currency ?? workspace.portfolio.base_currency),
      },
      {
        label: "Events",
        value: String(eventCount),
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

  if (screen === "cashflow") {
    const cashflow = workspace.cashflow_outlook;
    const finalCumulative =
      cashflow?.upcoming_points.at(-1)?.projected_cumulative_cashflow_base ??
      cashflow?.total_net_cashflow_base;

    return [
      {
        label: "Net Flow",
        value: cashflow
          ? formatCurrency(cashflow.total_net_cashflow_base, workspace.portfolio.base_currency)
          : "N/A",
      },
      {
        label: "Horizon",
        value: cashflow ? `${cashflow.projection_days}D` : windowLabel,
      },
      {
        label: "Ending Cumulative",
        value:
          finalCumulative == null
            ? "N/A"
            : formatCurrency(finalCumulative, workspace.portfolio.base_currency),
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
