export const PROPOSAL_IMPLEMENTATION_STATUS_CONTRACT_VERSION =
  "proposal-implementation-status.v1" as const;

export const PROPOSAL_IMPLEMENTATION_CAPABILITY_KEYS = [
  "handoff_posture",
  "provider_reference",
  "downstream_reference",
  "event_lineage",
  "order_fill_settlement_detail",
] as const;

const HANDOFF_STATUSES = [
  "NOT_REQUESTED",
  "REQUESTED",
  "ACCEPTED",
  "PARTIALLY_EXECUTED",
  "EXECUTED",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
] as const;
const STATUS_FAMILIES = [
  "not_started",
  "pending",
  "attention",
  "completed",
] as const;
const NEXT_ACTIONS = [
  "REQUEST_HANDOFF",
  "MONITOR_HANDOFF",
  "MONITOR_IMPLEMENTATION",
  "REVIEW_PARTIAL_EXECUTION",
  "NO_ACTION",
  "INVESTIGATE_REJECTION",
  "REVIEW_CANCELLATION",
  "REVALIDATE_HANDOFF",
] as const;
const WORKFLOW_STATES = [
  "DRAFT",
  "RISK_REVIEW",
  "COMPLIANCE_REVIEW",
  "AWAITING_CLIENT_CONSENT",
  "EXECUTION_READY",
  "EXECUTED",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
] as const;
const EVENT_TYPES = [
  "EXECUTION_REQUESTED",
  "EXECUTION_ACCEPTED",
  "EXECUTION_PARTIALLY_EXECUTED",
  "EXECUTION_REJECTED",
  "EXECUTION_CANCELLED",
  "EXECUTION_EXPIRED",
  "EXECUTED",
] as const;
const EVIDENCE_STATES = ["supported", "partial"] as const;
const CAPABILITY_STATES = [
  "supported",
  "partial",
  "not_available",
  "not_supported",
] as const;
const VERSION_POSTURES = [
  "not_correlated",
  "current_version",
  "historical_version",
] as const;

export type ProposalImplementationHandoffStatus =
  (typeof HANDOFF_STATUSES)[number];
export type ProposalImplementationStatusFamily =
  (typeof STATUS_FAMILIES)[number];
export type ProposalImplementationNextAction = (typeof NEXT_ACTIONS)[number];
export type ProposalImplementationWorkflowState =
  (typeof WORKFLOW_STATES)[number];
export type ProposalImplementationEvidenceState =
  (typeof EVIDENCE_STATES)[number];
export type ProposalImplementationCapabilityKey =
  (typeof PROPOSAL_IMPLEMENTATION_CAPABILITY_KEYS)[number];
export type ProposalImplementationCapabilityState =
  (typeof CAPABILITY_STATES)[number];
export type ProposalImplementationVersionPosture =
  (typeof VERSION_POSTURES)[number];
export type ProposalImplementationEventType = (typeof EVENT_TYPES)[number];

export type ProposalImplementationLatestEvent = {
  event_id: string;
  event_type: ProposalImplementationEventType;
  actor_id: string;
  occurred_at: string;
  related_version_no: number | null;
};

export type ProposalImplementationCapability = {
  key: ProposalImplementationCapabilityKey;
  state: ProposalImplementationCapabilityState;
  reason_code: string;
  source_service: string | null;
};

export type ProposalImplementationStatusData = {
  proposal_id: string;
  portfolio_id: string;
  title: string | null;
  current_state: ProposalImplementationWorkflowState;
  current_version_no: number;
  handoff_status: ProposalImplementationHandoffStatus;
  status_family: ProposalImplementationStatusFamily;
  next_action: ProposalImplementationNextAction;
  attention_required: boolean;
  terminal: boolean;
  evidence_state: ProposalImplementationEvidenceState;
  reason_code: string;
  execution_request_id: string | null;
  execution_provider: string | null;
  related_version_no: number | null;
  version_posture: ProposalImplementationVersionPosture;
  handoff_requested_at: string | null;
  executed_at: string | null;
  external_execution_id: string | null;
  latest_workflow_event: ProposalImplementationLatestEvent | null;
  ownership: {
    advisory_role: "HANDOFF_REQUEST_AND_STATUS_RECONCILIATION";
    execution_system_of_record: "DOWNSTREAM_EXECUTION_PROVIDER";
    ownership_boundary: "DOWNSTREAM_EXECUTION_SYSTEM_OF_RECORD";
  };
  freshness: {
    observed_at: string;
    basis: "LATEST_EXECUTION_EVENT" | "PROPOSAL_LAST_EVENT";
  };
  capabilities: ProposalImplementationCapability[];
  lineage: {
    source_service: "lotus-advise";
    source_contract: "ProposalExecutionStatusResponse";
    proposal_id: string;
    portfolio_id: string;
    related_version_no: number | null;
    latest_event_id: string | null;
    gateway_correlation_id: string;
  };
};

