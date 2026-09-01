import type {
  DpmOutcomeReviewGatewayResponse,
  DpmProofPackGatewayResponse,
  WorkbenchOverview,
} from "./types";

export type ProofPackPanelState =
  | "ready"
  | "empty"
  | "partial"
  | "blocked"
  | "unsupported"
  | "unavailable";

export type ProofPackContext = {
  proofPackId: string | null;
  rebalanceRunId: string | null;
  mandateId: string | null;
};

export type ProofPackSectionRow = {
  key: string;
  section: string;
  state: string;
  source: string;
  hash: string;
};

export type ProofPackSourceHashRow = {
  key: string;
  source: string;
  reference: string;
  hash: string;
};

export type ProofPackEvidenceRow = {
  key: string;
  area: string;
  status: string;
  finding: string;
  action: string;
};

export type ProofPackDocumentRow = {
  key: string;
  label: string;
  status: string;
};

export type ProofPackPanelModel = {
  state: ProofPackPanelState;
  supportabilityState: string;
  supportabilityReasons: string[];
  sourceService: string;
  authority: string;
  correlationId: string;
  proofPackId: string;
  portfolioId: string;
  mandateId: string;
  rebalanceRunId: string;
  alternativeSetId: string;
  selectedAlternativeId: string;
  asOfDate: string;
  status: string;
  evidenceStatusLabel: string;
  approvalReadinessLabel: string;
  mandateCoverageLabel: string;
  reportReadinessLabel: string;
  selectedEvidenceTitle: string;
  selectedEvidenceSummary: string;
  advisorRationale: string;
  contentHash: string;
  sectionStateSummary: string;
  markdownAvailable: boolean;
  reportInputAvailable: boolean;
  aiEvidenceInputAvailable: boolean;
  sections: ProofPackSectionRow[];
  evidenceRows: ProofPackEvidenceRow[];
  coverageItems: ProofPackEvidenceRow[];
  documents: ProofPackDocumentRow[];
  sourceHashes: ProofPackSourceHashRow[];
};

export function deriveProofPackContext(
  outcomeReviews: DpmOutcomeReviewGatewayResponse | null,
  rebalanceSnapshot: WorkbenchOverview["rebalance_snapshot"] | null = null
): ProofPackContext {
  const review = extractOutcomeReviewRecords(outcomeReviews?.data ?? {}).find(
    (record) => readString(record, "proof_pack_id") || readString(record, "mandate_id")
  );
  return {
    proofPackId: review ? readString(review, "proof_pack_id") || null : null,
    rebalanceRunId: readRebalanceRunId(rebalanceSnapshot),
    mandateId: review ? readString(review, "mandate_id") || null : null,
  };
}

