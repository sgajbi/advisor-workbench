"use client";

import { ActionLink, SemanticBadge, Text, WorkbenchRailCard } from "@/design-system";

import { formatCount, formatDate, formatStatus } from "../formatters";
import type { PortfolioRecordScreenKind } from "../portfolio-record-screen-view-model";
import type { PortfolioWorkspace } from "../types";

type EvidenceTone = "default" | "success" | "warn" | "danger";

export default function PortfolioRecordEvidenceRail({
  screen,
  workspace,
}: {
  screen: PortfolioRecordScreenKind;
  workspace: PortfolioWorkspace;
}) {
  const portfolioId = workspace.portfolio.portfolio_id;
  const unpricedCount = workspace.positions.filter(
    (position) => position.market_price == null || position.market_value_base == null
  ).length;
  const reprocessingCount = workspace.positions.filter((position) => position.reprocessing_status).length;
  const staleCount =
    workspace.operations?.stale_reprocessing_keys ??
    workspace.positions.filter((position) =>
      (position.reprocessing_status ?? "").toLowerCase().includes("stale")
    ).length;
  const reportingReady = workspace.readiness.reporting.status?.toUpperCase() === "READY";
  const sourcePostureItems =
    screen === "transactions"
      ? buildTransactionSourcePosture(workspace, portfolioId)
      : screen === "cashflow"
        ? buildCashflowSourcePosture(workspace)
      : buildPositionSourcePosture({
          workspace,
          portfolioId,
          unpricedCount,
          reprocessingCount,
          staleCount,
          reportingReady,
        });

  return (
    <div className="portfolio-record-evidence-rail" aria-label="Portfolio record data governance">
      <WorkbenchRailCard className="portfolio-record-evidence-card">
        <div className="portfolio-record-evidence-header">
          <div>
            <Text variant="label">Data Governance</Text>
            <Text variant="cardTitle">Evidence and Lineage</Text>
          </div>
          <SemanticBadge tone={workspace.partial_failures.length ? "warn" : "success"}>
            {workspace.partial_failures.length ? "Partial" : "Ready"}
          </SemanticBadge>
        </div>
        <div className="portfolio-record-evidence-context">
          <EvidenceFact label="Portfolio ID" value={portfolioId} />
          <EvidenceFact label="Client ID" value={workspace.portfolio.client_id ?? "N/A"} />
          <EvidenceFact label="Base Currency" value={workspace.portfolio.base_currency} />
          <EvidenceFact label="Screen" value={formatStatus(screen)} />
        </div>
      </WorkbenchRailCard>

      <WorkbenchRailCard className="portfolio-record-evidence-card">
        <Text variant="label">Source Posture</Text>
        <div className="portfolio-record-source-list">
          {sourcePostureItems.map((item) => (
            <SourcePosture key={item.label} {...item} />
          ))}
        </div>
      </WorkbenchRailCard>

      <WorkbenchRailCard className="portfolio-record-evidence-card">
        <Text variant="label">Adjacent Workflows</Text>
        <div className="portfolio-record-evidence-actions">
          <ActionLink href={`/portfolio?portfolioId=${encodeURIComponent(portfolioId)}`}>
            Portfolio Summary
          </ActionLink>
          <ActionLink href={`/transactions?portfolioId=${encodeURIComponent(portfolioId)}`}>
            Transactions
          </ActionLink>
          <ActionLink href={`/cashflow?portfolioId=${encodeURIComponent(portfolioId)}`}>
            Cashflow
          </ActionLink>
          <ActionLink href={`/workbench/${encodeURIComponent(portfolioId)}`}>
            DPM Operations
          </ActionLink>
        </div>
      </WorkbenchRailCard>
    </div>
  );
}

function buildCashflowSourcePosture(workspace: PortfolioWorkspace): SourcePostureProps[] {
  const cashflow = workspace.cashflow_outlook;
  const pointCount = cashflow?.upcoming_points.length ?? 0;
  const positiveCount =
    cashflow?.upcoming_points.filter((point) => point.net_cashflow_base > 0).length ?? 0;
  const negativeCount =
    cashflow?.upcoming_points.filter((point) => point.net_cashflow_base < 0).length ?? 0;
  const reportingReady = workspace.readiness.reporting.status?.toUpperCase() === "READY";

  return [
    {
      label: "Projection Source",
      source: "Gateway portfolio workspace",
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
  unpricedCount,
  reprocessingCount,
  staleCount,
  reportingReady,
}: {
  workspace: PortfolioWorkspace;
  portfolioId: string;
  unpricedCount: number;
  reprocessingCount: number;
  staleCount: number;
  reportingReady: boolean;
}): SourcePostureProps[] {
  return [
    {
      label: "Pricing Source",
      source: "Gateway portfolio workspace",
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
  portfolioId: string
): SourcePostureProps[] {
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
  const reportingReady = workspace.readiness.reporting.status?.toUpperCase() === "READY";
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
): SourcePostureProps {
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

function EvidenceFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="portfolio-record-evidence-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

type SourcePostureProps = {
  label: string;
  source: string;
  detail: string;
  status: string;
  tone: EvidenceTone;
};

function SourcePosture({
  label,
  source,
  detail,
  status,
  tone,
}: SourcePostureProps) {
  return (
    <div className="portfolio-record-source-item">
      <div className="portfolio-record-source-copy">
        <span>{label}</span>
        <strong>{source}</strong>
        <p>{detail}</p>
      </div>
      <SemanticBadge tone={tone}>{status}</SemanticBadge>
    </div>
  );
}
