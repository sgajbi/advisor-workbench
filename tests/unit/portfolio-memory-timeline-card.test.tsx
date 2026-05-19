import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PortfolioMemoryTimelineCard from "../../src/features/workbench/components/portfolio-memory-timeline-card";
import type { PortfolioMemoryEventRow } from "../../src/features/workbench/portfolio-memory-view-model";

const events: PortfolioMemoryEventRow[] = [
  {
    key: "memory:outcome-review:or_1",
    eventId: "memory:outcome-review:or_1",
    displayId: "Memory event 1",
    eventType: "OUTCOME_REVIEW_CREATED",
    eventLabel: "Outcome Review Created",
    category: "Outcome Review",
    eventTime: "07 May 2026, 10:05",
    summary: "A post-trade outcome review is available.",
    businessImpact: "Outcome ready for review",
    actionLabel: "View",
    status: "READY",
    sourceSystems: "lotus-manage",
    sourceRefs: "lotus-manage:or_1",
    artifactRefs: "outcome_review:or_1",
    artifactRefCount: 1,
    contentHash: "sha256:portfolio-memory-event",
    reasonCodes: "OUTCOME_REVIEW_READY",
    metadataRows: [],
  },
];

describe("PortfolioMemoryTimelineCard", () => {
  it("renders business-facing timeline rows and delegates selection", () => {
    const onSelectEvent = vi.fn();

    render(
      <PortfolioMemoryTimelineCard
        activeEventType="ALL"
        eventCount="1"
        events={events}
        selectedEventId={null}
        onSelectEvent={onSelectEvent}
      />,
    );

    expect(screen.getByRole("heading", { name: "Historical Event Log" })).toBeInTheDocument();
    expect(screen.getByText("Outcome Review Created")).toBeInTheDocument();
    expect(screen.getByText("Outcome ready for review")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View" }));

    expect(onSelectEvent).toHaveBeenCalledWith("memory:outcome-review:or_1");
  });

  it("does not render source refs, content hashes, or unsupported workflow controls", () => {
    render(
      <PortfolioMemoryTimelineCard
        activeEventType="ALL"
        eventCount="1"
        events={events}
        selectedEventId="memory:outcome-review:or_1"
        onSelectEvent={vi.fn()}
      />,
    );

    expect(screen.queryByText("lotus-manage:or_1")).not.toBeInTheDocument();
    expect(screen.queryByText("sha256:portfolio-memory-event")).not.toBeInTheDocument();
    expect(screen.queryByText("Message client")).not.toBeInTheDocument();
    expect(screen.queryByText("Approve client communication")).not.toBeInTheDocument();
    expect(screen.queryByText("Generate Order")).not.toBeInTheDocument();
    expect(screen.queryByText("Route Order")).not.toBeInTheDocument();
    expect(screen.queryByText("Mark Filled")).not.toBeInTheDocument();
    expect(screen.queryByText("Settle")).not.toBeInTheDocument();
  });

  it("renders filtered empty posture without reconstructing missing rows", () => {
    render(
      <PortfolioMemoryTimelineCard
        activeEventType="OUTCOME_REVIEW_CREATED"
        eventCount="1"
        events={[]}
        selectedEventId={null}
        onSelectEvent={vi.fn()}
      />,
    );

    expect(screen.getByText("No memory events returned")).toBeInTheDocument();
    expect(screen.getByText("No events are available for this event type.")).toBeInTheDocument();
  });
});