export type ProposalImplementationStatusEnvelope = {
  correlation_id: string;
  contract_version: typeof PROPOSAL_IMPLEMENTATION_STATUS_CONTRACT_VERSION;
  data: ProposalImplementationStatusData;
};

type StatusSemantics = {
  family: ProposalImplementationStatusFamily;
  nextAction: ProposalImplementationNextAction;
  attentionRequired: boolean;
  terminal: boolean;
  reasonCode: string;
  eventType: ProposalImplementationEventType | null;
};

const STATUS_SEMANTICS: Record<
  ProposalImplementationHandoffStatus,
  StatusSemantics
> = {
  NOT_REQUESTED: {
    family: "not_started",
    nextAction: "REQUEST_HANDOFF",
    attentionRequired: false,
    terminal: false,
    reasonCode: "implementation_handoff_not_requested",
    eventType: null,
  },
  REQUESTED: {
    family: "pending",
    nextAction: "MONITOR_HANDOFF",
    attentionRequired: false,
    terminal: false,
    reasonCode: "implementation_handoff_requested",
    eventType: "EXECUTION_REQUESTED",
  },
  ACCEPTED: {
    family: "pending",
    nextAction: "MONITOR_IMPLEMENTATION",
    attentionRequired: false,
    terminal: false,
    reasonCode: "implementation_handoff_accepted",
    eventType: "EXECUTION_ACCEPTED",
  },
  PARTIALLY_EXECUTED: {
    family: "attention",
    nextAction: "REVIEW_PARTIAL_EXECUTION",
    attentionRequired: true,
    terminal: false,
    reasonCode: "implementation_partially_executed",
    eventType: "EXECUTION_PARTIALLY_EXECUTED",
  },
  EXECUTED: {
    family: "completed",
    nextAction: "NO_ACTION",
    attentionRequired: false,
    terminal: true,
    reasonCode: "implementation_executed",
    eventType: "EXECUTED",
  },
  REJECTED: {
    family: "attention",
    nextAction: "INVESTIGATE_REJECTION",
    attentionRequired: true,
    terminal: true,
    reasonCode: "implementation_rejected",
    eventType: "EXECUTION_REJECTED",
  },
  CANCELLED: {
    family: "attention",
    nextAction: "REVIEW_CANCELLATION",
    attentionRequired: true,
    terminal: true,
    reasonCode: "implementation_cancelled",
    eventType: "EXECUTION_CANCELLED",
  },
  EXPIRED: {
    family: "attention",
    nextAction: "REVALIDATE_HANDOFF",
    attentionRequired: true,
    terminal: true,
    reasonCode: "implementation_handoff_expired",
    eventType: "EXECUTION_EXPIRED",
  },
};

export function parseProposalImplementationStatusEnvelope(
  value: unknown,
  expectedProposalId: string,
  expectedPortfolioId: string,
  expectedVersionNo: number,
  expectedCurrentState: string,
): ProposalImplementationStatusEnvelope {
  const envelope = record(value, "proposal implementation status response");
  const correlationId = requiredString(
    envelope.correlation_id,
    "correlation_id",
  );
  literal(
    envelope.contract_version,
    [PROPOSAL_IMPLEMENTATION_STATUS_CONTRACT_VERSION],
    "contract_version",
  );
  const data = parseData(envelope.data);
  validateSelectedIdentity(
    data,
    expectedProposalId,
    expectedPortfolioId,
    expectedVersionNo,
    expectedCurrentState,
  );
  validateSemantics(data);
  validateCapabilities(data);
  validateLineage(data, correlationId);
  return {
    correlation_id: correlationId,
    contract_version: PROPOSAL_IMPLEMENTATION_STATUS_CONTRACT_VERSION,
    data,
  };
}

