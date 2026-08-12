import { formatCount, formatCurrency, formatDate, formatStatus } from "./formatters";
import type { CashflowProjectionSnapshot } from "./portfolio-projected-cashflow-view-model";
import type { PortfolioRecordScreenKind } from "./portfolio-record-screen-view-model";
import { buildPortfolioPositionStateSummary } from "./portfolio-position-state-view-model";
import { buildPortfolioTransactionSettlementSummary } from "./portfolio-transaction-settlement-view-model";
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

export type PortfolioReportingSnapshotState =
  | "generated"
  | "source_ready"
  | "pending"
  | "empty"
  | "stale"
  | "unavailable"
  | "failed";

export type PortfolioReportingSourcePosture = PortfolioRecordSourcePosture & {
  state: PortfolioReportingSnapshotState;
};

export type PortfolioRecordAdjacentWorkflow = {
  label: string;
  href: string;
};

type PortfolioRecordWorkflowLink = PortfolioRecordAdjacentWorkflow & {
  screen: PortfolioRecordScreenKind | "review" | "mandate";
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

export type PortfolioRecordCashflowProjection = {
  selectedHorizonDays: number;
  snapshot: CashflowProjectionSnapshot | null;
  state: "loading" | "refreshing" | "ready" | "unconfirmed" | "unavailable";
};

export function buildPortfolioRecordEvidenceRailViewModel({
  screen,
  workspace,
  cashflowProjection,
}: {
  screen: PortfolioRecordScreenKind;
  workspace: PortfolioWorkspace;
  cashflowProjection?: PortfolioRecordCashflowProjection;
}): PortfolioRecordEvidenceRailViewModel {
  const portfolioId = workspace.portfolio.portfolio_id;
  const sourcePostureItems = buildSourcePostureItems({
    screen,
    workspace,
    cashflowProjection,
  });
  const isPartial =
    workspace.partial_failures.length > 0 ||
    sourcePostureItems.some(
      (item) => item.tone === "warn" || item.tone === "danger",
    );
  const cashflowUnavailable = cashflowProjection?.state === "unavailable";
  const cashflowLoading = cashflowProjection?.state === "loading";

  return {
    status: {
      label: cashflowUnavailable
        ? "Unavailable"
        : cashflowLoading
          ? "Loading"
          : isPartial
            ? "Partial"
            : "Ready",
      tone: cashflowUnavailable
        ? "danger"
        : isPartial
          ? "warn"
          : cashflowLoading
            ? "default"
            : "success",
    },
    facts: [
      { label: "Client", value: workspace.portfolio.client_id ?? "N/A" },
      { label: "Currency", value: workspace.portfolio.base_currency },
      { label: "Review Area", value: formatStatus(screen) },
    ],
    sourcePostureItems,
    adjacentWorkflows: buildAdjacentWorkflows(portfolioId, screen),
  };
}

function buildSourcePostureItems({
  screen,
  workspace,
  cashflowProjection,
}: {
  screen: PortfolioRecordScreenKind;
  workspace: PortfolioWorkspace;
  cashflowProjection?: PortfolioRecordCashflowProjection;
}): PortfolioRecordSourcePosture[] {
  if (screen === "transactions") {
    return buildTransactionSourcePosture(workspace);
  }

  if (screen === "income") {
    return buildIncomeActivitySourcePosture(workspace);
  }

  if (screen === "cashflow") {
    return buildCashflowSourcePosture(workspace, cashflowProjection);
  }

  if (screen === "allocation") {
    return buildAllocationSourcePosture(workspace);
  }

  return buildPositionSourcePosture(workspace);
}

function buildAdjacentWorkflows(
  portfolioId: string,
  currentScreen: PortfolioRecordScreenKind
): PortfolioRecordAdjacentWorkflow[] {
  const encodedPortfolioId = encodeURIComponent(portfolioId);
  const workflows: PortfolioRecordWorkflowLink[] = [
    { screen: "review", label: "Portfolio Review", href: `/portfolio?portfolioId=${encodedPortfolioId}` },
    { screen: "positions", label: "Positions", href: `/positions?portfolioId=${encodedPortfolioId}` },
    { screen: "allocation", label: "Allocation", href: `/allocation?portfolioId=${encodedPortfolioId}` },
    { screen: "transactions", label: "Transactions", href: `/transactions?portfolioId=${encodedPortfolioId}` },
    { screen: "income", label: "Income & Activity", href: `/income?portfolioId=${encodedPortfolioId}` },
    { screen: "cashflow", label: "Cashflow", href: `/cashflow?portfolioId=${encodedPortfolioId}` },
    { screen: "mandate", label: "Mandate Operations", href: `/workbench/${encodedPortfolioId}` },
  ];

  return workflows
    .filter((workflow) => workflow.screen !== currentScreen)
    .map(({ label, href }) => ({ label, href }));
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
      source: "Book records",
      detail: `${formatCount(dimensions, "dimension")} and ${formatCount(bucketCount, "bucket")} available`,
      tone: bucketCount ? "success" : "warn",
      status: bucketCount ? "Ready" : "Pending",
    },
    {
      label: "Holdings Coverage",
      source: "Booked holdings inventory",
      detail: `${formatCount(workspace.positions.length, "position")} available for allocation review`,
      tone: workspace.positions.length ? "success" : "default",
      status: workspace.positions.length ? "Ready" : "Empty",
    },
    buildReportingSourcePosture(workspace),
  ];
}

