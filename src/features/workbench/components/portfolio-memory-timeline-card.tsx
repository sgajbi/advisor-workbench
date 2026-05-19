"use client";

import { ActionButton, AnalyticsTable, SemanticBadge, Text } from "@/design-system";
import { portfolioMemoryEvidenceAvailability } from "@/features/workbench/portfolio-memory-panel-helpers";
import type { PortfolioMemoryEventRow } from "@/features/workbench/portfolio-memory-view-model";

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
    <div className="portfolio-memory-timeline-card">
      <div className="portfolio-memory-card-header">
        <Text as="h3" variant="subsectionTitle">
          Historical Event Log
        </Text>
        <span>{eventCount} events</span>
      </div>
      <AnalyticsTable
        ariaLabel="Portfolio memory event timeline"
        variant="analysis"
        density="compact"
        columns={[
          { key: "time", label: "Date/Time" },
          { key: "event", label: "Event" },
          { key: "category", label: "Category" },
          { key: "impact", label: "Business Impact" },
          { key: "evidence", label: "Evidence" },
          { key: "action", label: "Action", align: "right" },
        ]}
        rows={events.map((row) => ({
          key: row.key,
          className:
            selectedEventId === row.eventId
              ? "portfolio-memory-selected-row"
              : undefined,
          ariaLabel: row.displayId,
          onClick: () => onSelectEvent(row.eventId),
          cells: [
            row.eventTime,
            <strong key={`${row.key}-event`} className="portfolio-memory-event-title">
              {row.eventLabel}
            </strong>,
            row.category,
            row.businessImpact,
            <SemanticBadge
              key={`${row.key}-evidence`}
              tone={row.artifactRefCount > 0 ? "success" : "default"}
            >
              {portfolioMemoryEvidenceAvailability(row.artifactRefs)}
            </SemanticBadge>,
            <ActionButton
              key={`${row.key}-action`}
              priority="quiet"
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
