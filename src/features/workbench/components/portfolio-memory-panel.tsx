"use client";

import { useMemo, useState } from "react";

import {
  MetricRow,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
} from "@/design-system";
import type { DpmPortfolioMemoryGatewayResponse } from "@/features/workbench/types";
import {
  buildPortfolioMemoryPanelModel,
} from "@/features/workbench/portfolio-memory-view-model";
import {
  buildPortfolioMemoryStatePanelCopy,
  filterPortfolioMemoryEvents,
  portfolioMemoryBadgeTone,
  resolveSelectedPortfolioMemoryEvent,
  shouldShowPortfolioMemoryStatePanel,
} from "@/features/workbench/portfolio-memory-panel-helpers";
import {
  businessStateLabel,
  formatBusinessReason,
} from "@/features/workbench/manage-workspace-view-model";
import PortfolioMemoryRecommendedActionsRail from "@/features/workbench/components/portfolio-memory-recommended-actions-rail";
import PortfolioMemorySelectedEventDetail from "@/features/workbench/components/portfolio-memory-selected-event-detail";
import PortfolioMemoryTimelineCard from "@/features/workbench/components/portfolio-memory-timeline-card";

type Props = {
  response: DpmPortfolioMemoryGatewayResponse | null;
  searchResponse?: DpmPortfolioMemoryGatewayResponse | null;
  errorMessage?: string | null;
  sourceSearchErrorMessage?: string | null;
};

export default function PortfolioMemoryPanel({
  response,
  searchResponse = null,
  errorMessage = null,
  sourceSearchErrorMessage = null,
}: Props) {
  const model = buildPortfolioMemoryPanelModel(response, searchResponse);
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

      {model.sourceFacetRows.length > 0 || model.sourceBoundaryRows.length > 0 ? (
        <div className="portfolio-memory-status-strip" aria-label="Portfolio memory source facets">
          {model.sourceFacetRows.slice(0, 4).map((row) => (
            <MetricRow
              key={row.key}
              label={row.family === "system" ? "Source Owner" : "Source Type"}
              value={`${row.label} (${row.count})`}
            />
          ))}
          {model.sourceBoundaryRows.slice(0, 2).map((boundary) => (
            <MetricRow key={boundary} label="Search Boundary" value={boundary} />
          ))}
        </div>
      ) : sourceSearchErrorMessage ? (
        <div className="portfolio-memory-reason-row">
          <SemanticBadge tone="warn">Source-family posture unavailable</SemanticBadge>
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
        <PortfolioMemoryTimelineCard
          activeEventType={activeEventType}
          eventCount={model.eventCount}
          events={filteredEvents}
          selectedEventId={selectedEvent?.eventId ?? null}
          onSelectEvent={setSelectedEventId}
        />

        <PortfolioMemoryRecommendedActionsRail actions={model.recommendedActions} />
      </div>

      <PortfolioMemorySelectedEventDetail event={selectedEvent} />
    </SectionBlock>
  );
}
