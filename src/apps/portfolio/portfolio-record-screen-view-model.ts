import { formatCurrency, formatDate, formatPct } from "./formatters";
import { buildActivityMovementSummary } from "./portfolio-income-activity-view-model";
import {
  PORTFOLIO_CURRENCY_LABELS,
  PORTFOLIO_SCREEN_LABELS,
  PORTFOLIO_VALUE_LABEL,
} from "./portfolio-terminology";
import type { PortfolioWorkspace } from "./types";
import {
  resolveEffectivePeriod,
  type PortfolioTimeWindow,
} from "./view-model";

export type PortfolioRecordScreenKind = "allocation" | "positions" | "transactions" | "income" | "cashflow";

export type PortfolioRecordScreenCopy = {
  title: string;
  subtitle: string;
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
    subtitle: "Review portfolio exposures and trace each direct allocation to its contributing positions.",
  },
  positions: {
    title: PORTFOLIO_SCREEN_LABELS.positions,
    subtitle:
      "Review the complete booked inventory, valuation, cost basis, portfolio weights, and recent position activity.",
  },
  transactions: {
    title: "Transactions",
    subtitle: "Review booked activity, settlement state, booking components, and source lineage.",
  },
  income: {
    title: "Income and activity",
    subtitle: "Review booked income, deductions, and portfolio cash movements in reporting currency.",
  },
  cashflow: {
    title: PORTFOLIO_SCREEN_LABELS.projectedCashFlow,
    subtitle:
      "Review expected dated net cash movements across the selected horizon. Figures show movement, not projected cash balances.",
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

export function buildPortfolioRecordHeaderKpis(
  workspace: PortfolioWorkspace,
  windowLabel = "30D",
  screen?: PortfolioRecordScreenKind
): PortfolioRecordHeaderKpi[] {
  if (screen === "allocation") {
    return [
      {
        label: PORTFOLIO_VALUE_LABEL,
        value: formatCurrency(workspace.summary.market_value_base, workspace.portfolio.base_currency),
      },
      {
        label: "Exposure views",
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
      income?.reporting_currency ?? activity?.reporting_currency ?? null;
    const displayCurrency =
      reportingCurrency ?? workspace.portfolio.base_currency;

    return [
      {
        label: "Net income",
        value: income
          ? formatCurrency(
              income.totals_requested_window.net.reporting_currency_amount,
              income.reporting_currency
            )
          : "N/A",
      },
      {
        label: "Net cash movement",
        value: activityMovement == null
          ? "N/A"
          : formatCurrency(activityMovement.netMovement, displayCurrency),
      },
      {
        label: reportingCurrency
          ? PORTFOLIO_CURRENCY_LABELS.reporting
          : PORTFOLIO_CURRENCY_LABELS.base,
        value: displayCurrency,
      },
    ];
  }

  if (screen === "positions") {
    return [
      {
        label: PORTFOLIO_VALUE_LABEL,
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
        label: PORTFOLIO_CURRENCY_LABELS.base,
        value: workspace.portfolio.base_currency,
      },
      {
        label: "Latest booking",
        value: formatDate(workspace.operations?.latest_booked_transaction_date),
      },
      {
        label: "30D entries",
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
        label: "Current cash",
        value: formatCurrency(workspace.summary.total_cash_base, workspace.portfolio.base_currency),
      },
      {
        label: "Cash weight",
        value: formatPct(workspace.summary.cash_weight_pct),
      },
      {
        label: PORTFOLIO_CURRENCY_LABELS.base,
        value: workspace.portfolio.base_currency,
      },
    ];
  }

  return [
    {
      label: PORTFOLIO_VALUE_LABEL,
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

export function resolvePortfolioRecordScreenWindow(
  asOfDate: string,
  timeWindow: PortfolioTimeWindow = "30D",
  inceptionDate?: string | null,
) {
  const period = resolveEffectivePeriod(
    asOfDate,
    timeWindow,
    inceptionDate,
  );
  return {
    startDate: period.startDate,
    endDate: period.endDate,
  };
}
