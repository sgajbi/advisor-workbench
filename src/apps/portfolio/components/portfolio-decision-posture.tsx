"use client";

import { ActionLink, SemanticBadge, Text, WorkbenchRailCard } from "@/design-system";

import { formatCount, formatCurrency, formatDate, formatStatus } from "../formatters";
import type { PortfolioWorkspace } from "../types";
import type { PortfolioWorkspaceContext } from "../view-model";
import {
  getBookReadinessStatus,
  getBookReadinessSupport,
  getBookReadinessTone,
} from "../view-model";

type BadgeTone = "default" | "success" | "warn" | "danger";

export function PortfolioDecisionBand({
  workspace,
  context,
}: {
  workspace: PortfolioWorkspace;
  context: PortfolioWorkspaceContext;
}) {
  const bookStatus = getBookReadinessStatus(workspace);
  const performanceStatus = workspace.performance?.unavailable ? "Partial" : "Ready";
  const exceptionCount =
    workspace.partial_failures.length + (workspace.exception_summaries?.length ?? 0);
  const liquidityStatus = workspace.cashflow_outlook ? "Ready" : "Partial";
  const dpmStatus = workspace.rebalance?.status
    ? formatStatus(workspace.rebalance.status)
    : "No active run";

  return (
    <section className="portfolio-decision-band" aria-label="Portfolio decision posture">
      <DecisionTile
        label="Portfolio readiness"
        value={bookStatus}
        tone={toBadgeTone(getBookReadinessTone(workspace))}
        support={getBookReadinessSupport(workspace)}
        source="Book status"
      />
      <DecisionTile
        label="Exceptions"
        value={exceptionCount ? `${exceptionCount} open` : "Clear"}
        tone={exceptionCount ? "warn" : "success"}
        support={exceptionCount ? "Resolve reporting gaps before client use" : "No active portfolio blockers"}
        source="Reporting checks"
      />
      <DecisionTile
        label="Cash and liquidity"
        value={liquidityStatus}
        tone={workspace.cashflow_outlook ? "success" : "warn"}
        support={
          workspace.cashflow_outlook
            ? `${formatCurrency(
                workspace.cashflow_outlook.total_net_cashflow_base,
                workspace.portfolio.base_currency
              )} through ${formatDate(workspace.cashflow_outlook.range_end_date)}`
            : "Projected cashflow unavailable"
        }
        source="Liquidity"
      />
      <DecisionTile
        label="Performance window"
        value={performanceStatus}
        tone={workspace.performance?.unavailable ? "warn" : "success"}
        support={
          workspace.performance?.period
            ? `${workspace.performance.period} versus ${formatPortfolioBenchmark(workspace)}`
            : `Window ${context.periodLabel}`
        }
        source="Performance"
      />
      <DecisionTile
        label="DPM operations"
        value={dpmStatus}
        tone={workspace.rebalance?.status ? "success" : "default"}
        support={workspace.rebalance?.last_rebalance_run_id ?? "Portfolio-level operations posture"}
        source="Manage"
      />
    </section>
  );
}

export function PortfolioEvidenceModule({
  workspace,
  context,
}: {
  workspace: PortfolioWorkspace;
  context: PortfolioWorkspaceContext;
}) {
  const evidenceRows = [
    { label: "Review scope", value: "Summary and detailed portfolio review" },
    { label: "Review inputs", value: "Portfolio book, positions, reporting, and cashflow" },
    { label: "Benchmark", value: formatPortfolioBenchmark(workspace) },
    { label: "As-of", value: formatDate(context.selectedAsOfDate) },
    { label: "Reporting rows", value: formatCount(workspace.readiness.reporting.row_count, "row") },
  ];

  return (
    <WorkbenchRailCard className="portfolio-side-card portfolio-evidence-card">
      <div className="portfolio-evidence-header">
        <Text variant="cardTitle">Evidence and Lineage</Text>
        <SemanticBadge tone={workspace.partial_failures.length ? "warn" : "success"}>
          {workspace.partial_failures.length ? "Partial" : "Ready"}
        </SemanticBadge>
      </div>
      <div className="portfolio-evidence-list">
        {evidenceRows.map((row) => (
          <div key={row.label} className="portfolio-evidence-row">
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
      <div className="portfolio-workflow-entry-list" aria-label="Adjacent governed workflows">
        <ActionLink href={buildPortfolioModeHref(workspace, "summary")}>Performance</ActionLink>
        <ActionLink href={buildPortfolioModeHref(workspace, "risk")}>Risk</ActionLink>
        <ActionLink href={buildPortfolioModeHref(workspace, "advisor")}>Advisor Brief</ActionLink>
        <ActionLink href={buildPortfolioModeHref(workspace, "evidence")}>Evidence</ActionLink>
        <ActionLink href={`/workbench/${encodeURIComponent(workspace.portfolio.portfolio_id)}`}>
          DPM Operations
        </ActionLink>
        <ActionLink href="/data-products">Data Products</ActionLink>
      </div>
    </WorkbenchRailCard>
  );
}

function DecisionTile({
  label,
  value,
  support,
  source,
  tone,
}: {
  label: string;
  value: string;
  support: string;
  source: string;
  tone: BadgeTone;
}) {
  return (
    <div className="portfolio-decision-tile">
      <span className="portfolio-decision-label">{label}</span>
      <div className="portfolio-decision-value-row">
        <SemanticBadge tone={tone}>{value}</SemanticBadge>
        <span>{source}</span>
      </div>
      <p>{support}</p>
    </div>
  );
}

function toBadgeTone(tone: "neutral" | "success" | "warn" | "danger"): BadgeTone {
  return tone === "neutral" ? "default" : tone;
}

function formatPortfolioBenchmark(workspace: PortfolioWorkspace): string {
  return (
    workspace.performance?.benchmark_label ??
    workspace.performance?.benchmark_code ??
    "Assigned benchmark"
  );
}

function buildPortfolioModeHref(
  workspace: PortfolioWorkspace,
  mode: "summary" | "risk" | "advisor" | "evidence"
): string {
  const query = new URLSearchParams({
    portfolioId: workspace.portfolio.portfolio_id,
    period: workspace.performance?.period ?? "YTD",
    detailBasis: "NET",
    contributionDimension: "asset_class",
    attributionDimension: "asset_class",
    chartFrequency: "monthly",
  });
  if (mode !== "summary") {
    query.set("mode", mode);
  }
  if (workspace.performance?.benchmark_code) {
    query.set("benchmark", workspace.performance.benchmark_code);
  }
  return `/performance?${query.toString()}`;
}