export function buildProofPackPanelModel(
  response: DpmProofPackGatewayResponse | null
): ProofPackPanelModel {
  if (!response) {
    return {
      state: "unavailable",
      supportabilityState: "UNAVAILABLE",
      supportabilityReasons: ["GATEWAY_PROOF_PACK_UNAVAILABLE"],
      sourceService: "lotus-gateway",
      authority: "lotus-manage:RFC-0040",
      correlationId: "N/A",
      proofPackId: "N/A",
      portfolioId: "N/A",
      mandateId: "N/A",
      rebalanceRunId: "N/A",
      alternativeSetId: "N/A",
      selectedAlternativeId: "N/A",
      asOfDate: "N/A",
      status: "UNAVAILABLE",
      evidenceStatusLabel: "Unavailable",
      approvalReadinessLabel: "Unavailable",
      mandateCoverageLabel: "Unavailable",
      reportReadinessLabel: "Unavailable",
      selectedEvidenceTitle: "Evidence unavailable",
      selectedEvidenceSummary: "Evidence details are not available yet.",
      advisorRationale: "Advisor rationale is not available until the evidence pack is returned.",
      contentHash: "N/A",
      sectionStateSummary: "N/A",
      markdownAvailable: false,
      reportInputAvailable: false,
      aiEvidenceInputAvailable: false,
      sections: [],
      evidenceRows: [],
      coverageItems: [],
      documents: [],
      sourceHashes: [],
    };
  }

  const proofPack = extractProofPackRecord(response.data);
  const decisionSummary = readRecord(proofPack, "decision_summary");
  const supportabilityState = normalizeState(response.supportability.state);
  const sections = extractRecordArray(
    proofPack.sections ?? proofPack.section_posture ?? response.data.sections
  ).map(buildSectionRow);
  const evidenceRows = extractRecordArray(
    proofPack.sections ?? proofPack.section_posture ?? response.data.sections
  ).map(buildEvidenceRow);
  const sourceHashes = [
    ...extractSourceHashRecords(proofPack.source_hashes),
    ...extractRecordArray(proofPack.source_lineage),
    ...extractSourceHashRecords(response.data.source_hashes),
  ].map(buildSourceHashRow);
  const contentHash =
    readString(proofPack, "content_hash") ||
    readString(response.data, "content_hash") ||
    response.supportability.content_hash ||
    "N/A";
  const proofPackId =
    readString(proofPack, "proof_pack_id") ||
    readString(response.data, "proof_pack_id") ||
    response.supportability.proof_pack_id ||
    "N/A";

  return {
    state: resolvePanelState(supportabilityState, proofPackId, sections.length),
    supportabilityState,
    supportabilityReasons: response.supportability.reason_codes ?? [],
    sourceService: response.supportability.source_service || response.source_service,
    authority: response.supportability.authority,
    correlationId: response.correlation_id,
    proofPackId,
    portfolioId: readString(proofPack, "portfolio_id") || readString(response.data, "portfolio_id") || "N/A",
    mandateId: readString(proofPack, "mandate_id") || readString(response.data, "mandate_id") || "N/A",
    rebalanceRunId:
      readString(proofPack, "rebalance_run_id") ||
      readString(response.data, "rebalance_run_id") ||
      "N/A",
    alternativeSetId:
      readString(proofPack, "alternative_set_id") ||
      readString(response.data, "alternative_set_id") ||
      "N/A",
    selectedAlternativeId:
      readString(proofPack, "selected_alternative_id") ||
      readString(response.data, "selected_alternative_id") ||
      "N/A",
    asOfDate: readString(proofPack, "as_of_date") || readString(response.data, "as_of_date") || "N/A",
    status: readString(proofPack, "status") || supportabilityState,
    evidenceStatusLabel: proofPackId !== "N/A" ? "Available" : "Not available",
    approvalReadinessLabel: approvalReadinessLabel(decisionSummary, proofPack, supportabilityState),
    mandateCoverageLabel: mandateCoverageLabel(response.supportability.section_state_counts, sections),
    reportReadinessLabel: response.supportability.report_input_available ? "Ready" : "Not ready",
    selectedEvidenceTitle: selectedEvidenceTitle(evidenceRows),
    selectedEvidenceSummary: selectedEvidenceSummary(evidenceRows),
    advisorRationale:
      readString(decisionSummary, "business_rationale") ||
      readString(decisionSummary, "expected_benefit") ||
      "Advisor rationale can be recorded after reviewing the evidence pack.",
    contentHash,
    sectionStateSummary: formatSectionStateCounts(response.supportability.section_state_counts),
    markdownAvailable: Boolean(response.supportability.markdown_available),
    reportInputAvailable: Boolean(response.supportability.report_input_available),
    aiEvidenceInputAvailable: Boolean(response.supportability.ai_evidence_input_available),
    sections,
    evidenceRows,
    coverageItems: evidenceRows.filter((row) => normalizeState(row.status) === "READY").slice(0, 4),
    documents: buildDocumentRows(proofPack),
    sourceHashes,
  };
}

