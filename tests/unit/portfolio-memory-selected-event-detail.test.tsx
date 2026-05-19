import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioMemorySelectedEventDetail from "../../src/features/workbench/components/portfolio-memory-selected-event-detail";
import type { PortfolioMemoryEventRow } from "../../src/features/workbench/portfolio-memory-view-model";

const outcomeReviewEvent: PortfolioMemoryEventRow = {
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
  metadataRows: [
    { key: "status-0", label: "Status", value: "READY" },
    { key: "category-1", label: "Category", value: "Outcome Review" },
    { key: "evidence-2", label: "Evidence Items", value: "1" },
  ],
};

describe("PortfolioMemorySelectedEventDetail", () => {
  it("renders selected event context and support snapshot without source identifiers", () => {
    render(<PortfolioMemorySelectedEventDetail event={outcomeReviewEvent} />);

    expect(
      screen.getByRole("heading", { name: "Details: Outcome Review Created" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Business Context")).toBeInTheDocument();
    expect(screen.getByText("A post-trade outcome review is available.")).toBeInTheDocument();
    expect(screen.getByText("Support Snapshot")).toBeInTheDocument();
    expect(screen.getAllByText("Ready").length).toBeGreaterThan(0);
    expect(screen.getByText("Ready for advisor review")).toBeInTheDocument();
    expect(screen.getByText("Outcome Review Ready")).toBeInTheDocument();
    expect(screen.getByText("Evidence pack")).toBeInTheDocument();
    expect(screen.getByText("Outcome review")).toBeInTheDocument();
    expect(screen.queryByText("memory:outcome-review:or_1")).not.toBeInTheDocument();
    expect(screen.queryByText("lotus-manage:or_1")).not.toBeInTheDocument();
    expect(screen.queryByText("sha256:portfolio-memory-event")).not.toBeInTheDocument();
  });

  it("renders a fail-closed empty detail posture without communication or execution controls", () => {
    render(<PortfolioMemorySelectedEventDetail event={null} />);

    expect(
      screen.getByRole("heading", { name: "Details: No event selected" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No memory event selected.")).toBeInTheDocument();
    expect(screen.getByText("No additional reason code returned.")).toBeInTheDocument();
    expect(screen.queryByText("Message client")).not.toBeInTheDocument();
    expect(screen.queryByText("Approve client communication")).not.toBeInTheDocument();
    expect(screen.queryByText("Generate Order")).not.toBeInTheDocument();
    expect(screen.queryByText("Route Order")).not.toBeInTheDocument();
    expect(screen.queryByText("Mark Filled")).not.toBeInTheDocument();
    expect(screen.queryByText("Settle")).not.toBeInTheDocument();
  });
});
