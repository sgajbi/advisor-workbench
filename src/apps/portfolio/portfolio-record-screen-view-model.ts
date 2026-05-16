import { formatCurrency, formatDate, formatStatus } from "./formatters";
import type { PortfolioWorkspace } from "./types";

export type PortfolioRecordScreenKind = "positions" | "transactions" | "cashflow";

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
  positions: {
    title: "Positions",
    subtitle: "Holdings, valuation, cost basis, portfolio weights, and unrealized P&L.",
    kicker: "Position inventory",
  },
  transactions: {
    title: "Transactions",
    subtitle: "Booked activity, settlement state, transaction components, and source lineage.",
    kicker: "Ledger",
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
  screen: PortfolioRecordScreenKind,
  workspace: PortfolioWorkspace | null
): string {
  const copy = getPortfolioRecordScreenCopy(screen);
  return workspace ? `${workspace.portfolio.portfolio_id} · ${copy.subtitle}` : copy.subtitle;
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
      label: "Total Market Value",
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