function parseData(value: unknown): ProposalImplementationStatusData {
  const item = record(value, "data");
  return {
    proposal_id: requiredString(item.proposal_id, "data.proposal_id"),
    portfolio_id: requiredString(item.portfolio_id, "data.portfolio_id"),
    title: nullableString(item.title, "data.title"),
    current_state: literal(
      item.current_state,
      WORKFLOW_STATES,
      "data.current_state",
    ),
    current_version_no: positiveInteger(
      item.current_version_no,
      "data.current_version_no",
    ),
    handoff_status: literal(
      item.handoff_status,
      HANDOFF_STATUSES,
      "data.handoff_status",
    ),
    status_family: literal(
      item.status_family,
      STATUS_FAMILIES,
      "data.status_family",
    ),
    next_action: literal(item.next_action, NEXT_ACTIONS, "data.next_action"),
    attention_required: boolean(
      item.attention_required,
      "data.attention_required",
    ),
    terminal: boolean(item.terminal, "data.terminal"),
    evidence_state: literal(
      item.evidence_state,
      EVIDENCE_STATES,
      "data.evidence_state",
    ),
    reason_code: requiredString(item.reason_code, "data.reason_code"),
    execution_request_id: nullableString(
      item.execution_request_id,
      "data.execution_request_id",
    ),
    execution_provider: nullableString(
      item.execution_provider,
      "data.execution_provider",
    ),
    related_version_no: nullablePositiveInteger(
      item.related_version_no,
      "data.related_version_no",
    ),
    version_posture: literal(
      item.version_posture,
      VERSION_POSTURES,
      "data.version_posture",
    ),
    handoff_requested_at: nullableTimestamp(
      item.handoff_requested_at,
      "data.handoff_requested_at",
    ),
    executed_at: nullableTimestamp(item.executed_at, "data.executed_at"),
    external_execution_id: nullableString(
      item.external_execution_id,
      "data.external_execution_id",
    ),
    latest_workflow_event: parseEvent(item.latest_workflow_event),
    ownership: parseOwnership(item.ownership),
    freshness: parseFreshness(item.freshness),
    capabilities: array(item.capabilities, "data.capabilities").map(
      parseCapability,
    ),
    lineage: parseLineage(item.lineage),
  };
}

function parseEvent(value: unknown): ProposalImplementationLatestEvent | null {
  if (value === null) return null;
  const item = record(value, "data.latest_workflow_event");
  return {
    event_id: requiredString(item.event_id, "latest_workflow_event.event_id"),
    event_type: literal(
      item.event_type,
      EVENT_TYPES,
      "latest_workflow_event.event_type",
    ),
    actor_id: requiredString(item.actor_id, "latest_workflow_event.actor_id"),
    occurred_at: timestamp(
      item.occurred_at,
      "latest_workflow_event.occurred_at",
    ),
    related_version_no: nullablePositiveInteger(
      item.related_version_no,
      "latest_workflow_event.related_version_no",
    ),
  };
}

function parseOwnership(
  value: unknown,
): ProposalImplementationStatusData["ownership"] {
  const item = record(value, "data.ownership");
  return {
    advisory_role: literal(
      item.advisory_role,
      ["HANDOFF_REQUEST_AND_STATUS_RECONCILIATION"],
      "ownership.advisory_role",
    ),
    execution_system_of_record: literal(
      item.execution_system_of_record,
      ["DOWNSTREAM_EXECUTION_PROVIDER"],
      "ownership.execution_system_of_record",
    ),
    ownership_boundary: literal(
      item.ownership_boundary,
      ["DOWNSTREAM_EXECUTION_SYSTEM_OF_RECORD"],
      "ownership.ownership_boundary",
    ),
  };
}

function parseFreshness(
  value: unknown,
): ProposalImplementationStatusData["freshness"] {
  const item = record(value, "data.freshness");
  return {
    observed_at: timestamp(item.observed_at, "freshness.observed_at"),
    basis: literal(
      item.basis,
      ["LATEST_EXECUTION_EVENT", "PROPOSAL_LAST_EVENT"],
      "freshness.basis",
    ),
  };
}

