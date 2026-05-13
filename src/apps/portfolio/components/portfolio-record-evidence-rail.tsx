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
          <SourcePosture
            label="Pricing Source"
            source="Gateway portfolio workspace"
            detail={
              unpricedCount
                ? `${formatCount(unpricedCount, "holding")} missing price or valuation`
                : "All visible holdings have price and valuation data"
            }
            tone={unpricedCount ? "warn" : "success"}
            status={unpricedCount ? "Partial" : "Verified"}
          />
          <SourcePosture
            label="Positions Ledger"
            source="Core positions inventory"
            detail={`${formatCount(workspace.positions.length, "position")} loaded for ${portfolioId}`}
            tone={workspace.readiness.has_positions ? "success" : "default"}
            status={workspace.readiness.has_positions ? "Reconciled" : "Empty"}
          />
          <SourcePosture
            label="Reporting Snapshot"
            source={
              workspace.readiness.reporting.generated_at_utc
                ? formatDate(workspace.readiness.reporting.generated_at_utc)
                : "Not generated"
            }
            detail={`${formatCount(workspace.readiness.reporting.row_count, "row")} in latest reportable book`}
            tone={reportingReady ? "success" : "warn"}
            status={formatStatus(workspace.readiness.reporting.status)}
          />
          <SourcePosture
            label="Reprocessing"
            source="Portfolio operations"
            detail={
              reprocessingCount || staleCount
                ? `${formatCount(reprocessingCount, "flag")} on positions, ${formatCount(staleCount, "stale key")}`
                : "No position-level reprocessing flags in the visible inventory"
            }
            tone={staleCount ? "warn" : "success"}
            status={staleCount ? "Review" : "Clear"}
          />
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

function EvidenceFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="portfolio-record-evidence-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SourcePosture({
  label,
  source,
  detail,
  status,
  tone,
}: {
  label: string;
  source: string;
  detail: string;
  status: string;
  tone: EvidenceTone;
}) {
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
