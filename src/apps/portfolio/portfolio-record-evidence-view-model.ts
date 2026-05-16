import { formatCount, formatDate, formatStatus } from "./formatters";
import type { PortfolioRecordScreenKind } from "./portfolio-record-screen-view-model";
import type { PortfolioWorkspace } from "./types";

export type PortfolioRecordEvidenceTone = "default" | "success" | "warn" | "danger";

export type PortfolioRecordEvidenceFact = {
  label: string;
  value: string;
};

export type PortfolioRecordSourcePosture = {
  label: string;
  source: string;
  detail: string;
  status: string;
  tone: PortfolioRecordEvidenceTone;
};

export type PortfolioRecordAdjacentWorkflow = {
  label: string;
  href: string;
};

export type PortfolioRecordEvidenceRailViewModel = {
  status: {
    label: string;
    tone: PortfolioRecordEvidenceTone;
  };
  facts: PortfolioRecordEvidenceFact[];
  sourcePostureItems: PortfolioRecordSourcePosture[];
  adjacentWorkflows: PortfolioRecordAdjacentWorkflow[];
};

export function buildPortfolioRecordEvidenceRailViewModel({
  screen,
  workspace,
}: {
  screen: PortfolioRecordScreenKind;
  workspace: PortfolioWorkspace;
}): PortfolioRecordEvidenceRailViewModel {
  const portfolioId = workspace.portfolio.portfolio_id;
  const reportingReady = workspace.readiness.reporting.status?.toUpperCase() === "READY";
  const sourcePostureItems = buildSourcePostureItems({
    screen,
    workspace,
    portfolioId,
    reportingReady,
  });

  return {
    status: {
      label: workspace.partial_failures.length ? "Partial" : "Ready",
      tone: workspace.partial_failures.length ? "warn" : "success",
    },
    facts: [
      { label: "Portfolio", value: portfolioId },
      { label: "Client", value: workspace.portfolio.client_id ?? "N/A" },
      { label: "Book Currency", value: workspace.portfolio.base_currency },
      { label: "Screen", value: formatStatus(screen) },
    ],
    sourcePostureItems,
    adjacentWorkflows: buildAdjacentWorkflows(portfolioId),
  };
}

function buildSourcePostureItems({
  screen,
  workspace,
  portfolioId,
  reportingReady,
}: {
  screen: PortfolioRecordScreenKind;
  workspace: PortfolioWorkspace;
  portfolioId: string;
  reportingReady: boolean;
}): PortfolioRecordSourcePosture[] {
  if (screen === "transactions") {
    return buildTransactionSourcePosture(workspace, portfolioId, reportingReady);
  }

  if (screen === "income") {
    return buildIncomeActivitySourcePosture(workspace, reportingReady);
  }

  if (screen === "cashflow") {
    return buildCashflowSourcePosture(workspace, reportingReady);
  }

  if (screen === "allocation") {
    return buildAllocationSourcePosture(workspace);
  }

  return buildPositionSourcePosture({
    workspace,
    portfolioId,
    reportingReady,
  });
}

function buildAdjacentWorkflows(portfolioId: string): PortfolioRecordAdjacentWorkflow[] {
  const encodedPortfolioId = encodeURIComponent(portfolioId);

  return [
    { label: "Portfolio Review", href: `/portfolio?portfolioId=${encodedPortfolioId}` },
    { label: "Allocation", href: `/allocation?portfolioId=${encodedPortfolioId}` },
    { label: "Transactions", href: `/transactions?portfolioId=${encodedPortfolioId}` },
    { label: "Income & Activity", href: `/income?portfolioId=${encodedPortfolioId}` },
    { label: "Cashflow", href: `/cashflow?portfolioId=${encodedPortfolioId}` },
    { label: "Mandate Operations", href: `/workbench/${encodedPortfolioId}` },
  ];
}

