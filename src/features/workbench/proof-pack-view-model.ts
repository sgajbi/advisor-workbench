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
  contentHash: string;
  createdAt: string;
  sectionStateSummary: string;
  markdownAvailable: boolean;
  reportInputAvailable: boolean;
  aiEvidenceInputAvailable: boolean;
  sections: ProofPackSectionRow[];
  sourceHashes: ProofPackSourceHashRow[];
};

export function deriveProofPackContext(
  outcomeReviews: DpmOutcomeReviewGatewayResponse | null,
  rebalanceSnapshot: WorkbenchOverview["rebalance_snapshot"] | null = null
): ProofPackContext {
  const review = extractOutcomeReviewRecords(outcomeReviews?.data ?? {}).find(
    (record) => readString(record, "mandate_id")
  );
  return {
    proofPackId: null,
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
      contentHash: "N/A",
      createdAt: "N/A",
      sectionStateSummary: "N/A",
      markdownAvailable: false,
      reportInputAvailable: false,
      aiEvidenceInputAvailable: false,
      sections: [],
      sourceHashes: [],
    };
  }

  const proofPack = extractProofPackRecord(response.data);
  const supportabilityState = normalizeState(response.supportability.state);
  const sections = extractRecordArray(
    proofPack.sections ?? proofPack.section_posture ?? response.data.sections
  ).map(buildSectionRow);
  const sourceHashes = [
    ...extractRecordArray(proofPack.source_hashes),
    ...extractRecordArray(proofPack.source_lineage),
    ...extractRecordArray(response.data.source_hashes),
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
    contentHash,
    createdAt: readString(proofPack, "created_at") || readString(response.data, "created_at") || "N/A",
    sectionStateSummary: formatSectionStateCounts(response.supportability.section_state_counts),
    markdownAvailable: Boolean(response.supportability.markdown_available),
    reportInputAvailable: Boolean(response.supportability.report_input_available),
    aiEvidenceInputAvailable: Boolean(response.supportability.ai_evidence_input_available),
    sections,
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