function buildIncomeActivitySourcePosture(
  workspace: PortfolioWorkspace
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
      source: "Book records",
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
      source: "Activity classification",
      detail: activity
        ? `${formatCount(activityBucketCount, "bucket")} and ${formatCount(
            activityEventCount,
            "activity event"
          )} through ${formatDate(activity.window_end_date)}`
        : "No activity buckets returned for the selected reporting window",
      tone: activity ? "success" : "warn",
      status: activity ? "Ready" : "Unavailable",
    },
    buildReportingSourcePosture(workspace),
  ];
}

function buildCashflowSourcePosture(
  workspace: PortfolioWorkspace,
  projection?: PortfolioRecordCashflowProjection,
): PortfolioRecordSourcePosture[] {
  const cashflow = projection
    ? (projection.snapshot?.outlook ?? null)
    : workspace.cashflow_outlook;
  const pointCount = cashflow?.upcoming_points.length ?? 0;
  const positiveCount =
    cashflow?.upcoming_points.filter((point) => point.net_cashflow_base > 0)
      .length ?? 0;
  const negativeCount =
    cashflow?.upcoming_points.filter((point) => point.net_cashflow_base < 0)
      .length ?? 0;
  const aggregateOnlyMovement = Boolean(
    cashflow && pointCount === 0 && cashflow.total_net_cashflow_base !== 0,
  );
  const aggregateDirection =
    cashflow && cashflow.total_net_cashflow_base < 0 ? "outflow" : "inflow";
  const aggregateAmount = cashflow
    ? formatCurrency(
        Math.abs(cashflow.total_net_cashflow_base),
        workspace.portfolio.base_currency,
      )
    : null;
  const limited = Boolean(
    projection?.snapshot &&
    (projection.snapshot.warnings.length > 0 ||
      projection.snapshot.partialFailures.length > 0),
  );
  const projectionState =
    projection?.state ?? (cashflow ? "ready" : "unavailable");

  if (!cashflow) {
    const loading = projectionState === "loading";
    return [
      {
        label: "Projection Coverage",
        source: loading
          ? `${projection?.selectedHorizonDays ?? 10}-day projection requested`
          : "Projected movement source unavailable",
        detail: loading
          ? "Expected inflows and outflows are being retrieved for the selected horizon"
          : `No ${projection?.selectedHorizonDays ?? 10}-day projected cash movement is available for review`,
        tone: loading ? "default" : "danger",
        status: loading ? "Loading" : "Unavailable",
      },
      buildCashPositionSourcePosture(workspace),
    ];
  }

  const evidenceNeedsReview =
    limited ||
    projectionState === "refreshing" ||
    projectionState === "unconfirmed";
  const evidenceStatus =
    projectionState === "refreshing"
      ? "Confirming"
      : projectionState === "unconfirmed"
        ? "Unconfirmed"
        : limited
          ? "Limited"
          : aggregateOnlyMovement
            ? "Partial"
            : "Available";
  const evidenceTone: PortfolioRecordEvidenceTone =
    evidenceNeedsReview || aggregateOnlyMovement ? "warn" : "success";

  return [
    {
      label: "Projection Coverage",
      source: "Portfolio records",
      detail: cashflow
        ? aggregateOnlyMovement
          ? `Net projected movement available through ${formatDate(
              cashflow.range_end_date,
            )}; dated projection points unavailable`
          : `${formatCount(pointCount, "projected point")} through ${formatDate(
              cashflow.range_end_date,
            )}`
        : "No projected cashflow outlook returned for this portfolio",
      tone: evidenceTone,
      status: evidenceStatus,
    },
    {
      label: "Projection Basis",
      source: cashflow
        ? cashflow.include_projected
          ? "Booked and projected events"
          : "Booked events only"
        : "Not provided",
      detail: cashflow
        ? aggregateOnlyMovement
          ? `Net projected ${aggregateDirection} of ${aggregateAmount}; dated inflow and outflow counts unavailable`
          : `${formatCount(positiveCount, "inflow")} and ${formatCount(
              negativeCount,
              "outflow",
            )} in the returned forecast`
        : "Horizon cannot be displayed until the source outlook is available",
      tone: evidenceTone,
      status:
        projectionState === "refreshing"
          ? "Confirming"
          : projectionState === "unconfirmed"
            ? "Unconfirmed"
            : aggregateOnlyMovement
              ? "Aggregate only"
              : `${cashflow.projection_days} days`,
    },
    buildCashPositionSourcePosture(workspace),
  ];
}