function resolvePanelState(
  supportabilityState: string,
  proofPackId: string,
  sectionCount: number
): ProofPackPanelState {
  if (supportabilityState === "BLOCKED") {
    return "blocked";
  }
  if (supportabilityState === "UNSUPPORTED") {
    return "unsupported";
  }
  if (supportabilityState === "UNAVAILABLE") {
    return "unavailable";
  }
  if (supportabilityState === "DEGRADED" || supportabilityState === "PARTIAL") {
    return proofPackId !== "N/A" ? "partial" : "unavailable";
  }
  if (proofPackId === "N/A") {
    return "empty";
  }
  return sectionCount > 0 || supportabilityState === "READY" ? "ready" : "partial";
}

function extractProofPackRecord(data: Record<string, unknown>): Record<string, unknown> {
  const proofPack = data.proof_pack;
  if (isRecord(proofPack)) {
    return proofPack;
  }
  return data;
}

function extractOutcomeReviewRecords(data: Record<string, unknown>): Record<string, unknown>[] {
  const items = extractRecordArray(data.items);
  if (items.length > 0) {
    return items;
  }
  return typeof data.outcome_review_id === "string" ? [data] : [];
}

function readRebalanceRunId(
  snapshot: WorkbenchOverview["rebalance_snapshot"] | null
): string | null {
  if (!snapshot) {
    return null;
  }
  if (snapshot.last_rebalance_run_id?.trim()) {
    return snapshot.last_rebalance_run_id;
  }
  const recentRun = snapshot.recent_runs?.find((run) => run.rebalance_run_id?.trim());
  return recentRun?.rebalance_run_id ?? null;
}

function buildSectionRow(record: Record<string, unknown>, index: number): ProofPackSectionRow {
  const section =
    readString(record, "section") ||
    readString(record, "section_name") ||
    readString(record, "name") ||
    `section_${index + 1}`;
  const source =
    readString(record, "source_service") ||
    readString(record, "source") ||
    readString(record, "authority") ||
    "N/A";
  return {
    key: `${section}-${index}`,
    section,
    state: readString(record, "state") || readString(record, "status") || "UNKNOWN",
    source,
    hash:
      readString(record, "content_hash") ||
      readString(record, "payload_hash") ||
      readString(record, "hash") ||
      "N/A",
  };
}

function buildEvidenceRow(record: Record<string, unknown>, index: number): ProofPackEvidenceRow {
  const section =
    readString(record, "section_type") ||
    readString(record, "section") ||
    readString(record, "section_name") ||
    readString(record, "name") ||
    `section_${index + 1}`;
  const title = readString(record, "title") || businessSectionLabel(section);
  const state = readString(record, "state") || readString(record, "status") || "UNKNOWN";
  return {
    key: `${section}-${index}`,
    area: title,
    status: state,
    finding: readString(record, "summary") || businessFindingForSection(section, state),
    action: normalizeState(state) === "READY" || normalizeState(state) === "NOT_APPLICABLE" ? "View details" : "Review",
  };
}

function buildSourceHashRow(record: Record<string, unknown>, index: number): ProofPackSourceHashRow {
  const source =
    readString(record, "source_service") ||
    readString(record, "source_system") ||
    readString(record, "source") ||
    "N/A";
  const reference =
    readString(record, "source_ref") ||
    readString(record, "reference") ||
    readString(record, "source_id") ||
    readString(record, "id") ||
    "N/A";
  return {
    key: `${source}-${reference}-${index}`,
    source,
    reference,
    hash:
      readString(record, "content_hash") ||
      readString(record, "payload_hash") ||
      readString(record, "hash") ||
      "N/A",
  };
}

