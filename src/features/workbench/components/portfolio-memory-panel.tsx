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
} from "@/features/workbench/portfolio-memory-view-model";
import {
  buildPortfolioMemoryStatePanelCopy,
  filterPortfolioMemoryEvents,
  portfolioMemoryBadgeTone,
  portfolioMemoryEvidenceAvailability,
  resolveSelectedPortfolioMemoryEvent,
  shouldShowPortfolioMemoryStatePanel,
} from "@/features/workbench/portfolio-memory-panel-helpers";
import {
  businessStateLabel,
  formatBusinessReason,
} from "@/features/workbench/manage-workspace-view-model";
import PortfolioMemorySelectedEventDetail from "@/features/workbench/components/portfolio-memory-selected-event-detail";

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

      <PortfolioMemorySelectedEventDetail event={selectedEvent} />
    </SectionBlock>
  );
}
