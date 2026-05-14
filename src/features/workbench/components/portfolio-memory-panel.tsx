"use client";

import { useMemo, useState } from "react";

import {
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
  type PortfolioMemoryPanelState,
} from "@/features/workbench/portfolio-memory-view-model";
import {
  businessStateLabel,
  formatBusinessReason,
  formatBusinessSource,
} from "@/features/workbench/manage-workspace-view-model";

type Props = {
  response: DpmPortfolioMemoryGatewayResponse | null;
  errorMessage?: string | null;
};

function badgeTone(state: string): "default" | "success" | "warn" | "danger" {
  const normalized = state.toUpperCase();
  if (normalized === "READY" || normalized === "COMPLETE" || normalized === "SUPPORTED") {
    return "success";
  }
  if (normalized === "PARTIAL" || normalized === "DEGRADED" || normalized === "EMPTY" || normalized === "UNKNOWN") {
    return "warn";
  }
  if (normalized === "BLOCKED" || normalized === "UNSUPPORTED" || normalized === "UNAVAILABLE") {
    return "danger";
  }
  return "default";
}

function statePanelCopy(state: PortfolioMemoryPanelState) {
  if (state === "empty") {
    return {
      kind: "empty" as const,
      title: "No portfolio memory events returned",
      body: "No portfolio memory timeline is currently available for this portfolio.",
    };
  }
  if (state === "partial") {
    return {
      kind: "partial" as const,
      title: "Portfolio memory is partial",
      body: "Some rebalance, evidence, or review events are not yet available.",
    };
  }
  if (state === "unsupported") {
    return {
      kind: "unavailable" as const,
      title: "Portfolio memory is not supported",
      body: "Portfolio memory is not available for the selected portfolio.",
    };
  }
  return {
    kind: "partial" as const,
    title: "Portfolio memory is unavailable",
    body: "Portfolio memory is temporarily unavailable.",
  };
}

export default function PortfolioMemoryPanel({ response, errorMessage = null }: Props) {
  const model = buildPortfolioMemoryPanelModel(response);
  const [activeEventType, setActiveEventType] = useState<string>("ALL");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const filteredEvents = useMemo(
    () =>
      activeEventType === "ALL"
        ? model.events
        : model.events.filter((event) => event.eventType === activeEventType),
    [activeEventType, model.events],
  );
  const selectedEvent =
    filteredEvents.find((event) => event.eventId === selectedEventId) ??
    filteredEvents[0] ??
    model.selectedEvent;
  const shouldShowStatePanel =
    Boolean(errorMessage) ||
    model.state === "empty" ||
    model.state === "partial" ||
    model.state === "unsupported" ||
    model.state === "unavailable";
  const stateCopy = statePanelCopy(model.state);

  return (
    <SectionBlock
      title="Portfolio Memory"
      subtitle="Mandate activity, evidence, and review history for this portfolio."
      className="portfolio-memory-panel"
      actions={
        <div className="portfolio-memory-badge-row">
          <SemanticBadge tone={badgeTone(model.supportabilityState)}>
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
        <MetricRow label="Portfolio" value={model.portfolioId} />
        <MetricRow label="Events" value={model.eventCount} />
        <MetricRow label="Latest Event" value={model.latestEventTime} />
        <MetricRow label="Business Areas" value={formatSourceList(model.sourceSystems)} />
        <MetricRow label="Evidence Items" value={model.artifactRefCount} />
        <MetricRow
          label="State"
          value={
            <SemanticBadge tone={badgeTone(model.supportabilityState)}>
              {businessStateLabel(model.supportabilityState)}
            </SemanticBadge>
          }
        />
      </div>

      {model.reasonCodes.length > 0 ? (
        <div className="portfolio-memory-reason-row">
          {model.reasonCodes.map((reason) => (
            <SemanticBadge key={reason} tone={badgeTone(reason)}>
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

      <AnalyticsTable
        ariaLabel="Portfolio memory event timeline"
        variant="analysis"
        density="compact"
        columns={[
          { key: "id", label: "Event ID" },
          { key: "type", label: "Event Type" },
          { key: "time", label: "Timestamp" },
          { key: "summary", label: "Summary" },
          { key: "status", label: "Status" },
          { key: "artifact-refs", label: "Artifact" },
        ]}
        rows={filteredEvents.map((row) => ({
          key: row.key,
          className: selectedEvent?.eventId === row.eventId ? "portfolio-memory-selected-row" : undefined,
          ariaLabel: `Portfolio memory event ${row.eventId}`,
          onClick: () => setSelectedEventId(row.eventId),
          cells: [
            <strong key={`${row.key}-id`} className="portfolio-memory-event-id">
              {row.eventId}
            </strong>,
            <SemanticBadge key={`${row.key}-type`}>{businessStateLabel(row.eventType)}</SemanticBadge>,
            row.eventTime,
            row.summary,
            <SemanticBadge key={`${row.key}-status`} tone={badgeTone(row.status)}>
              {businessStateLabel(row.status)}
            </SemanticBadge>,
            evidenceAvailability(row.artifactRefs),
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

      <SelectedEventDetail event={selectedEvent} contentHash={model.contentHash} />
    </SectionBlock>
  );
}

function SelectedEventDetail({
  event,
  contentHash,
}: {
  event: PortfolioMemoryEventRow | null;
  contentHash: string;
}) {
  return (
    <div className="portfolio-memory-detail-panel">
      <div className="portfolio-memory-detail-header">
        <Text as="h3" variant="subsectionTitle">
          Selected Event: {event?.eventId ?? "N/A"}
        </Text>
      </div>
      <div className="portfolio-memory-detail-grid">
        <DetailCell
          label="Summary"
          value={event?.summary ?? "N/A"}
          detail={formatBusinessReason(event?.reasonCodes ?? "N/A")}
        />
        <DetailCell
          label="Evidence"
          value={evidenceAvailability(event?.artifactRefs ?? "N/A")}
          detail={auditAvailability(event?.contentHash ?? contentHash)}
        />
        <DetailCell
          label="Business Area"
          value={formatSourceList(event?.sourceSystems ?? "N/A")}
          detail={event?.sourceRefs !== "N/A" ? "Reference available" : "Reference not available"}
        />
        <DetailCell
          label="Audit Verification"
          value={businessStateLabel(event?.status ?? "N/A")}
          detail={auditAvailability(contentHash)}
        />
      </div>
    </div>
  );
}

function DetailCell({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="portfolio-memory-detail-cell">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function formatSourceList(value: string): string {
  if (!value || value === "N/A") {
    return "Operations";
  }
  return value
    .split(",")
    .map((source) => formatBusinessSource(source.trim()))
    .filter(Boolean)
    .join(", ");
}

function auditAvailability(value: string): string {
  return value && value !== "N/A" ? "Audit reference available" : "Audit reference not available";
}

function evidenceAvailability(value: string): string {
  return value && value !== "N/A" ? "Available" : "Not available";
}
