"use client";

import { SemanticBadge, Text } from "@/design-system";
import {
  buildPortfolioMemoryFallbackSnapshotRows,
  portfolioMemoryBadgeTone,
  portfolioMemoryReviewPosture,
} from "@/features/workbench/portfolio-memory-panel-helpers";
import type { PortfolioMemoryEventRow } from "@/features/workbench/portfolio-memory-view-model";
import {
  businessStateLabel,
  formatBusinessReason,
} from "@/features/workbench/manage-workspace-view-model";

type Props = {
  event: PortfolioMemoryEventRow | null;
};

export default function PortfolioMemorySelectedEventDetail({ event }: Props) {
  const snapshotRows = event?.metadataRows.length
    ? event.metadataRows
    : buildPortfolioMemoryFallbackSnapshotRows(event);
  const reasonCodeCopy =
    event?.reasonCodes && event.reasonCodes !== "N/A"
      ? formatBusinessReason(event.reasonCodes)
      : "No additional reason code returned.";

  return (
    <div className="portfolio-memory-detail-panel">
      <div className="portfolio-memory-detail-header">
        <Text as="h3" variant="subsectionTitle">
          Details: {event?.eventLabel ?? "No event selected"}
        </Text>
        <SemanticBadge tone={portfolioMemoryBadgeTone(event?.status ?? "N/A")}>
          {businessStateLabel(event?.status ?? "N/A")}
        </SemanticBadge>
      </div>
      <div className="portfolio-memory-detail-grid">
        <div className="portfolio-memory-detail-narrative">
          <Text as="h4" variant="dataLabel">
            Business Context
          </Text>
          <p>{event?.summary ?? "No memory event selected."}</p>
          <div className="portfolio-memory-artifact-grid">
            <ArtifactPill label="Mandate health check" enabled={Boolean(event)} />
            <ArtifactPill label="Rebalance simulation" enabled={event?.category === "Rebalance"} />
            <ArtifactPill label="Evidence pack" enabled={(event?.artifactRefCount ?? 0) > 0} />
            <ArtifactPill label="Outcome review" enabled={event?.category === "Outcome Review"} />
          </div>
          <label className="portfolio-memory-note-box">
            <span>Decision Notes</span>
            <textarea placeholder="Add advisor rationale here..." />
          </label>
        </div>
        <div className="portfolio-memory-detail-snapshot">
          <Text as="h4" variant="dataLabel">
            Support Snapshot
          </Text>
          <div>
            {snapshotRows.map((row) => (
              <DetailCell key={row.key} label={row.label} value={row.value} />
            ))}
          </div>
          <div className="portfolio-memory-readiness-callout">
            <strong>Review Posture</strong>
            <span>{portfolioMemoryReviewPosture(event?.status ?? "N/A")}</span>
            <small>{reasonCodeCopy}</small>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="portfolio-memory-detail-cell">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ArtifactPill({ label, enabled }: { label: string; enabled: boolean }) {
  return <span className={enabled ? "is-enabled" : undefined}>{label}</span>;
}
