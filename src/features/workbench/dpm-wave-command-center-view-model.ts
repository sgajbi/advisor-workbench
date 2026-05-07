import type { DpmWaveGatewayResponse } from "./types";

export type DpmWaveCommandCenterPanelState =
  | "ready"
  | "partial"
  | "empty"
  | "blocked"
  | "unavailable";

export type DpmWaveSummaryRow = {
  key: string;
  waveId: string;
  state: string;
  triggerType: string;
  asOfDate: string;
  itemCount: string;
  supportabilityState: string;
  supportabilityReason: string;
};

export type DpmWaveMetricRow = {
  key: string;
  label: string;
  value: string;
};

export type DpmWaveItemRow = {
  key: string;
  waveItemId: string;
  portfolioId: string;
  state: string;
  sourceReadinessState: string;
  alternativeSetId: string;
  selectedAlternativeId: string;
  proofPackId: string;
  handoffRef: string;
  reasonCodes: string;
};

export type DpmWaveCommandCenterPanelModel = {
  state: DpmWaveCommandCenterPanelState;
  sourceService: string;
  authority: string;
  correlationId: string;
  supportabilityState: string;
  reasonCodes: string[];
  blockedActions: string[];
  remediationOwner: string;
  selectedWaveId: string | null;
  selectedWaveState: string;
  selectedWaveItemCount: string;
  selectedWaveIssueCount: string;
  selectedWaveSupportabilityReason: string;
  summaryRows: DpmWaveSummaryRow[];
  metricRows: DpmWaveMetricRow[];
  itemRows: DpmWaveItemRow[];
  proofPackRows: DpmWaveMetricRow[];
  handoffRows: DpmWaveMetricRow[];
  externalExecutionClaimed: string;
};

export function buildDpmWaveCommandCenterModel(params: {
  waveList: DpmWaveGatewayResponse | null;
  waveDetail?: DpmWaveGatewayResponse | null;
  waveItems?: DpmWaveGatewayResponse | null;
  actionResponse?: DpmWaveGatewayResponse | null;
}): DpmWaveCommandCenterPanelModel {
  const primary =
    params.actionResponse ?? params.waveDetail ?? params.waveList ?? params.waveItems;
  const listRows = buildSummaryRows(params.waveList?.data);
  const waveRecord = readWaveRecord(params.actionResponse?.data) || readWaveRecord(params.waveDetail?.data);
  const itemData = params.waveItems?.data ?? params.actionResponse?.data ?? params.waveDetail?.data;
  const itemRows = buildItemRows(itemData);
  const proofPackPosture = firstRecord(
    waveRecord?.proof_pack_posture,
    params.actionResponse?.data.proof_pack_posture ??
      params.waveDetail?.data.proof_pack_posture,
    params.waveItems?.data.proof_pack_posture,
    params.actionResponse?.data
  );
  const supportability = primary?.supportability;
  const supportabilityState = normalizeState(supportability?.state);
  const selectedWaveId =
    readString(waveRecord ?? {}, "wave_id") ||
    supportability?.wave_id ||
    listRows[0]?.waveId ||
    null;
  const selectedWaveState =
    readString(waveRecord ?? {}, "state") ||
    supportability?.wave_state ||
    listRows[0]?.state ||
    "N/A";
  const metricSource = firstRecord(
    waveRecord?.aggregate_metrics,
    params.actionResponse?.data.aggregate_metrics,
    params.waveItems?.data.aggregate_metrics
  );

  return {
    state: resolvePanelState(primary, listRows, itemRows, supportabilityState),
    sourceService: supportability?.source_service || primary?.source_service || "lotus-gateway",
    authority: supportability?.authority || "lotus-manage:RFC-0041",
    correlationId: primary?.correlation_id ?? "N/A",
    supportabilityState,
    reasonCodes: supportability?.reason_codes ?? [],
    blockedActions: supportability?.blocked_actions ?? [],
    remediationOwner: supportability?.remediation_owner ?? "N/A",
    selectedWaveId,
    selectedWaveState,
    selectedWaveItemCount: formatValue(
      supportability?.item_count ?? readValue(metricSource, "item_count") ?? itemRows.length
    ),
    selectedWaveIssueCount: formatValue(supportability?.issue_count ?? 0),
    selectedWaveSupportabilityReason:
      listRows.find((row) => row.waveId === selectedWaveId)?.supportabilityReason ||
      firstNonEmpty(supportability?.reason_codes) ||
      "N/A",
    summaryRows: listRows,
    metricRows: buildMetricRows(metricSource),
    itemRows,
    proofPackRows: buildProofPackRows(proofPackPosture, itemRows),
    handoffRows: buildHandoffRows(proofPackPosture),
    externalExecutionClaimed: formatValue(
      readValue(proofPackPosture, "external_execution_claimed")
    ),
  };
}

