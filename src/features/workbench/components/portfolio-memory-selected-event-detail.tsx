"use client";

import { businessStateLabel, formatBusinessReason } from "@/copy/business-state-copy";
import { SemanticBadge, Text } from "@/design-system";
import {
  buildPortfolioMemoryFallbackSnapshotRows,
  portfolioMemoryBadgeTone,
  portfolioMemoryReviewPosture,
} from "@/features/workbench/portfolio-memory-panel-helpers";
import type { PortfolioMemoryEventRow } from "@/features/workbench/portfolio-memory-view-model";
import styles from "@/features/workbench/components/portfolio-memory-panel.module.css";

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
    <div className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <Text as="h3" variant="subsectionTitle">
          Details: {event?.eventLabel ?? "No event selected"}
        </Text>
        <SemanticBadge tone={portfolioMemoryBadgeTone(event?.status ?? "N/A")}>
          {businessStateLabel(event?.status ?? "N/A")}
        </SemanticBadge>
      </div>
      <div className={styles.detailGrid}>
        <div className={styles.detailNarrative}>
          <Text as="h4" variant="dataLabel">
            Business Context
          </Text>
          <p>{event?.summary ?? "No memory event selected."}</p>
          <div className={styles.artifactGrid}>
            <ArtifactPill label="Mandate health check" enabled={Boolean(event)} />
            <ArtifactPill label="Rebalance simulation" enabled={event?.category === "Rebalance"} />
            <ArtifactPill label="Evidence pack" enabled={(event?.artifactRefCount ?? 0) > 0} />
            <ArtifactPill label="Outcome review" enabled={event?.category === "Outcome Review"} />
          </div>
        </div>
        <div className={styles.snapshot}>
          <Text as="h4" variant="dataLabel" className={styles.snapshotLabel}>
            Support Snapshot
          </Text>
          <div className={styles.snapshotRows}>
            {snapshotRows.map((row) => (
              <DetailCell key={row.key} label={row.label} value={row.value} />
            ))}
          </div>
          <div className={styles.readinessCallout}>
            <strong className={styles.readinessLabel}>Review Posture</strong>
            <span className={styles.readinessPosture}>
              {portfolioMemoryReviewPosture(event?.status ?? "N/A")}
            </span>
            <small className={styles.readinessReason}>{reasonCodeCopy}</small>
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
    <div className={styles.detailCell}>
      <span className={styles.detailLabel}>{label}</span>
      <strong className={styles.detailValue}>{value}</strong>
    </div>
  );
}

function ArtifactPill({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span
      className={
        enabled
          ? `${styles.artifactPill} ${styles.artifactPillEnabled}`
          : styles.artifactPill
      }
    >
      {label}
    </span>
  );
}