function parseCapability(value: unknown): ProposalImplementationCapability {
  const item = record(value, "implementation capability");
  return {
    key: literal(
      item.key,
      PROPOSAL_IMPLEMENTATION_CAPABILITY_KEYS,
      "capability.key",
    ),
    state: literal(item.state, CAPABILITY_STATES, "capability.state"),
    reason_code: requiredString(item.reason_code, "capability.reason_code"),
    source_service: nullableString(
      item.source_service,
      "capability.source_service",
    ),
  };
}

function parseLineage(
  value: unknown,
): ProposalImplementationStatusData["lineage"] {
  const item = record(value, "data.lineage");
  return {
    source_service: literal(
      item.source_service,
      ["lotus-advise"],
      "lineage.source_service",
    ),
    source_contract: literal(
      item.source_contract,
      ["ProposalExecutionStatusResponse"],
      "lineage.source_contract",
    ),
    proposal_id: requiredString(item.proposal_id, "lineage.proposal_id"),
    portfolio_id: requiredString(item.portfolio_id, "lineage.portfolio_id"),
    related_version_no: nullablePositiveInteger(
      item.related_version_no,
      "lineage.related_version_no",
    ),
    latest_event_id: nullableString(
      item.latest_event_id,
      "lineage.latest_event_id",
    ),
    gateway_correlation_id: requiredString(
      item.gateway_correlation_id,
      "lineage.gateway_correlation_id",
    ),
  };
}

function validateSelectedIdentity(
  data: ProposalImplementationStatusData,
  proposalId: string,
  portfolioId: string,
  versionNo: number,
  currentState: string,
): void {
  if (data.proposal_id !== proposalId)
    invalid("proposal_id does not match the selected proposal");
  if (data.portfolio_id !== portfolioId)
    invalid("portfolio_id does not match the selected portfolio");
  if (data.current_version_no !== versionNo) {
    invalid("current_version_no does not match the selected proposal version");
  }
  if (data.current_state !== currentState) {
    invalid(
      "current_state does not match the selected proposal lifecycle state",
    );
  }
}

function validateSemantics(data: ProposalImplementationStatusData): void {
  const semantics = STATUS_SEMANTICS[data.handoff_status];
  if (
    data.status_family !== semantics.family ||
    data.next_action !== semantics.nextAction ||
    data.attention_required !== semantics.attentionRequired ||
    data.terminal !== semantics.terminal
  ) {
    invalid("handoff status semantics are inconsistent");
  }
  const expectedReason =
    data.evidence_state === "partial"
      ? "implementation_evidence_partial"
      : semantics.reasonCode;
  if (data.reason_code !== expectedReason)
    invalid("evidence reason does not match supportability");
  if (
    data.handoff_status === "NOT_REQUESTED" &&
    [
      data.execution_request_id,
      data.execution_provider,
      data.external_execution_id,
      data.related_version_no,
      data.handoff_requested_at,
      data.executed_at,
    ].some((value) => value !== null)
  ) {
    invalid("not-requested handoff contains downstream request evidence");
  }
  if (data.handoff_status === "EXECUTED" && data.executed_at === null) {
    invalid("executed handoff does not contain a completion timestamp");
  }
  if (data.handoff_status !== "EXECUTED" && data.executed_at !== null) {
    invalid("non-executed handoff contains a completion timestamp");
  }
  if (
    data.latest_workflow_event?.event_type !==
    (semantics.eventType ?? undefined)
  ) {
    if (data.latest_workflow_event !== null || semantics.eventType === null) {
      invalid("latest workflow event does not match handoff status");
    }
  }
  const expectedVersionPosture =
    data.related_version_no === null
      ? "not_correlated"
      : data.related_version_no === data.current_version_no
        ? "current_version"
        : "historical_version";
  if (data.version_posture !== expectedVersionPosture) {
    invalid("version posture does not match the related proposal version");
  }
  if (
    data.related_version_no !== null &&
    data.related_version_no > data.current_version_no
  ) {
    invalid(
      "related proposal version cannot be newer than the selected version",
    );
  }
}

