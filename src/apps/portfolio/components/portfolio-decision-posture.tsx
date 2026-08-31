"use client";

import { ActionLink, SemanticBadge, Text, WorkbenchRailCard } from "@/design-system";

import { formatCount, formatDate } from "../formatters";
import { PORTFOLIO_VALUATION_DATE_LABEL } from "../portfolio-terminology";
import type { PortfolioWorkspace } from "../types";
import type { PortfolioWorkspaceContext } from "../view-model";

export function PortfolioEvidenceModule({
  workspace,
  context,
}: {
  workspace: PortfolioWorkspace;
  context: PortfolioWorkspaceContext;
}) {
  const evidenceRows = [
    { label: "Review scope", value: "Portfolio decision review" },
    { label: "Evidence", value: formatPortfolioEvidence(workspace) },
    { label: "Benchmark", value: formatPortfolioBenchmark(workspace) },
    ...(context.selectedAsOfDate !== workspace.as_of_date
      ? [
          {
            label: PORTFOLIO_VALUATION_DATE_LABEL,
            value: formatDate(workspace.as_of_date),
          },
        ]
      : []),
    { label: "Reporting coverage", value: formatCount(workspace.readiness.reporting.row_count, "row") },
  ];

  return (
    <WorkbenchRailCard className="portfolio-side-card portfolio-evidence-card">
      <div className="portfolio-evidence-header">
        <Text variant="cardTitle">Review Evidence</Text>
        {workspace.partial_failures.length ? (
          <SemanticBadge tone="warn">Partial</SemanticBadge>
        ) : null}
      </div>
      <div className="portfolio-evidence-list">
        {evidenceRows.map((row) => (
          <div key={row.label} className="portfolio-evidence-row">
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
      <div className="portfolio-workflow-entry-list" aria-label="Related portfolio workflows">
        <ActionLink href={buildPortfolioModeHref(workspace, context, "summary")}>Performance</ActionLink>
        <ActionLink href={buildPortfolioModeHref(workspace, context, "risk")}>Risk</ActionLink>
        <ActionLink href={buildPortfolioModeHref(workspace, context, "advisor")}>Advisor Brief</ActionLink>
        <ActionLink href={buildPortfolioModeHref(workspace, context, "evidence")}>Evidence</ActionLink>
        <ActionLink href={`/workbench/${encodeURIComponent(workspace.portfolio.portfolio_id)}`}>
          Mandate Operations
        </ActionLink>
        <ActionLink href="/data-products">Source Catalog</ActionLink>
      </div>
    </WorkbenchRailCard>
  );
}

function formatPortfolioBenchmark(workspace: PortfolioWorkspace): string {
  return (
    workspace.performance?.benchmark_label ??
    workspace.performance?.benchmark_code ??
    "Not supplied"
  );
}

function formatPortfolioEvidence(workspace: PortfolioWorkspace): string {
  const sources = ["Portfolio book"];
  if (workspace.performance) {
    sources.push("Performance");
  }
  if (workspace.cashflow_outlook) {
    sources.push("Cashflow");
  }
  if (workspace.readiness.reporting.row_count) {
    sources.push("Reporting");
  }
  return sources.join(", ");
}

function buildPortfolioModeHref(
  workspace: PortfolioWorkspace,
  context: PortfolioWorkspaceContext,
  mode: "summary" | "risk" | "advisor" | "evidence"
): string {
  const query = new URLSearchParams({
    portfolioId: workspace.portfolio.portfolio_id,
    period: workspace.performance?.period ?? "YTD",
    detailBasis: "NET",
    contributionDimension: "asset_class",
    attributionDimension: "asset_class",
    chartFrequency: "monthly",
    asOfDate: context.selectedAsOfDate,
    reportingCurrency: context.selectedReportingCurrency,
  });
  if (mode !== "summary") {
    query.set("mode", mode);
  }
  if (workspace.performance?.benchmark_code) {
    query.set("benchmark", workspace.performance.benchmark_code);
  }
  return `/performance?${query.toString()}`;
}
