import { formatTimestampValue } from "@/design-system/utils/financial-formatters";
import type { WorkbenchIconName } from "@/design-system";
import type { DpmPortfolioMemoryGatewayResponse } from "./types";

const CAMPAIGN_ASSIGNMENT_TASK_TRANSITION_EVENT =
  "BULK_REVIEW_CAMPAIGN_ASSIGNMENT_TASK_TRANSITION";

export type PortfolioMemoryPanelState =
  | "complete"
  | "partial"
  | "empty"
  | "unsupported"
  | "unavailable";

export type PortfolioMemoryEventRow = {
  key: string;
  eventId: string;
  displayId: string;
  eventType: string;
  eventLabel: string;
  category: string;
  eventTime: string;
  summary: string;
  businessImpact: string;
  actionLabel: string;
  status: string;
  sourceSystems: string;
  sourceRefs: string;
  artifactRefs: string;
  artifactRefCount: number;
  contentHash: string;
  reasonCodes: string;
  metadataRows: PortfolioMemoryDetailMetric[];
};

export type PortfolioMemoryCountRow = {
  key: string;
  eventType: string;
  eventLabel: string;
  count: string;
};

export type PortfolioMemoryDetailMetric = {
  key: string;
  label: string;
  value: string;
};

export type PortfolioMemorySourceFacetRow = {
  key: string;
  label: string;
  count: string;
  family: "system" | "type";
};

export type PortfolioMemoryPanelModel = {
  state: PortfolioMemoryPanelState;
  supportabilityState: string;
  sourceService: string;
  authority: string;
  correlationId: string;
  portfolioId: string;
  eventCount: string;
  latestEventTime: string;
  contentHash: string;
  sourceSystems: string;
  artifactRefCount: string;
  reasonCodes: string[];
  eventTypeRows: PortfolioMemoryCountRow[];
  events: PortfolioMemoryEventRow[];
  selectedEvent: PortfolioMemoryEventRow | null;
  latestMemoryEvent: string;
  memoryCoverage: string;
  openFollowUps: string;
  evidenceLinks: string;
  sourceFacetRows: PortfolioMemorySourceFacetRow[];
  sourceBoundaryRows: string[];
  recommendedActions: PortfolioMemoryRecommendedAction[];
};

export type PortfolioMemoryRecommendedAction = {
  key: string;
  title: string;
  body: string;
  icon: WorkbenchIconName;
};

export function buildPortfolioMemoryPanelModel(
  response: DpmPortfolioMemoryGatewayResponse | null,
  searchResponse: DpmPortfolioMemoryGatewayResponse | null = null,
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
      latestEventTime: "N/A",
      contentHash: "N/A",
      sourceSystems: "N/A",
      artifactRefCount: "N/A",
      reasonCodes: ["GATEWAY_PORTFOLIO_MEMORY_UNAVAILABLE"],
      eventTypeRows: [],
      events: [],
      selectedEvent: null,
      latestMemoryEvent: "N/A",
      memoryCoverage: "Unavailable",
      openFollowUps: "N/A",
      evidenceLinks: "N/A",
      sourceFacetRows: [],
      sourceBoundaryRows: [],
      recommendedActions: defaultRecommendedActions("UNAVAILABLE"),
    };
  }

  const supportability = response.supportability;
  const searchSupportability = searchResponse?.supportability;
  const supportabilityState = normalizeState(supportability.state);
  const data = response.data;
  const eventRecords = extractRecordArray(data.events);
  const events = eventRecords.map((record, index) =>
    buildEventRow(record, index, supportabilityState),
  );
  const artifactRefCount =
    formatOptionalNumber(readRecord(data.summary).artifact_ref_count) ||
    formatOptionalNumber(data.artifact_ref_count) ||
    formatValue(
      eventRecords.reduce(
        (count, record) => count + extractRecordArray(record.artifact_refs).length,
        0,
      ),
    );
  const latestMemoryEvent = events[0]?.eventLabel ?? "No memory events returned";
  return {
    state: resolvePanelState(supportabilityState, supportability.event_count, events.length),
    supportabilityState,
    sourceService: supportability.source_service || response.source_service,
    authority: supportability.authority,
    correlationId: response.correlation_id,
    portfolioId: readString(data, "portfolio_id") || "N/A",
    eventCount: formatValue(supportability.event_count),
    latestEventTime: formatTimestampValue(
      readString(readRecord(data.summary), "latest_event_at") ||
        readString(data, "latest_event_at") ||
        readEventTimestamp(eventRecords[0]),
      { nullDisplay: "Not reported" },
    ),
    contentHash:
      supportability.content_hash ||
      readString(readRecord(data.summary), "content_hash") ||
      readString(data, "content_hash") ||
      "N/A",
    sourceSystems: supportability.source_systems.join(", ") || "N/A",
    artifactRefCount,
    reasonCodes: supportability.reason_codes,
    eventTypeRows: Object.entries(supportability.event_type_counts).map(
      ([eventType, count]) => ({
        key: eventType,
        eventType,
        eventLabel: eventTypeLabel(eventType),
        count: formatValue(count),
      }),
    ),
    events,
    selectedEvent: events[0] ?? null,
    latestMemoryEvent,
    memoryCoverage: resolveMemoryCoverage(supportabilityState, events.length),
    openFollowUps: formatFollowUpCount(events),
    evidenceLinks: `${artifactRefCount} Available`,
    sourceFacetRows: [
      ...buildSourceFacetRows(
        searchSupportability?.source_system_counts ?? supportability.source_system_counts,
        "system",
      ),
      ...buildSourceFacetRows(
        searchSupportability?.source_type_counts ?? supportability.source_type_counts,
        "type",
      ),
    ],
    sourceBoundaryRows: formatObjectEntries(searchResponse?.data.support_boundary),
    recommendedActions: defaultRecommendedActions(supportabilityState),
  };
}

