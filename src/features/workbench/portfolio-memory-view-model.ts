import type { DpmPortfolioMemoryGatewayResponse } from "./types";

export type PortfolioMemoryPanelState =
  | "complete"
  | "partial"
  | "empty"
  | "unsupported"
  | "unavailable";

export type PortfolioMemoryEventRow = {
  key: string;
  eventId: string;
  eventType: string;
  eventTime: string;
  sourceSystems: string;
  sourceRefs: string;
  artifactRefs: string;
  reasonCodes: string;
};

export type PortfolioMemoryCountRow = {
  key: string;
  eventType: string;
  count: string;
};

export type PortfolioMemoryPanelModel = {
  state: PortfolioMemoryPanelState;
  supportabilityState: string;
  sourceService: string;
  authority: string;
  correlationId: string;
  portfolioId: string;
  eventCount: string;
  contentHash: string;
  sourceSystems: string;
  reasonCodes: string[];
  eventTypeRows: PortfolioMemoryCountRow[];
  events: PortfolioMemoryEventRow[];
};

export function buildPortfolioMemoryPanelModel(
  response: DpmPortfolioMemoryGatewayResponse | null,
): PortfolioMemoryPanelModel {
  if (!response) {
    return {
      state: "unavailable",
      supportabilityState: "UNAVAILABLE",
      sourceService: "lotus-gateway",
      authority: "lotus-manage:RFC-0040/RFC-0041/RFC-0042",
      correlationId: "N/A",
      portfolioId: "N/A",
      eventCount: "N/A",
      contentHash: "N/A",
      sourceSystems: "N/A",
      reasonCodes: ["GATEWAY_PORTFOLIO_MEMORY_UNAVAILABLE"],
      eventTypeRows: [],
      events: [],
    };
  }

  const supportability = response.supportability;
  const supportabilityState = normalizeState(supportability.state);
  const data = response.data;
  const events = extractRecordArray(data.events);
  return {
    state: resolvePanelState(supportabilityState, supportability.event_count, events.length),
    supportabilityState,
    sourceService: supportability.source_service || response.source_service,
    authority: supportability.authority,
    correlationId: response.correlation_id,
    portfolioId: readString(data, "portfolio_id") || "N/A",
    eventCount: formatValue(supportability.event_count),
    contentHash:
      supportability.content_hash ||
      readString(data, "content_hash") ||
      "N/A",
    sourceSystems: supportability.source_systems.join(", ") || "N/A",
    reasonCodes: supportability.reason_codes,
    eventTypeRows: Object.entries(supportability.event_type_counts).map(
      ([eventType, count]) => ({
        key: eventType,
        eventType,
        count: formatValue(count),
      }),
    ),
    events: events.map(buildEventRow),
  };
}

function resolvePanelState(
  supportabilityState: string,
  supportabilityEventCount: number,
  renderedEventCount: number,
): PortfolioMemoryPanelState {
  if (supportabilityState === "EMPTY" || (supportabilityEventCount === 0 && renderedEventCount === 0)) {
    return "empty";
  }
  if (
    supportabilityState === "PARTIAL" ||
    supportabilityState === "DEGRADED" ||
    supportabilityState === "BLOCKED" ||
    supportabilityState === "UNKNOWN"
  ) {
    return "partial";
  }
  if (supportabilityState === "UNSUPPORTED" || supportabilityState === "UNAVAILABLE") {
    return "unsupported";
  }
  return "complete";
}

function buildEventRow(record: Record<string, unknown>, index: number): PortfolioMemoryEventRow {
  const eventId = readString(record, "event_id") || `portfolio-memory-event-${index + 1}`;
  return {
    key: eventId,
    eventId,
    eventType: readString(record, "event_type") || "N/A",
    eventTime:
      readString(record, "event_time") ||
      readString(record, "occurred_at") ||
      readString(record, "created_at") ||
      "N/A",
    sourceSystems: extractSourceSystems(record).join(", ") || "N/A",
    sourceRefs: formatRefs(record.source_refs),
    artifactRefs: formatRefs(record.artifact_refs),
    reasonCodes: extractStringArray(record.reason_codes).join(", ") || "N/A",
  };
}

function extractSourceSystems(record: Record<string, unknown>): string[] {
  const explicit = extractStringArray(record.source_systems);
  if (explicit.length > 0) {
    return explicit;
  }
  return extractRecordArray(record.source_refs)
    .map((ref) => readString(ref, "source_system"))
    .filter((value) => value.length > 0);
}

function formatRefs(value: unknown): string {
  const records = extractRecordArray(value);
  if (records.length === 0) {
    return "N/A";
  }
  return records
    .map((record) => {
      const system =
        readString(record, "source_system") ||
        readString(record, "artifact_type") ||
        readString(record, "type") ||
        "ref";
      const id =
        readString(record, "source_id") ||
        readString(record, "artifact_id") ||
        readString(record, "id") ||
        readString(record, "uri") ||
        "N/A";
      return `${system}:${id}`;
    })
    .join(", ");
}

function extractRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord);
}

function extractStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is string => typeof item === "string" && item.length > 0,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function formatValue(value: unknown): string {
  if (typeof value === "number") {
    return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
  }
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "N/A";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return JSON.stringify(value);
}

function normalizeState(state: string): string {
  return state.trim().toUpperCase() || "UNKNOWN";
}
