export const PROPOSAL_RISK_IMPACT_CONTRACT_VERSION =
  "proposal-risk-impact.v1" as const;

export const PROPOSAL_RISK_IMPACT_CAPABILITY_KEYS = [
  "allocation_comparison",
  "proposal_risk_lens",
  "decision_posture",
  "workflow_gate",
  "benchmark_and_limits",
  "scenario_analysis",
  "valuation_as_of",
] as const;

const SECTION_STATES = [
  "ready",
  "partial",
  "unavailable",
  "not_supported",
] as const;
const OVERALL_STATES = ["ready", "partial", "unavailable"] as const;
const ALLOCATION_DIMENSIONS = [
  "asset_class",
  "currency",
  "sector",
  "country",
  "region",
  "product_type",
  "rating",
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
const DECISION_STATUSES = [
  "READY_FOR_CLIENT_REVIEW",
  "REQUIRES_RISK_REVIEW",
  "REQUIRES_COMPLIANCE_REVIEW",
  "REQUIRES_CLIENT_CONSENT",
  "BLOCKED_REMEDIATION_REQUIRED",
  "INSUFFICIENT_EVIDENCE",
  "REVISION_RECOMMENDED",
] as const;
const NEXT_ACTIONS = [
  "FIX_INPUT",
  "REVIEW_RISK",
  "REVIEW_COMPLIANCE",
  "DISCUSS_WITH_CLIENT",
  "APPROVE_AND_PROCEED",
  "REVISE_PROPOSAL",
  "COMPARE_ALTERNATIVES",
  "REQUEST_CLIENT_CONTEXT",
  "REQUEST_MANDATE_CONTEXT",
] as const;
const APPROVAL_TYPES = [
  "RISK_REVIEW",
  "COMPLIANCE_REVIEW",
  "CLIENT_CONSENT",
  "INVESTMENT_COUNSELLOR_REVIEW",
  "PRODUCT_SPECIALIST_REVIEW",
  "MANDATE_EXCEPTION_APPROVAL",
  "DATA_REMEDIATION",
] as const;
const MATERIAL_CHANGE_FAMILIES = [
  "ALLOCATION_CHANGE",
  "CONCENTRATION_CHANGE",
  "CURRENCY_EXPOSURE_CHANGE",
  "LIQUIDITY_CHANGE",
  "CASH_CHANGE",
  "PRODUCT_COMPLEXITY_CHANGE",
  "RISK_PROFILE_ALIGNMENT_CHANGE",
  "MANDATE_ALIGNMENT_CHANGE",
  "APPROVAL_REQUIREMENT_CHANGE",
  "DATA_QUALITY_CHANGE",
] as const;
const GATES = [
  "BLOCKED",
  "RISK_REVIEW_REQUIRED",
  "COMPLIANCE_REVIEW_REQUIRED",
  "CLIENT_CONSENT_REQUIRED",
  "EXECUTION_READY",
  "NONE",
] as const;
const GATE_NEXT_STEPS = [
  "FIX_INPUT",
  "RISK_REVIEW",
  "COMPLIANCE_REVIEW",
  "REQUEST_CLIENT_CONSENT",
  "EXECUTE",
  "NONE",
] as const;
const SEVERITIES = ["LOW", "MEDIUM", "HIGH"] as const;
const TOP_LEVEL_STATUSES = ["READY", "PENDING_REVIEW", "BLOCKED"] as const;
const CONFIDENCE_LEVELS = ["HIGH", "MEDIUM", "LOW", "INSUFFICIENT"] as const;
const RISK_POSTURE_STATUSES = ["AVAILABLE", "UNAVAILABLE"] as const;
const GATE_REASON_SOURCES = [
  "RULE_ENGINE",
  "SUITABILITY",
  "DATA_QUALITY",
] as const;

export type ProposalRiskImpactSectionState = (typeof SECTION_STATES)[number];
export type ProposalRiskImpactOverallState = (typeof OVERALL_STATES)[number];
export type ProposalRiskImpactAllocationDimension =
  (typeof ALLOCATION_DIMENSIONS)[number];
export type ProposalRiskImpactCapabilityKey =
  (typeof PROPOSAL_RISK_IMPACT_CAPABILITY_KEYS)[number];
export type ProposalRiskImpactSeverity = (typeof SEVERITIES)[number];

export type ProposalRiskImpactMoney = {
  amount: string;
  currency: string;
};

export type ProposalRiskImpactAllocationBucket = {
  key: string;
  weight: string;
  value: ProposalRiskImpactMoney;
  position_count: number;
};

export type ProposalRiskImpactAllocationSnapshot = {
  total_value: ProposalRiskImpactMoney;
  buckets: ProposalRiskImpactAllocationBucket[];
};

export type ProposalRiskImpactAllocationView = {
  dimension: ProposalRiskImpactAllocationDimension;
  current: ProposalRiskImpactAllocationSnapshot | null;
  proposed: ProposalRiskImpactAllocationSnapshot | null;
};

export type ProposalRiskImpactAllocationEvidence = {
  state: ProposalRiskImpactSectionState;
  reason_code: string;
  source_service: "lotus-core" | "lotus-advise" | null;
  source_mode: "LOTUS_CORE" | "LOTUS_ADVISE_LOCAL_FALLBACK" | null;
  contract_version: string | null;
  calculator_version: string | null;
  expected_dimensions: ProposalRiskImpactAllocationDimension[];
  views: ProposalRiskImpactAllocationView[];
};

export type ProposalRiskImpactRiskEvidence = {
  state: ProposalRiskImpactSectionState;
  reason_code: string;
  source_service: string | null;
  summary: string;
  highlights: string[];
};

export type ProposalRiskImpactRequirement = {
  approval_type: (typeof APPROVAL_TYPES)[number];
  required: boolean;
  severity: ProposalRiskImpactSeverity;
  reason_code: string;
  summary: string;
  blocking_until_approved: boolean;
  evidence_refs: string[];
  policy_version: string;
};

export type ProposalRiskImpactMaterialChange = {
  change_id: string;
  family: (typeof MATERIAL_CHANGE_FAMILIES)[number];
  severity: ProposalRiskImpactSeverity;
  summary: string;
  evidence_refs: string[];
};

export type ProposalRiskImpactMissingEvidence = {
  evidence_type: string;
  reason_code: string;
  summary: string;
  blocking: boolean;
  evidence_refs: string[];
};

export type ProposalRiskImpactDecisionEvidence = {
  state: ProposalRiskImpactSectionState;
  reason_code: string;
  source_service: "lotus-advise";
  support_reference: string | null;
  decision_status: (typeof DECISION_STATUSES)[number] | null;
  top_level_status: (typeof TOP_LEVEL_STATUSES)[number] | null;
  primary_reason_code: string | null;
  primary_summary: string | null;
  recommended_next_action: (typeof NEXT_ACTIONS)[number] | null;
  confidence: (typeof CONFIDENCE_LEVELS)[number] | null;
  decision_policy_version: string | null;
  risk_posture_status: (typeof RISK_POSTURE_STATUSES)[number] | null;
  risk_posture_source_service: string | null;
  risk_posture_summary: string | null;
  approval_requirements: ProposalRiskImpactRequirement[];
  material_changes: ProposalRiskImpactMaterialChange[];
  missing_evidence: ProposalRiskImpactMissingEvidence[];
  evidence_refs: string[];
};

export type ProposalRiskImpactWorkflowGate = {
  state: ProposalRiskImpactSectionState;
  reason_code: string;
  support_reference: string | null;
  gate: (typeof GATES)[number] | null;
  recommended_next_step: (typeof GATE_NEXT_STEPS)[number] | null;
  reasons: Array<{
    reason_code: string;
    severity: ProposalRiskImpactSeverity;
    source: (typeof GATE_REASON_SOURCES)[number];
  }>;
};

export type ProposalRiskImpactCapability = {
  key: ProposalRiskImpactCapabilityKey;
  label: string;
  state: ProposalRiskImpactSectionState;
  reason_code: string;
  source_service: string | null;
  support_reference: string | null;
};

export type ProposalRiskImpactData = {
  proposal_id: string;
  portfolio_id: string;
  title: string | null;
  current_state: (typeof WORKFLOW_STATES)[number];
  version_no: number;
  version_created_at: string | null;
  overall_state: ProposalRiskImpactOverallState;
  allocation: ProposalRiskImpactAllocationEvidence;
  risk: ProposalRiskImpactRiskEvidence;
  decision: ProposalRiskImpactDecisionEvidence;
  workflow_gate: ProposalRiskImpactWorkflowGate;
  capabilities: ProposalRiskImpactCapability[];
  lineage: {
    proposal_version_id: string;
    request_hash: string | null;
    artifact_hash: string | null;
    simulation_hash: string | null;
  };
};

export type ProposalRiskImpactEnvelope = {
  correlation_id: string;
  contract_version: typeof PROPOSAL_RISK_IMPACT_CONTRACT_VERSION;
  data: ProposalRiskImpactData;
};

const DECIMAL_STRING = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const ISO_CURRENCY = /^[A-Z]{3}$/;

export function parseProposalRiskImpactEnvelope(
  value: unknown,
  expectedProposalId: string,
  expectedPortfolioId?: string,
): ProposalRiskImpactEnvelope {
  const envelope = record(value, "proposal risk and impact response");
  const correlationId = requiredString(
    envelope.correlation_id,
    "correlation_id",
  );
  literal(
    envelope.contract_version,
    [PROPOSAL_RISK_IMPACT_CONTRACT_VERSION],
    "contract_version",
  );
  const data = parseData(envelope.data);
  if (data.proposal_id !== expectedProposalId) {
    invalid("proposal_id does not match the selected proposal");
  }
  if (expectedPortfolioId && data.portfolio_id !== expectedPortfolioId) {
    invalid("portfolio_id does not match the selected portfolio");
  }
  return {
    correlation_id: correlationId,
    contract_version: PROPOSAL_RISK_IMPACT_CONTRACT_VERSION,
    data,
  };
}

function parseData(value: unknown): ProposalRiskImpactData {
  const item = record(value, "data");
  const capabilities = array(item.capabilities, "capabilities").map(
    parseCapability,
  );
  unique(
    capabilities.map(({ key }) => key),
    "capability keys",
  );
  const receivedCapabilities = new Set(capabilities.map(({ key }) => key));
  if (
    PROPOSAL_RISK_IMPACT_CAPABILITY_KEYS.some(
      (key) => !receivedCapabilities.has(key),
    )
  ) {
    invalid("capability registry is incomplete");
  }
  return {
    proposal_id: requiredString(item.proposal_id, "proposal_id"),
    portfolio_id: requiredString(item.portfolio_id, "portfolio_id"),
    title: nullableString(item.title, "title"),
    current_state: literal(
      item.current_state,
      WORKFLOW_STATES,
      "current_state",
    ),
    version_no: nonNegativeInteger(item.version_no, "version_no"),
    version_created_at: nullableString(
      item.version_created_at,
      "version_created_at",
    ),
    overall_state: literal(item.overall_state, OVERALL_STATES, "overall_state"),
    allocation: parseAllocation(item.allocation),
    risk: parseRisk(item.risk),
    decision: parseDecision(item.decision),
    workflow_gate: parseWorkflowGate(item.workflow_gate),
    capabilities,
    lineage: parseLineage(item.lineage),
  };
}

function parseAllocation(value: unknown): ProposalRiskImpactAllocationEvidence {
  const item = record(value, "allocation");
  const expectedDimensions = enumArray(
    item.expected_dimensions,
    ALLOCATION_DIMENSIONS,
    "allocation.expected_dimensions",
  );
  unique(expectedDimensions, "allocation expected dimensions");
  const views = array(item.views, "allocation.views").map(parseAllocationView);
  unique(
    views.map(({ dimension }) => dimension),
    "allocation view dimensions",
  );
  return {
    state: literal(item.state, SECTION_STATES, "allocation.state"),
    reason_code: requiredString(item.reason_code, "allocation.reason_code"),
    source_service: nullableLiteral(
      item.source_service,
      ["lotus-core", "lotus-advise"] as const,
      "allocation.source_service",
    ),
    source_mode: nullableLiteral(
      item.source_mode,
      ["LOTUS_CORE", "LOTUS_ADVISE_LOCAL_FALLBACK"] as const,
      "allocation.source_mode",
    ),
    contract_version: nullableString(
      item.contract_version,
      "allocation.contract_version",
    ),
    calculator_version: nullableString(
      item.calculator_version,
      "allocation.calculator_version",
    ),
    expected_dimensions: expectedDimensions,
    views,
  };
}

function parseAllocationView(value: unknown): ProposalRiskImpactAllocationView {
  const item = record(value, "allocation view");
  return {
    dimension: literal(
      item.dimension,
      ALLOCATION_DIMENSIONS,
      "allocation view dimension",
    ),
    current: nullable(item.current, parseAllocationSnapshot),
    proposed: nullable(item.proposed, parseAllocationSnapshot),
  };
}

function parseAllocationSnapshot(
  value: unknown,
): ProposalRiskImpactAllocationSnapshot {
  const item = record(value, "allocation snapshot");
  const buckets = array(item.buckets, "allocation buckets").map(
    parseAllocationBucket,
  );
  unique(
    buckets.map(({ key }) => key),
    "allocation bucket keys",
  );
  return { total_value: parseMoney(item.total_value), buckets };
}

function parseAllocationBucket(
  value: unknown,
): ProposalRiskImpactAllocationBucket {
  const item = record(value, "allocation bucket");
  return {
    key: requiredString(item.key, "allocation bucket key"),
    weight: decimalString(item.weight, "allocation bucket weight"),
    value: parseMoney(item.value),
    position_count: nonNegativeInteger(
      item.position_count,
      "allocation bucket position_count",
    ),
  };
}

function parseMoney(value: unknown): ProposalRiskImpactMoney {
  const item = record(value, "money");
  const currency = requiredString(item.currency, "money currency");
  if (!ISO_CURRENCY.test(currency))
    invalid("money currency must be an uppercase ISO code");
  return { amount: decimalString(item.amount, "money amount"), currency };
}

function parseRisk(value: unknown): ProposalRiskImpactRiskEvidence {
  const item = record(value, "risk");
  return {
    state: literal(item.state, SECTION_STATES, "risk.state"),
    reason_code: requiredString(item.reason_code, "risk.reason_code"),
    source_service: nullableString(item.source_service, "risk.source_service"),
    summary: requiredString(item.summary, "risk.summary", true),
    highlights: stringArray(item.highlights, "risk.highlights"),
  };
}

function parseDecision(value: unknown): ProposalRiskImpactDecisionEvidence {
  const item = record(value, "decision");
  return {
    state: literal(item.state, SECTION_STATES, "decision.state"),
    reason_code: requiredString(item.reason_code, "decision.reason_code"),
    source_service: literal(
      item.source_service,
      ["lotus-advise"] as const,
      "decision.source_service",
    ),
    support_reference: nullableString(
      item.support_reference,
      "decision.support_reference",
    ),
    decision_status: nullableLiteral(
      item.decision_status,
      DECISION_STATUSES,
      "decision.decision_status",
    ),
    top_level_status: nullableLiteral(
      item.top_level_status,
      TOP_LEVEL_STATUSES,
      "decision.top_level_status",
    ),
    primary_reason_code: nullableString(
      item.primary_reason_code,
      "decision.primary_reason_code",
    ),
    primary_summary: nullableString(
      item.primary_summary,
      "decision.primary_summary",
    ),
    recommended_next_action: nullableLiteral(
      item.recommended_next_action,
      NEXT_ACTIONS,
      "decision.recommended_next_action",
    ),
    confidence: nullableLiteral(
      item.confidence,
      CONFIDENCE_LEVELS,
      "decision.confidence",
    ),
    decision_policy_version: nullableString(
      item.decision_policy_version,
      "decision.decision_policy_version",
    ),
    risk_posture_status: nullableLiteral(
      item.risk_posture_status,
      RISK_POSTURE_STATUSES,
      "decision.risk_posture_status",
    ),
    risk_posture_source_service: nullableString(
      item.risk_posture_source_service,
      "decision.risk_posture_source_service",
    ),
    risk_posture_summary: nullableString(
      item.risk_posture_summary,
      "decision.risk_posture_summary",
    ),
    approval_requirements: array(
      item.approval_requirements,
      "decision.approval_requirements",
    ).map(parseRequirement),
    material_changes: array(
      item.material_changes,
      "decision.material_changes",
    ).map(parseMaterialChange),
    missing_evidence: array(
      item.missing_evidence,
      "decision.missing_evidence",
    ).map(parseMissingEvidence),
    evidence_refs: stringArray(item.evidence_refs, "decision.evidence_refs"),
  };
}

function parseRequirement(value: unknown): ProposalRiskImpactRequirement {
  const item = record(value, "approval requirement");
  return {
    approval_type: literal(item.approval_type, APPROVAL_TYPES, "approval_type"),
    required: booleanValue(item.required, "approval requirement required"),
    severity: literal(
      item.severity,
      SEVERITIES,
      "approval requirement severity",
    ),
    reason_code: requiredString(
      item.reason_code,
      "approval requirement reason_code",
    ),
    summary: requiredString(item.summary, "approval requirement summary"),
    blocking_until_approved: booleanValue(
      item.blocking_until_approved,
      "blocking_until_approved",
    ),
    evidence_refs: stringArray(
      item.evidence_refs,
      "approval requirement evidence_refs",
    ),
    policy_version: requiredString(
      item.policy_version,
      "approval requirement policy_version",
    ),
  };
}

function parseMaterialChange(value: unknown): ProposalRiskImpactMaterialChange {
  const item = record(value, "material change");
  return {
    change_id: requiredString(item.change_id, "material change_id"),
    family: literal(
      item.family,
      MATERIAL_CHANGE_FAMILIES,
      "material change family",
    ),
    severity: literal(item.severity, SEVERITIES, "material change severity"),
    summary: requiredString(item.summary, "material change summary"),
    evidence_refs: stringArray(
      item.evidence_refs,
      "material change evidence_refs",
    ),
  };
}

function parseMissingEvidence(
  value: unknown,
): ProposalRiskImpactMissingEvidence {
  const item = record(value, "missing evidence");
  return {
    evidence_type: requiredString(item.evidence_type, "missing evidence type"),
    reason_code: requiredString(
      item.reason_code,
      "missing evidence reason_code",
    ),
    summary: requiredString(item.summary, "missing evidence summary"),
    blocking: booleanValue(item.blocking, "missing evidence blocking"),
    evidence_refs: stringArray(item.evidence_refs, "missing evidence refs"),
  };
}

function parseWorkflowGate(value: unknown): ProposalRiskImpactWorkflowGate {
  const item = record(value, "workflow gate");
  return {
    state: literal(item.state, SECTION_STATES, "workflow_gate.state"),
    reason_code: requiredString(item.reason_code, "workflow_gate.reason_code"),
    support_reference: nullableString(
      item.support_reference,
      "workflow_gate.support_reference",
    ),
    gate: nullableLiteral(item.gate, GATES, "workflow_gate.gate"),
    recommended_next_step: nullableLiteral(
      item.recommended_next_step,
      GATE_NEXT_STEPS,
      "workflow_gate.recommended_next_step",
    ),
    reasons: array(item.reasons, "workflow_gate.reasons").map((value) => {
      const reason = record(value, "workflow gate reason");
      return {
        reason_code: requiredString(
          reason.reason_code,
          "workflow gate reason_code",
        ),
        severity: literal(
          reason.severity,
          SEVERITIES,
          "workflow gate severity",
        ),
        source: literal(
          reason.source,
          GATE_REASON_SOURCES,
          "workflow gate source",
        ),
      };
    }),
  };
}

function parseCapability(value: unknown): ProposalRiskImpactCapability {
  const item = record(value, "capability");
  return {
    key: literal(
      item.key,
      PROPOSAL_RISK_IMPACT_CAPABILITY_KEYS,
      "capability.key",
    ),
    label: requiredString(item.label, "capability.label"),
    state: literal(item.state, SECTION_STATES, "capability.state"),
    reason_code: requiredString(item.reason_code, "capability.reason_code"),
    source_service: nullableString(
      item.source_service,
      "capability.source_service",
    ),
    support_reference: nullableString(
      item.support_reference,
      "capability.support_reference",
    ),
  };
}

function parseLineage(value: unknown): ProposalRiskImpactData["lineage"] {
  const item = record(value, "lineage");
  return {
    proposal_version_id: requiredString(
      item.proposal_version_id,
      "lineage.proposal_version_id",
    ),
    request_hash: nullableString(item.request_hash, "lineage.request_hash"),
    artifact_hash: nullableString(item.artifact_hash, "lineage.artifact_hash"),
    simulation_hash: nullableString(
      item.simulation_hash,
      "lineage.simulation_hash",
    ),
  };
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    invalid(`${field} must be an object`);
  return value as Record<string, unknown>;
}

function array(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) invalid(`${field} must be an array`);
  return value;
}

