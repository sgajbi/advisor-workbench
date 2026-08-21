export const PROPOSAL_DISCUSSION_PACK_CONTRACT_VERSION =
  "proposal-discussion-pack-review.v1" as const;

export const PROPOSAL_DISCUSSION_CAPABILITY_KEYS = [
  "proposal_identity",
  "advisor_narrative",
  "advisor_memo",
  "disclosure_policy",
  "report_package",
  "approval_and_consent_records",
  "client_release",
  "client_delivery",
] as const;

const CAPABILITY_STATES = [
  "supported",
  "partial",
  "restricted",
  "unavailable",
  "not_available",
  "not_supported",
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
const NARRATIVE_STATUSES = [
  "READY_FOR_ADVISOR_REVIEW",
  "BLOCKED_INSUFFICIENT_EVIDENCE",
  "BLOCKED_POLICY_INCOMPLETE",
  "BLOCKED_GUARDRAIL_FAILURE",
] as const;
const NARRATIVE_REVIEW_STATES = [
  "DRAFT",
  "APPROVED_FOR_ADVISOR_USE",
  "REJECTED",
  "REGENERATION_REQUESTED",
  "NOT_RECORDED",
] as const;
const CLIENT_READY_STATUSES = [
  "NOT_REQUESTED",
  "BLOCKED_REVIEW_REQUIRED",
  "BLOCKED_POLICY_OR_GUARDRAIL",
  "NOT_AVAILABLE",
] as const;
const MEMO_STATUSES = ["READY", "PENDING_REVIEW", "BLOCKED"] as const;
const MEMO_LIFECYCLE_STATUSES = ["DRAFT", "FINALIZED"] as const;
const MEMO_REVIEW_ACTIONS = [
  "APPROVE_FOR_ADVISOR_USE",
  "REQUEST_CHANGES",
  "REJECT",
] as const;
const PACKAGE_STATES = [
  "not_requested",
  "pending",
  "available",
  "attention",
] as const;
const CONSENT_STATES = ["not_recorded", "approved", "declined"] as const;
const SECTION_KEYS = [
  "EXECUTIVE_SUMMARY",
  "RECOMMENDATION_RATIONALE",
  "RISK_AND_CONCENTRATION",
  "SUITABILITY_AND_MANDATE",
  "MATERIAL_CHANGES",
  "ALTERNATIVES_CONSIDERED",
  "APPROVALS_AND_NEXT_STEPS",
  "LIMITATIONS_AND_DISCLOSURES",
] as const;

export type ProposalDiscussionCapabilityState =
  (typeof CAPABILITY_STATES)[number];
export type ProposalDiscussionWorkflowState = (typeof WORKFLOW_STATES)[number];
export type ProposalDiscussionSectionKey = (typeof SECTION_KEYS)[number];

export type ProposalDiscussionNarrativeSection = {
  section_key: ProposalDiscussionSectionKey;
  title: string;
  text: string;
  source_refs: Array<{ ref_type: string; ref_id: string; field_path: string }>;
  limitation_refs: string[];
};

export type ProposalDiscussionPackData = {
  proposal_id: string;
  portfolio_id: string;
  title: string | null;
  current_state: ProposalDiscussionWorkflowState;
  version_no: number;
  version_created_at: string;
  overall_state: "supported" | "partial";
  attention_required: boolean;
  narrative: {
    state: ProposalDiscussionCapabilityState;
    reason_code: string;
    narrative_id: string | null;
    source_narrative_hash: string | null;
    status: (typeof NARRATIVE_STATUSES)[number] | null;
    generation_mode: "DETERMINISTIC_TEMPLATE" | "AI_ASSISTED_DRAFT" | null;
    review_state: (typeof NARRATIVE_REVIEW_STATES)[number];
    review_id: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    client_ready_status: (typeof CLIENT_READY_STATUSES)[number];
    policy_status: "READY_FOR_ADVISOR_REVIEW" | "BLOCKED_CLIENT_READY" | null;
    policy_version: string | null;
    sections: ProposalDiscussionNarrativeSection[];
    disclosures: Array<{
      disclosure_id: string;
      jurisdiction: string;
      product_type: string;
      required_for: "ADVISOR_REVIEW" | "CLIENT_READY";
      text: string;
      source_authority: string;
      policy_version: string;
    }>;
    client_ready_blockers: string[];
    limitations: Array<{
      evidence_key: string;
      required_for: string;
      message: string;
    }>;
  };
  memo: {
    state: ProposalDiscussionCapabilityState;
    reason_code: string;
    memo_id: string | null;
    memo_version: string | null;
    memo_status: (typeof MEMO_STATUSES)[number] | null;
    lifecycle_status: (typeof MEMO_LIFECYCLE_STATUSES)[number] | null;
    source_input_hash: string | null;
    memo_hash: string | null;
    latest_review_action: (typeof MEMO_REVIEW_ACTIONS)[number] | null;
    review_event_id: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    client_ready_publication: "BLOCKED" | null;
    sections: Array<{
      section_id: string;
      title: string;
      status: (typeof MEMO_STATUSES)[number];
      summary: string;
      review_required: boolean;
      owner_role: string;
      reason_codes: string[];
    }>;
  };
  package: {
    state: ProposalDiscussionCapabilityState;
    reason_code: string;
    package_state: (typeof PACKAGE_STATES)[number];
    report_request_id: string | null;
    report_reference_id: string | null;
    generated_at: string | null;
    related_version_no: number | null;
    includes_reviewed_narrative: boolean;
    source_service: "lotus-report" | null;
  };
  consent: {
    state: ProposalDiscussionCapabilityState;
    reason_code: string;
    consent_state: (typeof CONSENT_STATES)[number];
    approval_id: string | null;
    actor_id: string | null;
    occurred_at: string | null;
    related_version_no: number | null;
  };
  client_release: {
    state: "blocked" | "not_supported";
    reason_code: string;
    publication_supported: false;
    delivery_supported: false;
    explanation: string;
  };
  capabilities: Array<{
    key: (typeof PROPOSAL_DISCUSSION_CAPABILITY_KEYS)[number];
    state: ProposalDiscussionCapabilityState;
    reason_code: string;
    source_service: "lotus-advise" | "lotus-report" | null;
    support_reference: string | null;
  }>;
  lineage: {
    proposal_version_id: string;
    request_hash: string;
    artifact_hash: string;
    simulation_hash: string;
    narrative_hash: string | null;
    memo_hash: string | null;
    gateway_correlation_id: string;
  };
};

export type ProposalDiscussionPackEnvelope = {
  correlation_id: string;
  contract_version: typeof PROPOSAL_DISCUSSION_PACK_CONTRACT_VERSION;
  data: ProposalDiscussionPackData;
};

export function parseProposalDiscussionPackEnvelope(
  value: unknown,
  expectedProposalId: string,
  expectedPortfolioId: string,
  expectedVersionNo: number,
  expectedCurrentState: string,
): ProposalDiscussionPackEnvelope {
  const envelope = object(value, "response");
  const correlationId = text(envelope.correlation_id, "correlation_id");
  const contractVersion = literal(
    envelope.contract_version,
    [PROPOSAL_DISCUSSION_PACK_CONTRACT_VERSION],
    "contract_version",
  );
  const data = parseData(envelope.data);

  if (data.proposal_id !== expectedProposalId)
    invalid("proposal identity changed");
  if (data.portfolio_id !== expectedPortfolioId)
    invalid("portfolio identity changed");
  if (data.version_no !== expectedVersionNo)
    invalid("proposal version changed");
  if (data.current_state !== expectedCurrentState)
    invalid("proposal lifecycle changed");
  if (data.lineage.gateway_correlation_id !== correlationId)
    invalid("lineage correlation does not match the response");
  if (data.client_release.publication_supported)
    invalid("client publication cannot be presented as supported");
  if (data.client_release.delivery_supported)
    invalid("client delivery cannot be presented as supported");

  if (
    data.narrative.review_state === "APPROVED_FOR_ADVISOR_USE" &&
    (!data.narrative.review_id ||
      !data.narrative.reviewed_by ||
      !data.narrative.reviewed_at)
  ) {
    invalid("approved narrative has no complete source review record");
  }
  const narrativeArtifactIsComplete = Boolean(
    data.narrative.narrative_id &&
    data.narrative.source_narrative_hash &&
    data.narrative.status &&
    data.narrative.generation_mode &&
    data.narrative.sections.length > 0 &&
    data.narrative.sections.every(({ source_refs }) => source_refs.length > 0),
  );
  if (data.narrative.state === "supported" && !narrativeArtifactIsComplete)
    invalid("supported narrative has no complete source artifact");
  if (
    data.narrative.review_state === "APPROVED_FOR_ADVISOR_USE" &&
    data.narrative.status !== "READY_FOR_ADVISOR_REVIEW"
  ) {
    invalid("approved narrative is not ready for advisor review");
  }
  if (
    data.memo.latest_review_action === "APPROVE_FOR_ADVISOR_USE" &&
    (!data.memo.review_event_id || !data.memo.reviewed_by || !data.memo.reviewed_at)
  ) {
    invalid("approved memo has no complete source review record");
  }
  const memoArtifactIsComplete = Boolean(
    data.memo.memo_id &&
    data.memo.memo_version &&
    data.memo.memo_status &&
    data.memo.lifecycle_status &&
    data.memo.source_input_hash &&
    data.memo.memo_hash &&
    data.memo.sections.length > 0,
  );
  if (data.memo.state === "supported" && !memoArtifactIsComplete)
    invalid("supported memo has no complete source artifact");
  if (
    data.memo.latest_review_action === "APPROVE_FOR_ADVISOR_USE" &&
    (data.memo.memo_status !== "READY" ||
      data.memo.lifecycle_status !== "FINALIZED" ||
      data.memo.sections.some(
        ({ status, review_required }) => status !== "READY" || review_required,
      ))
  ) {
    invalid("approved memo is not finalized for advisor use");
  }
  if (
    data.narrative.source_narrative_hash !== data.lineage.narrative_hash &&
    (data.narrative.source_narrative_hash !== null ||
      data.lineage.narrative_hash !== null)
  ) {
    invalid("narrative artifact hash does not match lineage");
  }
  if (
    data.memo.memo_hash !== data.lineage.memo_hash &&
    (data.memo.memo_hash !== null || data.lineage.memo_hash !== null)
  ) {
    invalid("memo artifact hash does not match lineage");
  }

  const packageRecordIsPresent =
    data.package.package_state !== "not_requested" ||
    data.package.report_request_id !== null ||
    data.package.report_reference_id !== null ||
    data.package.generated_at !== null;
  if (
    (data.package.related_version_no !== null &&
      data.package.related_version_no !== expectedVersionNo) ||
    (packageRecordIsPresent &&
      data.package.related_version_no !== expectedVersionNo)
  ) {
    invalid("report package is not correlated to the selected version");
  }
  if (
    data.package.package_state === "available" &&
    data.package.report_reference_id === null
  ) {
    invalid("available report package has no source reference");
  }
  if (
    data.package.package_state === "available" &&
    data.package.state !== "supported"
  ) {
    invalid("available report package is not source-supported");
  }
  if (
    data.package.package_state === "available" &&
    (!data.package.report_request_id ||
      !data.package.generated_at ||
      data.package.source_service !== "lotus-report")
  ) {
    invalid("available report package has no complete source record");
  }
  const consentRecordIsPresent =
    data.consent.consent_state !== "not_recorded" ||
    data.consent.approval_id !== null ||
    data.consent.actor_id !== null ||
    data.consent.occurred_at !== null;
  if (
    (data.consent.related_version_no !== null &&
      data.consent.related_version_no !== expectedVersionNo) ||
    (consentRecordIsPresent &&
      data.consent.related_version_no !== expectedVersionNo)
  ) {
    invalid("client consent is not correlated to the selected version");
  }
  if (
    ["approved", "declined"].includes(data.consent.consent_state) &&
    (!data.consent.approval_id ||
      !data.consent.actor_id ||
      !data.consent.occurred_at)
  ) {
    invalid("client consent has no complete source record");
  }

  const capabilityKeys = data.capabilities.map(({ key }) => key);
  if (new Set(capabilityKeys).size !== capabilityKeys.length)
    invalid("capability keys are duplicated");
  if (
    capabilityKeys.length !== PROPOSAL_DISCUSSION_CAPABILITY_KEYS.length ||
    PROPOSAL_DISCUSSION_CAPABILITY_KEYS.some(
      (requiredKey) => !capabilityKeys.includes(requiredKey),
    )
  ) {
    invalid("capability registry is incomplete");
  }
  const capabilityStates = new Map(
    data.capabilities.map(({ key, state }) => [key, state]),
  );
  const evidenceCapabilityStates = [
    ["advisor_narrative", data.narrative.state],
    ["advisor_memo", data.memo.state],
    ["report_package", data.package.state],
    ["approval_and_consent_records", data.consent.state],
  ] as const;
  if (
    evidenceCapabilityStates.some(
      ([key, state]) => capabilityStates.get(key) !== state,
    )
  ) {
    invalid("capability registry does not match source evidence");
  }

  return {
    correlation_id: correlationId,
    contract_version: contractVersion,
    data,
  };
}

function parseData(value: unknown): ProposalDiscussionPackData {
  const data = object(value, "data");
  const narrative = object(data.narrative, "narrative");
  const memo = object(data.memo, "memo");
  const packageEvidence = object(data.package, "package");
  const consent = object(data.consent, "consent");
  const release = object(data.client_release, "client_release");
  const lineage = object(data.lineage, "lineage");

  return {
    proposal_id: text(data.proposal_id, "proposal_id"),
    portfolio_id: text(data.portfolio_id, "portfolio_id"),
    title: nullableText(data.title, "title"),
    current_state: literal(
      data.current_state,
      WORKFLOW_STATES,
      "current_state",
    ),
    version_no: positiveInteger(data.version_no, "version_no"),
    version_created_at: timestamp(
      data.version_created_at,
      "version_created_at",
    ),
    overall_state: literal(
      data.overall_state,
      ["supported", "partial"],
      "overall_state",
    ),
    attention_required: flag(data.attention_required, "attention_required"),
    narrative: {
      state: literal(narrative.state, CAPABILITY_STATES, "narrative.state"),
      reason_code: text(narrative.reason_code, "narrative.reason_code"),
      narrative_id: nullableText(
        narrative.narrative_id,
        "narrative.narrative_id",
      ),
      source_narrative_hash: nullableText(
        narrative.source_narrative_hash,
        "narrative.source_narrative_hash",
      ),
      status: nullableLiteral(
        narrative.status,
        NARRATIVE_STATUSES,
        "narrative.status",
      ),
      generation_mode: nullableLiteral(
        narrative.generation_mode,
        ["DETERMINISTIC_TEMPLATE", "AI_ASSISTED_DRAFT"],
        "narrative.generation_mode",
      ),
      review_state: literal(
        narrative.review_state,
        NARRATIVE_REVIEW_STATES,
        "narrative.review_state",
      ),
      review_id: nullableText(narrative.review_id, "narrative.review_id"),
      reviewed_by: nullableText(narrative.reviewed_by, "narrative.reviewed_by"),
      reviewed_at: nullableTimestamp(
        narrative.reviewed_at,
        "narrative.reviewed_at",
      ),
      client_ready_status: literal(
        narrative.client_ready_status,
        CLIENT_READY_STATUSES,
        "narrative.client_ready_status",
      ),
      policy_status: nullableLiteral(
        narrative.policy_status,
        ["READY_FOR_ADVISOR_REVIEW", "BLOCKED_CLIENT_READY"],
        "narrative.policy_status",
      ),
      policy_version: nullableText(
        narrative.policy_version,
        "narrative.policy_version",
      ),
      sections: list(narrative.sections, "narrative.sections").map(
        parseNarrativeSection,
      ),
      disclosures: list(narrative.disclosures, "narrative.disclosures").map(
        parseDisclosure,
      ),
      client_ready_blockers: stringList(
        narrative.client_ready_blockers,
        "narrative.client_ready_blockers",
      ),
      limitations: list(narrative.limitations, "narrative.limitations").map(
        parseLimitation,
      ),
    },
    memo: {
      state: literal(memo.state, CAPABILITY_STATES, "memo.state"),
      reason_code: text(memo.reason_code, "memo.reason_code"),
      memo_id: nullableText(memo.memo_id, "memo.memo_id"),
      memo_version: nullableText(memo.memo_version, "memo.memo_version"),
      memo_status: nullableLiteral(
        memo.memo_status,
        MEMO_STATUSES,
        "memo.memo_status",
      ),
      lifecycle_status: nullableLiteral(
        memo.lifecycle_status,
        MEMO_LIFECYCLE_STATUSES,
        "memo.lifecycle_status",
      ),
      source_input_hash: nullableText(
        memo.source_input_hash,
        "memo.source_input_hash",
      ),
      memo_hash: nullableText(memo.memo_hash, "memo.memo_hash"),
      latest_review_action: nullableLiteral(
        memo.latest_review_action,
        MEMO_REVIEW_ACTIONS,
        "memo.latest_review_action",
      ),
      review_event_id: nullableText(
        memo.review_event_id,
        "memo.review_event_id",
      ),
      reviewed_by: nullableText(memo.reviewed_by, "memo.reviewed_by"),
      reviewed_at: nullableTimestamp(memo.reviewed_at, "memo.reviewed_at"),
      client_ready_publication: nullableLiteral(
        memo.client_ready_publication,
        ["BLOCKED"],
        "memo.client_ready_publication",
      ),
      sections: list(memo.sections, "memo.sections").map(parseMemoSection),
    },
    package: {
      state: literal(packageEvidence.state, CAPABILITY_STATES, "package.state"),
      reason_code: text(packageEvidence.reason_code, "package.reason_code"),
      package_state: literal(
        packageEvidence.package_state,
        PACKAGE_STATES,
        "package.package_state",
      ),
      report_request_id: nullableText(
        packageEvidence.report_request_id,
        "package.report_request_id",
      ),
      report_reference_id: nullableText(
        packageEvidence.report_reference_id,
        "package.report_reference_id",
      ),
      generated_at: nullableTimestamp(
        packageEvidence.generated_at,
        "package.generated_at",
      ),
      related_version_no: nullablePositiveInteger(
        packageEvidence.related_version_no,
        "package.related_version_no",
      ),
      includes_reviewed_narrative: flag(
        packageEvidence.includes_reviewed_narrative,
        "package.includes_reviewed_narrative",
      ),
      source_service: nullableLiteral(
        packageEvidence.source_service,
        ["lotus-report"],
        "package.source_service",
      ),
    },
    consent: {
      state: literal(consent.state, CAPABILITY_STATES, "consent.state"),
      reason_code: text(consent.reason_code, "consent.reason_code"),
      consent_state: literal(
        consent.consent_state,
        CONSENT_STATES,
        "consent.consent_state",
      ),
      approval_id: nullableText(consent.approval_id, "consent.approval_id"),
      actor_id: nullableText(consent.actor_id, "consent.actor_id"),
      occurred_at: nullableTimestamp(
        consent.occurred_at,
        "consent.occurred_at",
      ),
      related_version_no: nullablePositiveInteger(
        consent.related_version_no,
        "consent.related_version_no",
      ),
    },
    client_release: {
      state: literal(
        release.state,
        ["blocked", "not_supported"],
        "client_release.state",
      ),
      reason_code: text(release.reason_code, "client_release.reason_code"),
      publication_supported: falseFlag(
        release.publication_supported,
        "client_release.publication_supported",
      ),
      delivery_supported: falseFlag(
        release.delivery_supported,
        "client_release.delivery_supported",
      ),
      explanation: text(release.explanation, "client_release.explanation"),
    },
    capabilities: list(data.capabilities, "capabilities").map(parseCapability),
    lineage: {
      proposal_version_id: text(
        lineage.proposal_version_id,
        "lineage.proposal_version_id",
      ),
      request_hash: text(lineage.request_hash, "lineage.request_hash"),
      artifact_hash: text(lineage.artifact_hash, "lineage.artifact_hash"),
      simulation_hash: text(lineage.simulation_hash, "lineage.simulation_hash"),
      narrative_hash: nullableText(
        lineage.narrative_hash,
        "lineage.narrative_hash",
      ),
      memo_hash: nullableText(lineage.memo_hash, "lineage.memo_hash"),
      gateway_correlation_id: text(
        lineage.gateway_correlation_id,
        "lineage.gateway_correlation_id",
      ),
    },
  };
}

function parseNarrativeSection(
  value: unknown,
): ProposalDiscussionNarrativeSection {
  const section = object(value, "narrative section");
  return {
    section_key: literal(section.section_key, SECTION_KEYS, "section_key"),
    title: text(section.title, "section.title"),
    text: text(section.text, "section.text"),
    source_refs: list(section.source_refs, "section.source_refs").map(
      (value) => {
        const ref = object(value, "source reference");
        return {
          ref_type: text(ref.ref_type, "ref_type"),
          ref_id: text(ref.ref_id, "ref_id"),
          field_path: text(ref.field_path, "field_path"),
        };
      },
    ),
    limitation_refs: stringList(
      section.limitation_refs,
      "section.limitation_refs",
    ),
  };
}

function parseDisclosure(
  value: unknown,
): ProposalDiscussionPackData["narrative"]["disclosures"][number] {
  const disclosure = object(value, "disclosure");
  return {
    disclosure_id: text(disclosure.disclosure_id, "disclosure_id"),
    jurisdiction: text(disclosure.jurisdiction, "jurisdiction"),
    product_type: text(disclosure.product_type, "product_type"),
    required_for: literal(
      disclosure.required_for,
      ["ADVISOR_REVIEW", "CLIENT_READY"],
      "required_for",
    ),
    text: text(disclosure.text, "disclosure.text"),
    source_authority: text(disclosure.source_authority, "source_authority"),
    policy_version: text(
      disclosure.policy_version,
      "disclosure.policy_version",
    ),
  };
}

function parseLimitation(
  value: unknown,
): ProposalDiscussionPackData["narrative"]["limitations"][number] {
  const limitation = object(value, "limitation");
  return {
    evidence_key: text(limitation.evidence_key, "limitation.evidence_key"),
    required_for: text(limitation.required_for, "limitation.required_for"),
    message: text(limitation.message, "limitation.message"),
  };
}

function parseMemoSection(
  value: unknown,
): ProposalDiscussionPackData["memo"]["sections"][number] {
  const section = object(value, "memo section");
  return {
    section_id: text(section.section_id, "section_id"),
    title: text(section.title, "memo section.title"),
    status: literal(section.status, MEMO_STATUSES, "memo section.status"),
    summary: text(section.summary, "memo section.summary"),
    review_required: flag(
      section.review_required,
      "memo section.review_required",
    ),
    owner_role: text(section.owner_role, "memo section.owner_role"),
    reason_codes: stringList(section.reason_codes, "memo section.reason_codes"),
  };
}

function parseCapability(
  value: unknown,
): ProposalDiscussionPackData["capabilities"][number] {
  const capability = object(value, "capability");
  return {
    key: literal(
      capability.key,
      PROPOSAL_DISCUSSION_CAPABILITY_KEYS,
      "capability.key",
    ),
    state: literal(capability.state, CAPABILITY_STATES, "capability.state"),
    reason_code: text(capability.reason_code, "capability.reason_code"),
    source_service: nullableLiteral(
      capability.source_service,
      ["lotus-advise", "lotus-report"],
      "capability.source_service",
    ),
    support_reference: nullableText(
      capability.support_reference,
      "capability.support_reference",
    ),
  };
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    invalid(`${field} is not an object`);
  return value as Record<string, unknown>;
}
function list(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) invalid(`${field} is not an array`);
  return value;
}
function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0)
    invalid(`${field} is not reported`);
  return value;
}
function nullableText(value: unknown, field: string): string | null {
  return value === null ? null : text(value, field);
}
function stringList(value: unknown, field: string): string[] {
  return list(value, field).map((item, index) =>
    text(item, `${field}[${index}]`),
  );
}
function literal<const T extends readonly string[]>(
  value: unknown,
  values: T,
  field: string,
): T[number] {
  if (typeof value !== "string" || !values.includes(value as T[number]))
    invalid(`${field} is not supported`);
  return value as T[number];
}
function nullableLiteral<const T extends readonly string[]>(
  value: unknown,
  values: T,
  field: string,
): T[number] | null {
  return value === null ? null : literal(value, values, field);
}
function positiveInteger(value: unknown, field: string): number {
  if (!Number.isInteger(value) || (value as number) < 1)
    invalid(`${field} is not a positive integer`);
  return value as number;
}
function nullablePositiveInteger(value: unknown, field: string): number | null {
  return value === null ? null : positiveInteger(value, field);
}
function flag(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") invalid(`${field} is not a boolean`);
  return value;
}
function falseFlag(value: unknown, field: string): false {
  if (value !== false) invalid(`${field} must remain false`);
  return false;
}
function timestamp(value: unknown, field: string): string {
  const result = text(value, field);
  if (
    !/(?:Z|[+-]\d{2}:\d{2})$/.test(result) ||
    Number.isNaN(Date.parse(result))
  )
    invalid(`${field} is not a timezone-aware timestamp`);
  return result;
}
function nullableTimestamp(value: unknown, field: string): string | null {
  return value === null ? null : timestamp(value, field);
}
function invalid(message: string): never {
  throw new Error(`Proposal discussion pack contract is invalid: ${message}`);
}