function resolvePanelState(
  primary: DpmWaveGatewayResponse | null | undefined,
  listRows: DpmWaveSummaryRow[],
  itemRows: DpmWaveItemRow[],
  supportabilityState: string
): DpmWaveCommandCenterPanelState {
  if (!primary) {
    return "unavailable";
  }
  if (supportabilityState === "BLOCKED") {
    return "blocked";
  }
  if (readWaveRecord(primary.data)) {
    return ["DEGRADED", "PARTIAL", "UNKNOWN"].includes(supportabilityState) ? "partial" : "ready";
  }
  if (listRows.length === 0 && itemRows.length === 0) {
    return "empty";
  }
  if (["DEGRADED", "PARTIAL", "UNKNOWN"].includes(supportabilityState)) {
    return "partial";
  }
  return "ready";
}

function buildSummaryRows(data: Record<string, unknown> | undefined): DpmWaveSummaryRow[] {
  return extractRecordArray(data?.items ?? data?.waves).map((record, index) => {
    const aggregate = readRecord(record.aggregate_metrics);
    return {
      key: readString(record, "wave_id") || `wave-${index + 1}`,
      waveId: readString(record, "wave_id") || "N/A",
      state: readString(record, "state") || "N/A",
      triggerType: readString(record, "trigger_type") || "N/A",
      asOfDate: readString(record, "as_of_date") || "N/A",
      itemCount: formatValue(readValue(record, "item_count") ?? readValue(aggregate, "item_count")),
      supportabilityState: normalizeState(readString(record, "supportability_state")),
      supportabilityReason: readString(record, "supportability_reason") || "N/A",
    };
  });
}

function buildMetricRows(record: Record<string, unknown>): DpmWaveMetricRow[] {
  return Object.entries(record).map(([key, value]) => ({
    key,
    label: formatLabel(key),
    value: formatValue(value),
  }));
}

function buildItemRows(data: Record<string, unknown> | undefined): DpmWaveItemRow[] {
  const records = extractRecordArray(data?.items ?? readWaveRecord(data)?.items);
  return records.map((record, index) => {
    const diagnostics = readRecord(record.diagnostics);
    return {
      key: readString(record, "wave_item_id") || `wave-item-${index + 1}`,
      waveItemId: readString(record, "wave_item_id") || "N/A",
      portfolioId: readString(record, "portfolio_id") || "N/A",
      state: readString(record, "state") || "N/A",
      sourceReadinessState:
        readString(record, "source_readiness_state") ||
        readString(diagnostics, "source_readiness_state") ||
        "N/A",
      alternativeSetId: readString(record, "alternative_set_id") || "N/A",
      selectedAlternativeId: readString(record, "selected_alternative_id") || "N/A",
      proofPackId: readString(record, "proof_pack_id") || "N/A",
      handoffRef: readString(record, "handoff_ref_id") || readString(diagnostics, "handoff_ref_id") || "N/A",
      reasonCodes:
        extractStringArray(record.reason_codes ?? diagnostics.reason_codes).join(", ") || "N/A",
    };
  });
}

function buildProofPackRows(
  proofPackPosture: Record<string, unknown>,
  itemRows: DpmWaveItemRow[]
): DpmWaveMetricRow[] {
  const refs = extractRecordArray(proofPackPosture.proof_pack_refs);
  if (refs.length > 0) {
    return refs.map((record, index) => ({
      key: readString(record, "proof_pack_id") || `proof-pack-${index + 1}`,
      label: readString(record, "proof_pack_id") || "Proof Pack",
      value: [
        readString(record, "wave_item_id"),
        readString(record, "proof_pack_state"),
        readString(record, "content_hash"),
      ]
        .filter(Boolean)
        .join(" | "),
    }));
  }
  return itemRows
    .filter((row) => row.proofPackId !== "N/A")
    .map((row) => ({
      key: row.proofPackId,
      label: row.proofPackId,
      value: `${row.waveItemId} | ${row.state}`,
    }));
}

function buildHandoffRows(proofPackPosture: Record<string, unknown>): DpmWaveMetricRow[] {
  return extractRecordArray(proofPackPosture.handoff_refs).map((record, index) => ({
    key: readString(record, "handoff_ref_id") || `handoff-${index + 1}`,
    label: readString(record, "handoff_ref_id") || "Handoff",
    value: [
      readString(record, "status"),
      readString(record, "content_hash"),
      formatValue(record.item_ids),
    ]
      .filter((value) => value !== "N/A")
      .join(" | "),
  }));
}

function readWaveRecord(data: Record<string, unknown> | undefined): Record<string, unknown> | null {
  const wave = readRecord(data?.wave);
  return Object.keys(wave).length > 0 ? wave : null;
}

function firstRecord(...values: unknown[]): Record<string, unknown> {
  for (const value of values) {
    const record = readRecord(value);
    if (Object.keys(record).length > 0) {
      return record;
    }
  }
  return {};
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
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readValue(record: Record<string, unknown>, key: string): unknown {
  return record[key];
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

function firstNonEmpty(values: string[] | undefined): string {
  return values?.find((value) => value.trim().length > 0) ?? "";
}

function formatValue(value: unknown): string {
  if (typeof value === "number") {
    return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => formatValue(item)).join(", ") : "N/A";
  }
  if (value === null || value === undefined) {
    return "N/A";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return JSON.stringify(value);
}

function formatLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function normalizeState(state: string | undefined): string {
  return state?.trim().toUpperCase() || "UNKNOWN";
}
