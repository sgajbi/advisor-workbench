"use client";

import { useMemo, useState } from "react";

import {
  ActionButton,
  AnalyticsTable,
  MetricRow,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  Text,
} from "@/design-system";
import type { DpmPortfolioMemoryGatewayResponse } from "@/features/workbench/types";
import {
  buildPortfolioMemoryPanelModel,
  type PortfolioMemoryEventRow,
} from "@/features/workbench/portfolio-memory-view-model";
import {
  buildPortfolioMemoryFallbackSnapshotRows,
  buildPortfolioMemoryStatePanelCopy,
  filterPortfolioMemoryEvents,
  portfolioMemoryBadgeTone,
  portfolioMemoryEvidenceAvailability,
  portfolioMemoryReviewPosture,
  resolveSelectedPortfolioMemoryEvent,
  shouldShowPortfolioMemoryStatePanel,
} from "@/features/workbench/portfolio-memory-panel-helpers";
import {
  businessStateLabel,
  formatBusinessReason,
} from "@/features/workbench/manage-workspace-view-model";

type Props = {
  response: DpmPortfolioMemoryGatewayResponse | null;
  errorMessage?: string | null;
};

export default function PortfolioMemoryPanel({ response, errorMessage = null }: Props) {
  const model = buildPortfolioMemoryPanelModel(response);
  const [activeEventType, setActiveEventType] = useState<string>("ALL");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const filteredEvents = useMemo(
    () => filterPortfolioMemoryEvents(model.events, activeEventType),
    [activeEventType, model.events],
  );
  const selectedEvent = resolveSelectedPortfolioMemoryEvent({
    filteredEvents,
    selectedEventId,
    fallbackEvent: model.selectedEvent,
  });
  const shouldShowStatePanel = shouldShowPortfolioMemoryStatePanel(
    model.state,
    errorMessage,
  );
  const stateCopy = buildPortfolioMemoryStatePanelCopy(model.state);

  return (
    <SectionBlock
      title="Portfolio Memory"
      subtitle="Mandate activity, evidence, and review history for this portfolio."
      className="portfolio-memory-panel"
      actions={
        <div className="portfolio-memory-badge-row">
          <SemanticBadge tone={portfolioMemoryBadgeTone(model.supportabilityState)}>
            {businessStateLabel(model.supportabilityState)}
          </SemanticBadge>
          <SemanticBadge>Audit trail available</SemanticBadge>
        </div>
      }
    >
      {shouldShowStatePanel ? (
        <ScreenStatePanel
          kind={errorMessage ? "partial" : stateCopy.kind}
          surface="portfolio"
          title={errorMessage ? "Portfolio memory is unavailable" : stateCopy.title}
          body={errorMessage ?? stateCopy.body}
        />
      ) : null}

      <div className="portfolio-memory-status-strip">
        <MetricRow label="Latest Memory Event" value={model.latestMemoryEvent} />
        <MetricRow label="Memory Coverage" value={model.memoryCoverage} />
        <MetricRow label="Open Follow-ups" value={model.openFollowUps} />
        <MetricRow label="Evidence Links" value={model.evidenceLinks} />
      </div>

      {model.reasonCodes.length > 0 ? (
        <div className="portfolio-memory-reason-row">
          {model.reasonCodes.map((reason) => (
            <SemanticBadge key={reason} tone={portfolioMemoryBadgeTone(reason)}>
              {formatBusinessReason(reason)}
            </SemanticBadge>
          ))}
        </div>
      ) : null}

      <div className="portfolio-memory-filter-row" aria-label="Portfolio memory event filters">
        <button
          type="button"
          className={activeEventType === "ALL" ? "is-active" : undefined}
          onClick={() => setActiveEventType("ALL")}
        >
          All
          <span>{model.eventCount}</span>
        </button>
        {model.eventTypeRows.map((row) => (
          <button
            type="button"
            key={row.key}
            className={activeEventType === row.eventType ? "is-active" : undefined}
            onClick={() => {
              setActiveEventType(row.eventType);
              setSelectedEventId(null);
            }}
          >
            {businessStateLabel(row.eventType)}
            <span>{row.count}</span>
          </button>
        ))}
      </div>

      <div className="portfolio-memory-workspace">
        <div className="portfolio-memory-timeline-card">
          <div className="portfolio-memory-card-header">
            <Text as="h3" variant="subsectionTitle">
              Historical Event Log
            </Text>
            <span>{model.eventCount} events</span>
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
            rows={filteredEvents.map((row) => ({
              key: row.key,
              className: selectedEvent?.eventId === row.eventId ? "portfolio-memory-selected-row" : undefined,
              ariaLabel: row.displayId,
              onClick: () => setSelectedEventId(row.eventId),
              cells: [
                row.eventTime,
                <strong key={`${row.key}-event`} className="portfolio-memory-event-title">
                  {row.eventLabel}
                </strong>,
                row.category,
                row.businessImpact,
                <SemanticBadge key={`${row.key}-evidence`} tone={row.artifactRefCount > 0 ? "success" : "default"}>
                  {portfolioMemoryEvidenceAvailability(row.artifactRefs)}
                </SemanticBadge>,
                <ActionButton
                  key={`${row.key}-action`}
                  priority="quiet"
                  onClick={() => setSelectedEventId(row.eventId)}
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

        <aside className="portfolio-memory-actions-card">
          <Text as="h3" variant="subsectionTitle">
            Recommended Actions
          </Text>
          <div className="portfolio-memory-action-stack">
            {model.recommendedActions.map((action) => (
              <button type="button" key={action.key}>
                <span className="material-symbols-outlined" aria-hidden="true">{action.icon}</span>
                <strong>{action.title}</strong>
                <small>{action.body}</small>
              </button>
            ))}
          </div>
        </aside>
      </div>

      <SelectedEventDetail event={selectedEvent} />
    </SectionBlock>
  );
}

function SelectedEventDetail({
  event,
}: {
  event: PortfolioMemoryEventRow | null;
}) {
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
            {(event?.metadataRows.length ? event.metadataRows : buildPortfolioMemoryFallbackSnapshotRows(event)).map((row) => (
              <DetailCell key={row.key} label={row.label} value={row.value} />
            ))}
          </div>
          <div className="portfolio-memory-readiness-callout">
            <strong>Review Posture</strong>
            <span>{portfolioMemoryReviewPosture(event?.status ?? "N/A")}</span>
            <small>
              {event?.reasonCodes !== "N/A"
                ? formatBusinessReason(event?.reasonCodes ?? "N/A")
                : "No additional reason code returned."}
            </small>
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
  return (
    <span className={enabled ? "is-enabled" : undefined}>
      {label}
    </span>
  );
}