function requiredString(
  value: unknown,
  field: string,
  allowEmpty = false,
): string {
  if (typeof value !== "string" || (!allowEmpty && value.trim().length === 0))
    invalid(`${field} must be a string`);
  return value;
}

function nullableString(value: unknown, field: string): string | null {
  if (value === null) return null;
  return requiredString(value, field);
}

function stringArray(value: unknown, field: string): string[] {
  return array(value, field).map((item) => requiredString(item, field));
}

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") invalid(`${field} must be a boolean`);
  return value;
}

function nonNegativeInteger(value: unknown, field: string): number {
  if (!Number.isInteger(value) || (value as number) < 0)
    invalid(`${field} must be a non-negative integer`);
  return value as number;
}

function decimalString(value: unknown, field: string): string {
  const result = requiredString(value, field);
  if (!DECIMAL_STRING.test(result))
    invalid(`${field} must be an exact decimal string`);
  return result;
}

function literal<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string,
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value))
    invalid(`${field} is not recognized`);
  return value as T[number];
}

function nullableLiteral<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string,
): T[number] | null {
  return value === null ? null : literal(value, allowed, field);
}

function enumArray<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string,
): T[number][] {
  return array(value, field).map((item) => literal(item, allowed, field));
}

function nullable<T>(value: unknown, parser: (value: unknown) => T): T | null {
  return value === null ? null : parser(value);
}

function unique(values: string[], field: string): void {
  if (new Set(values).size !== values.length)
    invalid(`${field} must not contain duplicates`);
}

function invalid(detail: string): never {
  throw new Error(`Proposal risk and impact response was invalid: ${detail}.`);
}