function buildDocumentRows(proofPack: Record<string, unknown>): ProofPackDocumentRow[] {
  const refs = [
    ...extractRecordArray(proofPack.evidence_refs),
    ...extractRecordArray(proofPack.markdown_summary_ref ? [proofPack.markdown_summary_ref] : []),
    ...extractRecordArray(proofPack.report_input_ref ? [proofPack.report_input_ref] : []),
    ...extractRecordArray(proofPack.ai_evidence_ref ? [proofPack.ai_evidence_ref] : []),
  ];
  return refs.map((ref, index) => ({
    key: `${readString(ref, "ref_type") || "document"}-${index}`,
    label: businessSectionLabel(readString(ref, "ref_type") || readString(ref, "ref_id") || `Document ${index + 1}`),
    status: readString(ref, "ref_id") ? "Available" : "Not available",
  }));
}

function formatSectionStateCounts(counts: Record<string, number> | null | undefined): string {
  if (!counts || Object.keys(counts).length === 0) {
    return "N/A";
  }
  return Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([state, count]) => `${state}: ${count}`)
    .join(", ");
}

function extractRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord);
}

function readRecord(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  return isRecord(value) ? value : {};
}

function extractSourceHashRecords(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }
  if (!isRecord(value)) {
    return [];
  }
  return Object.entries(value)
    .filter(([, hash]) => typeof hash === "string" && hash.trim().length > 0)
    .map(([sourceRef, hash]) => ({
      source_ref: sourceRef,
      hash,
    }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function normalizeState(state: string): string {
  return state.trim().toUpperCase() || "UNKNOWN";
}

function approvalReadinessLabel(
  decisionSummary: Record<string, unknown>,
  proofPack: Record<string, unknown>,
  fallbackState: string
): string {
  const approvalState =
    readString(decisionSummary, "approval_state") ||
    readString(proofPack, "approval_state") ||
    fallbackState;
  const normalized = normalizeState(approvalState);
  if (normalized === "READY" || normalized === "APPROVED" || normalized === "COMPLETE") {
    return "Ready";
  }
  if (normalized.includes("SIGNATURE")) {
    return "Signature Pending";
  }
  if (normalized.includes("REVIEW") || normalized.includes("PENDING")) {
    return "Review Pending";
  }
  return businessSectionLabel(approvalState);
}

function mandateCoverageLabel(
  counts: Record<string, number> | null | undefined,
  sections: ProofPackSectionRow[]
): string {
  const blocked = counts?.BLOCKED ?? sections.filter((section) => normalizeState(section.state) === "BLOCKED").length;
  const pending =
    counts?.PENDING_REVIEW ??
    sections.filter((section) => normalizeState(section.state) === "PENDING_REVIEW").length;
  if (blocked > 0) {
    return "Blocked";
  }
  if (pending > 0) {
    return "Review Pending";
  }
  return sections.length > 0 ? "Complete" : "Not available";
}

function selectedEvidenceTitle(rows: ProofPackEvidenceRow[]): string {
  return rows[0]?.area ?? "Evidence detail";
}

function selectedEvidenceSummary(rows: ProofPackEvidenceRow[]): string {
  return rows[0]?.finding ?? "Evidence section detail is not available yet.";
}

function businessFindingForSection(section: string, state: string): string {
  const normalized = normalizeState(section);
  if (normalized.includes("MANDATE") || normalized.includes("RULE")) {
    return normalizeState(state) === "READY" ? "Mandate coverage is complete." : "Mandate evidence needs review.";
  }
  if (normalized.includes("RISK")) {
    return normalizeState(state) === "READY" ? "Within approved risk profile." : "Risk evidence needs review.";
  }
  if (normalized.includes("OPERATIONS") || normalized.includes("TRADE")) {
    return normalizeState(state) === "READY" ? "Execution evidence is available." : "Execution evidence needs review.";
  }
  if (normalized.includes("REPORT")) {
    return normalizeState(state) === "READY" ? "Ready for client handoff." : "Report evidence needs review.";
  }
  return normalizeState(state) === "READY" ? "Evidence available." : "Evidence needs review.";
}

function businessSectionLabel(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return "N/A";
  }
  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}
