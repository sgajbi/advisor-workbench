"use client";

import { ActionButton, AnalyticsTable, SemanticBadge, Text } from "@/design-system";
import { portfolioMemoryEvidenceAvailability } from "@/features/workbench/portfolio-memory-panel-helpers";
import type { PortfolioMemoryEventRow } from "@/features/workbench/portfolio-memory-view-model";
import styles from "@/features/workbench/components/portfolio-memory-panel.module.css";

type Props = {
  activeEventType: string;
  eventCount: string;
  events: PortfolioMemoryEventRow[];
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
};

export default function PortfolioMemoryTimelineCard({
  activeEventType,
  eventCount,
  events,
  selectedEventId,
  onSelectEvent,
}: Props) {
  return (
    <div className={styles.timelineCard}>
      <div className={styles.cardHeader}>
        <Text as="h3" variant="subsectionTitle">
          Historical Event Log
        </Text>
        <span className={styles.cardCount}>{eventCount} events</span>
      </div>
      <AnalyticsTable
        ariaLabel="Portfolio memory event timeline"
        className={styles.table}
        variant="analysis"
        density="compact"
        tableMinWidth={770}
        columns={[
          { key: "time", label: "Date/Time", width: 140 },
          { key: "event", label: "Event", width: 180 },
          { key: "category", label: "Category", width: 130 },
          { key: "impact", label: "Business Impact", width: 160 },
          { key: "evidence", label: "Evidence", width: 90 },
          { key: "action", label: "Action", align: "right", width: 70 },
        ]}
        rows={events.map((row) => ({
          key: row.key,
          className:
            selectedEventId === row.eventId
              ? styles.selectedRow
              : undefined,
          ariaLabel: row.displayId,
          onClick: () => onSelectEvent(row.eventId),
          cells: [
            <span key={`${row.key}-time`} className={styles.tableText}>
              {row.eventTime}
            </span>,
            <strong key={`${row.key}-event`} className={styles.eventTitle}>
              {row.eventLabel}
            </strong>,
            <span key={`${row.key}-category`} className={styles.tableText}>
              {row.category}
            </span>,
            <span key={`${row.key}-impact`} className={styles.tableText}>
              {row.businessImpact}
            </span>,
            <SemanticBadge
              key={`${row.key}-evidence`}
              tone={row.artifactRefCount > 0 ? "success" : "default"}
            >
              {portfolioMemoryEvidenceAvailability(row.artifactRefs)}
            </SemanticBadge>,
            <ActionButton
              key={`${row.key}-action`}
              priority="quiet"
              className={styles.rowAction}
              onClick={() => onSelectEvent(row.eventId)}
            >
              {row.actionLabel}
            </ActionButton>,
          ],
        }))}
        emptyState={{
          title: "No memory events returned",
          body:
            activeEventType === "ALL"
              ? "No timeline rows are currently available."
              : "No events are available for this event type.",
        }}
      />
    </div>
  );
}
