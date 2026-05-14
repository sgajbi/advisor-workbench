import type { DpmPmOperatingQualityGatewayResponse } from "./types";

export type PmOperatingQualityPanelState =
  | "ready"
  | "partial"
  | "blocked"
  | "empty"
  | "unavailable";

export type PmOperatingQualityPolicyRow = {
  key: string;
  policyId: string;
  policyVersion: string;
  enabled: string;
  state: string;
  asOfDate: string;
  reasonCodes: string;
};

export type PmOperatingQualityScoreRunRow = {
  key: string;
  scoreRunId: string;
  pmId: string;
  bookId: string;
  policy: string;
  state: string;
  score: string;
  asOfDate: string;
  forbiddenUses: string;
  reasonCodes: string;
  contentHash: string;
};

export type PmOperatingQualityPanelModel = {
  state: PmOperatingQualityPanelState;
  supportabilityState: string;
  authority: string;
  policyId: string;
  policyVersion: string;
  scoreRunId: string;
  count: string;
  reasonCodes: string[];
  blockedActions: string[];
  policyRows: PmOperatingQualityPolicyRow[];
  scoreRunRows: PmOperatingQualityScoreRunRow[];
  selectedScoreRun: PmOperatingQualityScoreRunRow | null;
  forbiddenUsePosture: string;
};

export function buildPmOperatingQualityPanelModel(params: {
  policies: DpmPmOperatingQualityGatewayResponse | null;
  scoreRuns: DpmPmOperatingQualityGatewayResponse | null;
  preview?: DpmPmOperatingQualityGatewayResponse | null;
}): PmOperatingQualityPanelModel {
  const primary = params.preview ?? params.scoreRuns ?? params.policies;
  const supportability = primary?.supportability;
  const supportabilityState = normalizeState(supportability?.state);
  const policyRows = buildPolicyRows(params.policies);
  const scoreRunRows = [
    ...buildScoreRunRows(params.preview),
    ...buildScoreRunRows(params.scoreRuns),
  ].filter(uniqueByScoreRunId);
  const selectedScoreRun = scoreRunRows[0] ?? null;
  const reasonCodes = [
    ...(supportability?.reason_codes ?? []),
    ...scoreRunRows.flatMap((row) => splitList(row.reasonCodes)),
  ].filter(uniqueString);
  const blockedActions = supportability?.blocked_actions ?? [];

  return {
    state: resolvePanelState(supportabilityState, policyRows.length, scoreRunRows.length, Boolean(primary)),
    supportabilityState,
    authority: supportability?.authority ?? "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    policyId: firstNonEmpty(
      supportability?.policy_id,
      selectedScoreRun?.policy.split(" / ")[0],
      policyRows[0]?.policyId,
    ),
    policyVersion: firstNonEmpty(
      supportability?.policy_version,
      selectedScoreRun?.policy.split(" / ")[1],
      policyRows[0]?.policyVersion,
    ),
    scoreRunId: firstNonEmpty(supportability?.score_run_id, selectedScoreRun?.scoreRunId),
    count: formatCount(supportability?.count, scoreRunRows.length),
    reasonCodes,
    blockedActions,
    policyRows,
    scoreRunRows,
    selectedScoreRun,
    forbiddenUsePosture: summarizeForbiddenUses(scoreRunRows),
  };
}

function buildPolicyRows(
  response: DpmPmOperatingQualityGatewayResponse | null
): PmOperatingQualityPolicyRow[] {
  if (!response) {
    return [];
  }
  const data = asRecord(response.data);
  const records = extractRecords(data.policies).length
    ? extractRecords(data.policies)
    : [data].filter(hasAnyPolicyIdentity);
  return records.map((record, index) => {
    const policyId = readString(record, "policy_id") || response.supportability.policy_id || "N/A";
    const policyVersion =
      readString(record, "policy_version") || response.supportability.policy_version || "N/A";
    return {
      key: `${policyId}-${policyVersion}-${index}`,
      policyId,
      policyVersion,
      enabled: formatBoolean(record.enabled),
      state:
        readString(record, "state") ||
        readString(record, "supportability_state") ||
        response.supportability.state ||
        "UNKNOWN",
      asOfDate: readString(record, "as_of_date") || "N/A",
      reasonCodes: formatList(record.reason_codes),
    };
  });
}