function buildSourceFacetRows(
  counts: Record<string, number> | undefined,
  family: "system" | "type",
): PortfolioMemorySourceFacetRow[] {
  return Object.entries(counts ?? {})
    .sort(([, leftCount], [, rightCount]) => rightCount - leftCount)
    .slice(0, 6)
    .map(([label, count]) => ({
      key: `${family}-${label}`,
      label,
      count: count.toLocaleString(),
      family,
    }));
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

function buildEventRow(
  record: Record<string, unknown>,
  index: number,
  fallbackState: string,
): PortfolioMemoryEventRow {
  const eventId = readString(record, "event_id") || `portfolio-memory-event-${index + 1}`;
  const eventType = readString(record, "event_type") || "N/A";
  const eventLabel = eventTypeLabel(eventType, record);
  const sourceRefs = formatRefs(record.source_refs);
  const artifactRefs = formatRefs(record.artifact_refs);
  const artifactRefCount = extractRecordArray(record.artifact_refs).length;
  return {
    key: eventId,
    eventId,
    displayId: `Memory event ${index + 1}`,
    eventType,
    eventLabel,
    category: eventCategory(eventType),
    eventTime: formatTimestampValue(readEventTimestamp(record), {
      nullDisplay: "Not reported",
    }),
    summary:
      eventType === "PM_QUALITY_REVIEW_ACTION" ||
      eventType === CAMPAIGN_ASSIGNMENT_TASK_TRANSITION_EVENT
        ? eventSummary(eventType)
        : readString(record, "title") ||
          readString(record, "summary") ||
          readString(record, "description") ||
          eventSummary(eventType),
    businessImpact: eventBusinessImpact(eventType, record),
    actionLabel: eventActionLabel(eventType),
    status:
      normalizeState(
        readString(record, "supportability_state") ||
          readString(record, "state") ||
          readString(record, "status") ||
          fallbackState,
      ),
    sourceSystems: extractSourceSystems(record).join(", ") || "N/A",
    sourceRefs,
    artifactRefs,
    artifactRefCount,
    contentHash:
      readString(record, "content_hash") ||
      readString(record, "hash") ||
      "N/A",
    reasonCodes: extractStringArray(record.reason_codes).join(", ") || "N/A",
    metadataRows: metadataRows(record),
  };
}

function eventTypeLabel(eventType: string, record: Record<string, unknown> = {}): string {
  const sourceType = readString(record, "source_type").toUpperCase();
  const status = readString(record, "status").toUpperCase();
  if (eventType === "WAVE_EVENT" && (sourceType.includes("SIMUL") || status.includes("SIMUL"))) {
    return "Rebalance Simulation Prepared";
  }
  const labels: Record<string, string> = {
    PROOF_PACK_CREATED: "Evidence Pack Generated",
    PROOF_PACK_TIMELINE_EVENT: "Evidence Timeline Updated",
    MANDATE_HEALTH_SNAPSHOT: "Daily Readiness Check Completed",
    MANDATE_MONITORING_EXCEPTION: "Mandate Attention Item Recorded",
    WAVE_CREATED: "Rebalance Wave Created",
    WAVE_EVENT: "Rebalance State Updated",
    WAVE_HANDOFF_READY: "Operations Handoff Prepared",
    OUTCOME_REVIEW_CREATED: "Outcome Review Created",
    OUTCOME_REVIEW_EVENT: "Outcome Review Updated",
    PM_QUALITY_SCORE_RUN: "PM Quality Review Recorded",
    PM_QUALITY_REVIEW_ACTION: "PM Quality Supervisory Review Action",
    [CAMPAIGN_ASSIGNMENT_TASK_TRANSITION_EVENT]: "Campaign Assignment Task Transition",
  };
  return labels[eventType] ?? businessCase(eventType);
}

function eventCategory(eventType: string): string {
  if (eventType.startsWith("PROOF_PACK")) {
    return "Evidence";
  }
  if (eventType.startsWith("MANDATE")) {
    return "Mandate Health";
  }
  if (eventType.startsWith("WAVE")) {
    return "Rebalance";
  }
  if (eventType.startsWith("BULK_REVIEW_CAMPAIGN")) {
    return "Campaign Workflow";
  }
  if (eventType.startsWith("OUTCOME")) {
    return "Outcome Review";
  }
  if (eventType.startsWith("PM_QUALITY")) {
    return "Operating Quality";
  }
  return "Operations";
}

function eventSummary(eventType: string): string {
  const summaries: Record<string, string> = {
    PROOF_PACK_CREATED: "Pre-trade evidence is available for advisor review.",
    PROOF_PACK_TIMELINE_EVENT: "Evidence activity was added to the mandate record.",
    MANDATE_HEALTH_SNAPSHOT: "Mandate readiness was refreshed from persisted health evidence.",
    MANDATE_MONITORING_EXCEPTION: "An advisor attention item is present in the mandate record.",
    WAVE_CREATED: "A rebalance workflow was opened for this portfolio.",
    WAVE_EVENT: "The rebalance workflow state changed.",
    WAVE_HANDOFF_READY: "Internal operations handoff evidence is available.",
    OUTCOME_REVIEW_CREATED: "A post-trade outcome review is available.",
    OUTCOME_REVIEW_EVENT: "Outcome review activity was added to the record.",
    PM_QUALITY_SCORE_RUN: "PM operating quality lineage is available.",
    PM_QUALITY_REVIEW_ACTION: "A bounded PM operating quality supervisory review action is available.",
    [CAMPAIGN_ASSIGNMENT_TASK_TRANSITION_EVENT]:
      "A campaign assignment task transition was recorded from Manage workflow evidence.",
  };
  return summaries[eventType] ?? "Portfolio memory event is available.";
}

function eventBusinessImpact(eventType: string, record: Record<string, unknown>): string {
  const metadata = readRecord(record.metadata);
  const recommendedAction = readString(metadata, "recommended_action");
  const reasonCodes = extractStringArray(record.reason_codes);
  if (recommendedAction) {
    return businessCase(recommendedAction);
  }
  if (reasonCodes.length > 0) {
    return businessCase(reasonCodes[0]);
  }
  const impacts: Record<string, string> = {
    PROOF_PACK_CREATED: "Pre-trade proof available",
    PROOF_PACK_TIMELINE_EVENT: "Audit trail updated",
    MANDATE_HEALTH_SNAPSHOT: "Mandate posture refreshed",
    MANDATE_MONITORING_EXCEPTION: "Advisor attention required",
    WAVE_CREATED: "Drift reduction path opened",
    WAVE_EVENT: "Rebalance decision advanced",
    WAVE_HANDOFF_READY: "Operations handoff ready",
    OUTCOME_REVIEW_CREATED: "Outcome ready for review",
    OUTCOME_REVIEW_EVENT: "Review record updated",
    PM_QUALITY_SCORE_RUN: "Operating-quality lineage recorded",
    PM_QUALITY_REVIEW_ACTION: "Supervisory review action recorded",
    [CAMPAIGN_ASSIGNMENT_TASK_TRANSITION_EVENT]: "Campaign task posture recorded",
  };
  return impacts[eventType] ?? "Portfolio record updated";
}

function eventActionLabel(eventType: string): string {
  if (eventType.startsWith("PROOF_PACK")) {
    return "Open";
  }
  if (eventType.startsWith("WAVE")) {
    return "Review";
  }
  return "View";
}

function metadataRows(record: Record<string, unknown>): PortfolioMemoryDetailMetric[] {
  if (readString(record, "event_type") === CAMPAIGN_ASSIGNMENT_TASK_TRANSITION_EVENT) {
    return campaignAssignmentTaskTransitionRows(record);
  }

  const metadata = readRecord(record.metadata);
  const rows: PortfolioMemoryDetailMetric[] = [];
  addMetadataRow(rows, "Status", readString(record, "status"));
  addMetadataRow(rows, "Category", eventCategory(readString(record, "event_type")));
  addMetadataRow(rows, "Evidence Items", String(extractRecordArray(record.artifact_refs).length));
  addMetadataRow(rows, "Reason Codes", String(extractStringArray(record.reason_codes).length));
  addMetadataRow(rows, "As Of Date", readString(metadata, "as_of_date"));
  addMetadataRow(rows, "Item Count", readString(metadata, "matching_item_count") || readString(metadata, "item_count"));
  addMetadataRow(rows, "Recommended Action", readString(metadata, "recommended_action"));
  addMetadataRow(rows, "Dimension", readString(metadata, "dimension"));
  return rows.slice(0, 6);
}

function campaignAssignmentTaskTransitionRows(
  record: Record<string, unknown>,
): PortfolioMemoryDetailMetric[] {
  const metadata = readRecord(record.metadata);
  const rows: PortfolioMemoryDetailMetric[] = [];
  addMetadataRow(rows, "Task Ref", readString(metadata, "task_ref") || readString(metadata, "assignment_task_id"));
  addMetadataRow(rows, "Transition", readString(metadata, "transition_type"));
  addMetadataRow(rows, "From Status", readString(metadata, "from_status"));
  addMetadataRow(rows, "To Status", readString(metadata, "to_status") || readString(record, "status"));
  addMetadataRow(rows, "SLA Posture", readString(metadata, "sla_posture"));
  addMetadataRow(
    rows,
    "Supportability",
    readString(metadata, "supportability_state") ||
      readString(record, "supportability_state") ||
      readString(record, "status"),
  );
  addMetadataRow(rows, "Evidence Items", String(extractRecordArray(record.artifact_refs).length));
  addMetadataRow(rows, "Reason Codes", String(extractStringArray(record.reason_codes).length));
  addMetadataRow(rows, "Content Hash", readString(record, "content_hash"));
  return rows.slice(0, 9);
}

function addMetadataRow(rows: PortfolioMemoryDetailMetric[], label: string, value: string): void {
  if (!value || value === "undefined" || value === "null") {
    return;
  }
  rows.push({
    key: `${label}-${rows.length}`,
    label,
    value: label === "Recommended Action" || label === "Dimension" ? businessCase(value) : value,
  });
}

function resolveMemoryCoverage(state: string, eventCount: number): string {
  if (eventCount === 0) {
    return "No Events";
  }
  if (state === "READY") {
    return "Complete";
  }
  if (state === "PENDING_REVIEW" || state === "BLOCKED" || state === "DEGRADED") {
    return "Needs Review";
  }
  return businessCase(state);
}

function formatFollowUpCount(events: PortfolioMemoryEventRow[]): string {
  const count = events.filter((event) =>
    ["PENDING_REVIEW", "BLOCKED", "DEGRADED"].includes(event.status),
  ).length;
  return count === 1 ? "1 Item" : `${count} Items`;
}

function defaultRecommendedActions(state: string): PortfolioMemoryRecommendedAction[] {
  const actions: PortfolioMemoryRecommendedAction[] = [
    {
      key: "review-latest",
      title: "Review latest memory event",
      body: "Check the most recent mandate, rebalance, review, or evidence update.",
      icon: "refresh",
    },
    {
      key: "open-evidence",
      title: "Open linked evidence pack",
      body: "Access audit-ready documentation linked to this memory view.",
      icon: "archive",
    },
    {
      key: "review-supportability",
      title: "Review supportability posture",
      body: "Use the source-owned supportability and reason-code posture before follow-up.",
      icon: "verify",
    },
  ];
  if (state === "BLOCKED" || state === "PENDING_REVIEW" || state === "DEGRADED") {
    return [
      {
        key: "resolve-attention",
        title: "Resolve advisor attention item",
        body: "Clear open review conditions before approving the next action.",
        icon: "pending",
      },
      ...actions,
    ];
  }
  return actions;
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

function readEventTimestamp(record: Record<string, unknown> | undefined): string {
  if (!record) {
    return "";
  }
  return (
    readString(record, "event_time") ||
    readString(record, "occurred_at") ||
    readString(record, "created_at")
  );
}

function businessCase(value: string): string {
  return value
    .replace(/[_:.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "N/A";
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
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

function formatOptionalNumber(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  return formatValue(value);
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

function formatObjectEntries(value: unknown): string[] {
  const record = readRecord(value);
  return Object.entries(record)
    .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined && entryValue !== "")
    .map(([key, entryValue]) => `${businessCase(key)}: ${formatValue(entryValue)}`);
}

function normalizeState(state: string): string {
  return state.trim().toUpperCase() || "UNKNOWN";
}