function buildCashPositionSourcePosture(
  workspace: PortfolioWorkspace,
): PortfolioRecordSourcePosture {
  return {
    label: "Cash Position",
    source: "Booked cash",
    detail: `${formatCurrency(
      workspace.summary.total_cash_base,
      workspace.portfolio.base_currency,
    )} as of ${formatDate(
      workspace.as_of_date,
    )}; projected movements are not applied as an ending balance`,
    tone: "success",
    status: "Available",
  };
}

function buildPositionSourcePosture(
  workspace: PortfolioWorkspace
): PortfolioRecordSourcePosture[] {
  const positionCount = workspace.positions.filter(
    (position) => position.source_record_type !== "cash_balance"
  ).length;
  const unpricedCount = workspace.positions.filter(
    (position) =>
      position.source_record_type !== "cash_balance" &&
      (position.market_price == null || position.market_value_base == null)
  ).length;
  const positionState = buildPortfolioPositionStateSummary(
    workspace.positions,
    workspace.operations?.stale_reprocessing_keys ?? 0,
  );

  return [
    {
      label: "Pricing Source",
      source: "Book records",
      detail: !positionCount
        ? "No booked holdings are available for pricing review"
        : unpricedCount
        ? `${formatCount(unpricedCount, "holding")} missing price or valuation`
        : "All visible holdings have price and valuation data",
      tone: !positionCount ? "default" : unpricedCount ? "warn" : "success",
      status: !positionCount ? "N/A" : unpricedCount ? "Partial" : "Complete",
    },
    {
      label: "Positions Ledger",
      source: "Booked holdings inventory",
      detail: `${formatCount(workspace.positions.length, "position")} available for review`,
      tone: workspace.readiness.has_positions ? "success" : "default",
      status: workspace.readiness.has_positions ? "Available" : "Empty",
    },
    buildReportingSourcePosture(workspace),
    {
      label: "Position Status",
      source: "Booked position controls",
      detail: positionState.detail,
      tone: positionState.tone,
      status: positionState.status,
    },
  ];
}