function buildScoreRunRows(
  response: DpmPmOperatingQualityGatewayResponse | null | undefined
): PmOperatingQualityScoreRunRow[] {
  if (!response) {
    return [];
  }
  const data = asRecord(response.data);
  const records = extractRecords(data.score_runs).length
    ? extractRecords(data.score_runs)
    : [asRecord(data.score_run)].filter(hasAnyScoreRunIdentity);
  return records.map((record, index) => {
    const scoreRunId =
      readString(record, "score_run_id") ||
      response.supportability.score_run_id ||
      `score-run-${index + 1}`;
    const policyId = readString(record, "policy_id") || response.supportability.policy_id || "N/A";
    const policyVersion =
      readString(record, "policy_version") || response.supportability.policy_version || "N/A";
    return {
      key: `${scoreRunId}-${index}`,
      scoreRunId,
      pmId: readString(record, "pm_id") || "N/A",
      bookId: readString(record, "book_id") || "N/A",
      policy: `${policyId} / ${policyVersion}`,
      state:
        readString(record, "state") ||
        readString(record, "supportability_state") ||
        response.supportability.state ||
        "UNKNOWN",
      score: readString(record, "score") || readString(record, "overall_score") || "N/A",
      asOfDate: readString(record, "as_of_date") || readString(record, "created_at") || "N/A",
      forbiddenUses: formatList(record.forbidden_uses),
      reasonCodes: formatList(record.reason_codes),
      contentHash:
        readString(record, "content_hash") ||
        readString(record, "score_run_hash") ||
        readString(record, "payload_hash") ||
        "N/A",
    };
  });
}

function resolvePanelState(
  supportabilityState: string,
  policyCount: number,
  scoreRunCount: number,
  hasResponse: boolean,
): PmOperatingQualityPanelState {
  const normalized = supportabilityState.toUpperCase();
  if (!hasResponse) {
    return "unavailable";
  }
  if (normalized.includes("BLOCKED") || normalized.includes("UNSUPPORTED")) {
    return "blocked";
  }
  if (normalized.includes("PARTIAL") || normalized.includes("DEGRADED") || normalized.includes("WATCH")) {
    return "partial";
  }
  if (normalized.includes("EMPTY") || (policyCount === 0 && scoreRunCount === 0)) {
    return "empty";
  }
  return "ready";
}

function summarizeForbiddenUses(rows: PmOperatingQualityScoreRunRow[]): string {
  const forbiddenUses = rows.flatMap((row) => splitList(row.forbiddenUses)).filter(uniqueString);
  return forbiddenUses.length > 0
    ? forbiddenUses.map((value) => value.replaceAll("_", " ")).join(", ")
    : "No forbidden-use list returned";
}

function uniqueByScoreRunId(row: PmOperatingQualityScoreRunRow, index: number, rows: PmOperatingQualityScoreRunRow[]) {
  return rows.findIndex((candidate) => candidate.scoreRunId === row.scoreRunId) === index;
}

function uniqueString(value: string, index: number, values: string[]) {
  return value.length > 0 && values.indexOf(value) === index;
}

function hasAnyPolicyIdentity(record: Record<string, unknown>) {
  return Boolean(readString(record, "policy_id") || readString(record, "policy_version"));
}

function hasAnyScoreRunIdentity(record: Record<string, unknown>) {
  return Boolean(readString(record, "score_run_id"));
}

function formatCount(count: number | null | undefined, fallback: number) {
  if (typeof count === "number" && Number.isFinite(count)) {
    return String(count);
  }
  return String(fallback);
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  return values.find((value) => value && value.trim().length > 0 && value !== "N/A") ?? "N/A";
}

function normalizeState(value: string | null | undefined): string {
  return value?.trim().toUpperCase() || "UNKNOWN";
}

function formatBoolean(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "Enabled" : "Disabled";
  }
  return "N/A";
}

function formatList(value: unknown): string {
  const items = extractStringArray(value);
  return items.length > 0 ? items.join(", ") : "N/A";
}

function splitList(value: string): string[] {
  return value === "N/A" ? [] : value.split(",").map((item) => item.trim()).filter(Boolean);
}

function extractRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => isRecord(item))
    : [];
}

function extractStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}
