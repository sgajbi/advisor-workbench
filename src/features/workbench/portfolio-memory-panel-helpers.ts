import type {
  PortfolioMemoryDetailMetric,
  PortfolioMemoryEventRow,
  PortfolioMemoryPanelState,
} from "./portfolio-memory-view-model";
import { businessStateLabel } from "./manage-workspace-view-model";

export type PortfolioMemoryBadgeTone =
  | "default"
  | "success"
  | "warn"
  | "danger";

export type PortfolioMemoryStatePanelCopy = {
  kind: "empty" | "partial" | "unavailable";
  title: string;
  body: string;
};

export function portfolioMemoryBadgeTone(
  state: string,
): PortfolioMemoryBadgeTone {
  const normalized = state.toUpperCase();
  if (
    normalized === "READY" ||
    normalized === "COMPLETE" ||
    normalized === "SUPPORTED"
  ) {
    return "success";
  }
  if (
    normalized === "PARTIAL" ||
    normalized === "DEGRADED" ||
    normalized === "EMPTY" ||
    normalized === "UNKNOWN"
  ) {
    return "warn";
  }
  if (
    normalized === "BLOCKED" ||
    normalized === "UNSUPPORTED" ||
    normalized === "UNAVAILABLE"
  ) {
    return "danger";
  }
  return "default";
}

export function buildPortfolioMemoryStatePanelCopy(
  state: PortfolioMemoryPanelState,
): PortfolioMemoryStatePanelCopy {
  if (state === "empty") {
    return {
      kind: "empty",
      title: "No portfolio memory events returned",
      body: "No portfolio memory timeline is currently available for this portfolio.",
    };
  }
  if (state === "partial") {
    return {
      kind: "partial",
      title: "Portfolio memory is partial",
      body: "Some rebalance, evidence, or review events are not yet available.",
    };
  }
  if (state === "unsupported") {
    return {
      kind: "unavailable",
      title: "Portfolio memory is not supported",
      body: "Portfolio memory is not available for the selected portfolio.",
    };
  }
  return {
    kind: "partial",
    title: "Portfolio memory is unavailable",
    body: "Portfolio memory is temporarily unavailable.",
  };
}

export function shouldShowPortfolioMemoryStatePanel(
  state: PortfolioMemoryPanelState,
  errorMessage: string | null,
): boolean {
  return (
    Boolean(errorMessage) ||
    state === "empty" ||
    state === "partial" ||
    state === "unsupported" ||
    state === "unavailable"
  );
}

export function filterPortfolioMemoryEvents(
  events: PortfolioMemoryEventRow[],
  activeEventType: string,
): PortfolioMemoryEventRow[] {
  return activeEventType === "ALL"
    ? events
    : events.filter((event) => event.eventType === activeEventType);
}

export function resolveSelectedPortfolioMemoryEvent(input: {
  filteredEvents: PortfolioMemoryEventRow[];
  selectedEventId: string | null;
  fallbackEvent: PortfolioMemoryEventRow | null;
}): PortfolioMemoryEventRow | null {
  return (
    input.filteredEvents.find(
      (event) => event.eventId === input.selectedEventId,
    ) ??
    input.filteredEvents[0] ??
    input.fallbackEvent
  );
}

export function buildPortfolioMemoryFallbackSnapshotRows(
  event: PortfolioMemoryEventRow | null,
): PortfolioMemoryDetailMetric[] {
  return [
    {
      key: "status",
      label: "Status",
      value: businessStateLabel(event?.status ?? "N/A"),
    },
    { key: "category", label: "Category", value: event?.category ?? "N/A" },
    {
      key: "evidence",
      label: "Evidence Items",
      value: String(event?.artifactRefCount ?? 0),
    },
  ];
}

export function portfolioMemoryReviewPosture(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === "READY" || normalized === "COMPLETE") {
    return "Ready for advisor review";
  }
  if (
    normalized === "PENDING_REVIEW" ||
    normalized === "BLOCKED" ||
    normalized === "DEGRADED"
  ) {
    return "Needs advisor attention";
  }
  return businessStateLabel(status);
}

export function portfolioMemoryEvidenceAvailability(value: string): string {
  return value && value !== "N/A" ? "Available" : "Not available";
}