function buildAllocationSourcePosture(
  workspace: PortfolioWorkspace
): PortfolioRecordSourcePosture[] {
  const allocationViews = workspace.allocation_views ?? [];
  const bucketCount = allocationViews.reduce((total, view) => total + view.buckets.length, 0);
  const dimensions = allocationViews.length;

  return [
    {
      label: "Allocation Views",
      source: "Portfolio book record",
      detail: `${formatCount(dimensions, "dimension")} and ${formatCount(bucketCount, "bucket")} available`,
      tone: bucketCount ? "success" : "warn",
      status: bucketCount ? "Ready" : "Pending",
    },
    {
      label: "Holdings Coverage",
      source: "Core positions inventory",
      detail: `${formatCount(workspace.positions.length, "position")} available for allocation review`,
      tone: workspace.positions.length ? "success" : "default",
      status: workspace.positions.length ? "Ready" : "Empty",
    },
    buildReportingSourcePosture(workspace, workspace.readiness.reporting.status?.toUpperCase() === "READY"),
  ];
}

function buildIncomeActivitySourcePosture(
  workspace: PortfolioWorkspace,
  reportingReady: boolean
): PortfolioRecordSourcePosture[] {
  const income = workspace.income_summary;
  const activity = workspace.activity_summary;
  const incomeTypeCount = income?.income_types.length ?? 0;
  const incomeEventCount = income?.totals_requested_window.net.transaction_count ?? 0;
  const activityBucketCount = activity?.buckets.length ?? 0;
  const activityEventCount =
    activity?.buckets.reduce(
      (total, bucket) => total + bucket.requested_window.transaction_count,
      0
    ) ?? 0;

  return [
    {
      label: "Income Source",
      source: "Portfolio book record",
      detail: income
        ? `${formatCount(incomeTypeCount, "income type")} and ${formatCount(
            incomeEventCount,
            "income event"
          )} through ${formatDate(income.window_end_date)}`
        : "No classified income returned for the selected reporting window",
      tone: income ? "success" : "warn",
      status: income ? "Available" : "Unavailable",
    },
    {
      label: "Activity Buckets",
      source: "Source-defined activity classification",
      detail: activity
        ? `${formatCount(activityBucketCount, "bucket")} and ${formatCount(
            activityEventCount,
            "activity event"
          )} through ${formatDate(activity.window_end_date)}`
        : "No activity buckets returned for the selected reporting window",
      tone: activity ? "success" : "warn",
      status: activity ? "Ready" : "Unavailable",
    },
    buildReportingSourcePosture(workspace, reportingReady),
  ];
}

function buildCashflowSourcePosture(
  workspace: PortfolioWorkspace,
  reportingReady: boolean
): PortfolioRecordSourcePosture[] {
  const cashflow = workspace.cashflow_outlook;
  const pointCount = cashflow?.upcoming_points.length ?? 0;
  const positiveCount =
    cashflow?.upcoming_points.filter((point) => point.net_cashflow_base > 0).length ?? 0;
  const negativeCount =
    cashflow?.upcoming_points.filter((point) => point.net_cashflow_base < 0).length ?? 0;

  return [
    {
      label: "Projection Source",
      source: "Portfolio book record",
      detail: cashflow
        ? `${formatCount(pointCount, "projected point")} through ${formatDate(cashflow.range_end_date)}`
        : "No projected cashflow outlook returned for this portfolio",
      tone: cashflow ? "success" : "warn",
      status: cashflow ? "Available" : "Unavailable",
    },
    {
      label: "Forecast Horizon",
      source: cashflow ? `${cashflow.projection_days} day projection` : "Not provided",
      detail: cashflow
        ? `${formatCount(positiveCount, "inflow")} and ${formatCount(negativeCount, "outflow")} in the returned forecast`
        : "Horizon cannot be displayed until the source outlook is available",
      tone: cashflow ? "success" : "default",
      status: cashflow ? "Ready" : "N/A",
    },
    buildReportingSourcePosture(workspace, reportingReady),
  ];
}