function validateCapabilities(data: ProposalImplementationStatusData): void {
  const keys = data.capabilities.map(({ key }) => key);
  if (new Set(keys).size !== keys.length)
    invalid("implementation capability keys are duplicated");
  if (
    PROPOSAL_IMPLEMENTATION_CAPABILITY_KEYS.some(
      (key) => !keys.includes(key),
    ) ||
    keys.length !== PROPOSAL_IMPLEMENTATION_CAPABILITY_KEYS.length
  ) {
    invalid("implementation capability registry is incomplete");
  }
  assertCapability(data, "handoff_posture", "supported");
  assertCapability(
    data,
    "provider_reference",
    data.execution_request_id && data.execution_provider
      ? "supported"
      : "not_available",
  );
  assertCapability(
    data,
    "downstream_reference",
    data.external_execution_id ? "supported" : "not_available",
  );
  assertCapability(
    data,
    "event_lineage",
    data.latest_workflow_event ? "supported" : "not_available",
  );
  assertCapability(data, "order_fill_settlement_detail", "not_supported");
  const expectedEvidenceState =
    data.handoff_status === "NOT_REQUESTED" ||
    Boolean(
      data.execution_request_id &&
      data.execution_provider &&
      data.related_version_no &&
      data.handoff_requested_at &&
      data.latest_workflow_event,
    )
      ? "supported"
      : "partial";
  if (data.evidence_state !== expectedEvidenceState) {
    invalid(
      "evidence state does not match the available implementation references",
    );
  }
}

function assertCapability(
  data: ProposalImplementationStatusData,
  key: ProposalImplementationCapabilityKey,
  state: ProposalImplementationCapabilityState,
): void {
  if (data.capabilities.find((item) => item.key === key)?.state !== state) {
    invalid(`${key} capability state does not match the available evidence`);
  }
}

function validateLineage(
  data: ProposalImplementationStatusData,
  correlationId: string,
): void {
  if (
    data.lineage.proposal_id !== data.proposal_id ||
    data.lineage.portfolio_id !== data.portfolio_id ||
    data.lineage.related_version_no !== data.related_version_no ||
    data.lineage.gateway_correlation_id !== correlationId
  ) {
    invalid(
      "implementation lineage does not match the selected source response",
    );
  }
  if (
    data.lineage.latest_event_id !==
    (data.latest_workflow_event?.event_id ?? null)
  ) {
    invalid("implementation lineage does not match the latest source event");
  }
  if (
    data.latest_workflow_event &&
    data.latest_workflow_event.related_version_no !== null &&
    data.related_version_no !== null &&
    data.latest_workflow_event.related_version_no !== data.related_version_no
  ) {
    invalid(
      "latest event version does not match the implementation handoff version",
    );
  }
  const expectedBasis = data.latest_workflow_event
    ? "LATEST_EXECUTION_EVENT"
    : "PROPOSAL_LAST_EVENT";
  if (data.freshness.basis !== expectedBasis)
    invalid("freshness basis does not match source evidence");
  if (
    data.latest_workflow_event &&
    data.freshness.observed_at !== data.latest_workflow_event.occurred_at
  ) {
    invalid("freshness timestamp does not match the latest source event");
  }
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    invalid(`${field} is not an object`);
  return value as Record<string, unknown>;
}

function array(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) invalid(`${field} is not an array`);
  return value;
}

function literal<const T extends readonly string[]>(
  value: unknown,
  values: T,
  field: string,
): T[number] {
  if (typeof value !== "string" || !values.includes(value as T[number])) {
    invalid(`${field} is not supported`);
  }
  return value as T[number];
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0)
    invalid(`${field} is not reported`);
  return value;
}

function nullableString(value: unknown, field: string): string | null {
  if (value === null) return null;
  return requiredString(value, field);
}

function positiveInteger(value: unknown, field: string): number {
  if (!Number.isInteger(value) || (value as number) < 1)
    invalid(`${field} is not a positive integer`);
  return value as number;
}

function nullablePositiveInteger(value: unknown, field: string): number | null {
  if (value === null) return null;
  return positiveInteger(value, field);
}

function boolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") invalid(`${field} is not a boolean`);
  return value;
}

function timestamp(value: unknown, field: string): string {
  const result = requiredString(value, field);
  if (
    !/(?:Z|[+-]\d{2}:\d{2})$/.test(result) ||
    Number.isNaN(Date.parse(result))
  ) {
    invalid(`${field} is not a timezone-aware timestamp`);
  }
  return result;
}

function nullableTimestamp(value: unknown, field: string): string | null {
  if (value === null) return null;
  return timestamp(value, field);
}

function invalid(message: string): never {
  throw new Error(
    `Proposal implementation status contract is invalid: ${message}`,
  );
}