function buildTransactionSourcePosture(
  workspace: PortfolioWorkspace
): PortfolioRecordSourcePosture[] {
  const transactionCount = workspace.recent_transactions.length;
  const settlement = buildPortfolioTransactionSettlementSummary(
    workspace.recent_transactions,
  );
  const componentCount = new Set(
    workspace.recent_transactions
      .map((transaction) => transaction.component_type)
      .filter((value): value is string => Boolean(value))
  ).size;
  const sourceSystems = uniqueSourceSystems(workspace);

  return [
    {
      label: "Source System",
      source: sourceSystems.length ? sourceSystems.join(", ") : "Booked transaction ledger",
      detail: `${formatCount(transactionCount, "event")} available in the review window`,
      tone: transactionCount ? "success" : "default",
      status: transactionCount ? "Available" : "Empty",
    },
    {
      label: "Settlement",
      source: "Ledger settlement state",
      detail: settlement.detail,
      tone: settlement.tone,
      status: settlement.status,
    },
    {
      label: "Components",
      source: "Booked transaction model",
      detail: componentCount
        ? `${formatCount(componentCount, "component type")} represented in the current window`
        : "No transaction component mix returned for the current window",
      tone: componentCount ? "success" : "default",
      status: componentCount ? "Available" : "Empty",
    },
    buildReportingSourcePosture(workspace),
  ];
}

export function buildReportingSourcePosture(
  workspace: PortfolioWorkspace
): PortfolioReportingSourcePosture {
  const reporting = workspace.readiness.reporting;
  const status = reporting.status.trim().toUpperCase();
  const rowCoverage = formatCount(reporting.row_count, "reportable row");
  const generatedAt = reporting.generated_at_utc
    ? formatDate(reporting.generated_at_utc)
    : null;
  const label = "Reporting Snapshot";

  if (status === "FAILED" || status === "ERROR") {
    return {
      state: "failed",
      label,
      source: generatedAt ? `Last generated ${generatedAt}` : "Reporting source failed",
      detail: generatedAt
        ? `${rowCoverage} retained; the latest reporting refresh failed`
        : "No current reporting snapshot is available because the latest refresh failed",
      status: "Failed",
      tone: "danger",
    };
  }

  if (["UNAVAILABLE", "MISSING", "BLOCKED"].includes(status)) {
    return {
      state: "unavailable",
      label,
      source: generatedAt ? `Last generated ${generatedAt}` : "Reporting source unavailable",
      detail: generatedAt
        ? `${rowCoverage} retained; current output availability is not confirmed`
        : "No current reporting snapshot is available for client review",
      status: "Unavailable",
      tone: "danger",
    };
  }

  if (status === "STALE" || status === "DEGRADED") {
    return {
      state: "stale",
      label,
      source: generatedAt ? `Last generated ${generatedAt}` : "Reporting source needs review",
      detail: `${rowCoverage} available; confirm the current reporting source before client use`,
      status: status === "STALE" ? "Stale" : "Degraded",
      tone: "warn",
    };
  }

  if (["PENDING", "PARTIAL", "IN_PROGRESS"].includes(status)) {
    return {
      state: "pending",
      label,
      source: generatedAt ? `Last generated ${generatedAt}` : "Reporting source pending",
      detail: generatedAt
        ? `${rowCoverage} available; the current reporting refresh is not complete`
        : `${rowCoverage} available; a reporting snapshot has not been generated`,
      status: status === "PARTIAL" ? "Partial" : "Pending",
      tone: "warn",
    };
  }

  if (
    status === "EMPTY" ||
    ((status === "READY" || status === "COMPLETE") && reporting.row_count === 0)
  ) {
    return {
      state: "empty",
      label,
      source: generatedAt ? `Generated ${generatedAt}` : "No reporting snapshot",
      detail: generatedAt
        ? "The generated snapshot contains no reportable rows"
        : "No reportable rows are available for snapshot generation",
      status: "Empty",
      tone: "warn",
    };
  }

  if (status === "READY" || status === "COMPLETE") {
    if (generatedAt) {
      return {
        state: "generated",
        label,
        source: `Generated ${generatedAt}`,
        detail: `${rowCoverage} in the latest generated snapshot`,
        status: "Generated",
        tone: "success",
      };
    }

    return {
      state: "source_ready",
      label,
      source: "Reportable book ready",
      detail: `${rowCoverage} available; a reporting snapshot has not been generated`,
      status: "Not generated",
      tone: "warn",
    };
  }

  return {
    state: "unavailable",
    label,
    source: generatedAt ? `Last generated ${generatedAt}` : "Reporting status unavailable",
    detail: generatedAt
      ? `${rowCoverage} retained; current output availability is not confirmed`
      : "Reporting snapshot availability cannot be confirmed from the current source",
    status: "Unavailable",
    tone: "danger",
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