function buildPositionSourcePosture({
  workspace,
  portfolioId,
  reportingReady,
}: {
  workspace: PortfolioWorkspace;
  portfolioId: string;
  reportingReady: boolean;
}): PortfolioRecordSourcePosture[] {
  const unpricedCount = workspace.positions.filter(
    (position) => position.market_price == null || position.market_value_base == null
  ).length;
  const reprocessingCount = workspace.positions.filter((position) => position.reprocessing_status).length;
  const staleCount =
    workspace.operations?.stale_reprocessing_keys ??
    workspace.positions.filter((position) =>
      (position.reprocessing_status ?? "").toLowerCase().includes("stale")
    ).length;

  return [
    {
      label: "Pricing Source",
      source: "Portfolio book record",
      detail: unpricedCount
        ? `${formatCount(unpricedCount, "holding")} missing price or valuation`
        : "All visible holdings have price and valuation data",
      tone: unpricedCount ? "warn" : "success",
      status: unpricedCount ? "Partial" : "Verified",
    },
    {
      label: "Positions Ledger",
      source: "Core positions inventory",
      detail: `${formatCount(workspace.positions.length, "position")} loaded for ${portfolioId}`,
      tone: workspace.readiness.has_positions ? "success" : "default",
      status: workspace.readiness.has_positions ? "Reconciled" : "Empty",
    },
    buildReportingSourcePosture(workspace, reportingReady),
    {
      label: "Reprocessing",
      source: "Portfolio operations",
      detail:
        reprocessingCount || staleCount
          ? `${formatCount(reprocessingCount, "flag")} on positions, ${formatCount(staleCount, "stale key")}`
          : "No position-level reprocessing flags in the visible inventory",
      tone: staleCount ? "warn" : "success",
      status: staleCount ? "Review" : "Clear",
    },
  ];
}

function buildTransactionSourcePosture(
  workspace: PortfolioWorkspace,
  portfolioId: string,
  reportingReady: boolean
): PortfolioRecordSourcePosture[] {
  const transactionCount = workspace.recent_transactions.length;
  const settledCount = workspace.recent_transactions.filter(
    (transaction) => transaction.settlement_status?.toUpperCase() === "SETTLED"
  ).length;
  const componentCount = new Set(
    workspace.recent_transactions
      .map((transaction) => transaction.component_type)
      .filter((value): value is string => Boolean(value))
  ).size;
  const sourceSystems = uniqueSourceSystems(workspace);
  const allSettled = transactionCount > 0 && settledCount === transactionCount;

  return [
    {
      label: "Source System",
      source: sourceSystems.length ? sourceSystems.join(", ") : "Core transaction ledger",
      detail: `${formatCount(transactionCount, "event")} loaded for ${portfolioId}`,
      tone: transactionCount ? "success" : "default",
      status: transactionCount ? "Available" : "Empty",
    },
    {
      label: "Settlement",
      source: "Ledger settlement state",
      detail: `${formatCount(settledCount, "settled event")} of ${formatCount(transactionCount, "event")}`,
      tone: allSettled ? "success" : transactionCount ? "warn" : "default",
      status: allSettled ? "Matched" : transactionCount ? "Review" : "N/A",
    },
    {
      label: "Components",
      source: "Strategic transaction model",
      detail: componentCount
        ? `${formatCount(componentCount, "component type")} represented in the current window`
        : "No component taxonomy exposed for the current window",
      tone: componentCount ? "success" : "default",
      status: componentCount ? "Validated" : "N/A",
    },
    buildReportingSourcePosture(workspace, reportingReady),
  ];
}

function buildReportingSourcePosture(
  workspace: PortfolioWorkspace,
  reportingReady: boolean
): PortfolioRecordSourcePosture {
  return {
    label: "Reporting Snapshot",
    source: workspace.readiness.reporting.generated_at_utc
      ? formatDate(workspace.readiness.reporting.generated_at_utc)
      : "Not generated",
    detail: `${formatCount(workspace.readiness.reporting.row_count, "row")} in latest reportable book`,
    tone: reportingReady ? "success" : "warn",
    status: formatStatus(workspace.readiness.reporting.status),
  };
}

function uniqueSourceSystems(workspace: PortfolioWorkspace): string[] {
  return Array.from(
    new Set(
      workspace.recent_transactions
        .map((transaction) => transaction.source_system)
        .filter((value): value is string => Boolean(value))
        .map(formatStatus)
    )
  );
}
