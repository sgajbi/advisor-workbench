"use client";

import { ActionLink, SemanticBadge, Text, WorkbenchRailCard } from "@/design-system";

import { formatCount, formatDate } from "../formatters";
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
    { label: "Sources", value: "Book, holdings, reporting, and cashflow" },
    { label: "Benchmark", value: formatPortfolioBenchmark(workspace) },
    { label: "As-of", value: formatDate(context.selectedAsOfDate) },
    { label: "Reporting coverage", value: formatCount(workspace.readiness.reporting.row_count, "row") },
  ];

  return (
    <WorkbenchRailCard className="portfolio-side-card portfolio-evidence-card">
      <div className="portfolio-evidence-header">
        <Text variant="cardTitle">Review Evidence</Text>
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
