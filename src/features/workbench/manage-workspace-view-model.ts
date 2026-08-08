import type { buildDpmCommandCenterPanelModel } from "@/features/workbench/dpm-command-center-view-model";
import { preserveBusinessAcronyms } from "@/features/workbench/business-label-formatters";

import type { ManageWorkspaceData } from "./manage-workspace-data";

export type BadgeTone = "default" | "success" | "warn" | "danger";

export type ManageExceptionRow = {
  key: string;
  severity: string;
  title: string;
  source: string;
  owner: string;
  age: string;
  state: string;
  nextAction: string;
};

export type MandateSourceReadinessRow = {
  key: string;
  source: string;
  state: string;
  lastUpdated: string;
  reasonCode: string;
};

export type MandateHealthRow = {
  key: string;
  dimension: string;
  score: string;
  state: string;
  reasons: string;
};

type CommandCenterModel = ReturnType<typeof buildDpmCommandCenterPanelModel>;

export function buildManageExceptionRows(
  exceptions: ManageWorkspaceData["commandCenterExceptions"]
): ManageExceptionRow[] {
  const records = extractRecords(asRecord(exceptions?.data).items ?? asRecord(exceptions?.data).exceptions);
  return records.map((record, index) => {
    const exceptionId =
      readString(record, "exception_id") ||
      readString(record, "monitoring_exception_id") ||
      `exception-${index + 1}`;
    return {
      key: exceptionId,
      severity: readString(record, "severity") || "UNKNOWN",
      title:
        readString(record, "title") ||
        readString(record, "description") ||
        readString(record, "reason_code") ||
        "Mandate exception details unavailable",
      source:
        readString(record, "source_system") ||
        readString(record, "source_service") ||
        exceptions?.source_service ||
        "lotus-manage",
      owner:
        readString(record, "owner") ||
        readString(record, "remediation_owner") ||
        "Not assigned",
      age: formatAge(record.age_hours ?? record.age_days),
      state: readString(record, "state") || readString(record, "status") || "ACTIVE",
      nextAction:
        readString(record, "next_action") ||
        readString(record, "recommended_action") ||
        "N/A",
    };
  });
}

export function buildMandateSourceReadinessRows(
  data: ManageWorkspaceData,
  commandModel: CommandCenterModel
): MandateSourceReadinessRow[] {
  const commandData = asRecord(data.commandCenter?.data);
  const nestedSummary = asRecord(commandData.summary);
  const rawRows =
    commandData.source_readiness ||
    commandData.source_readiness_summary ||
    nestedSummary.source_readiness ||
    nestedSummary.source_readiness_summary;
  const records = extractRecordsFromUnknownMap(rawRows, "source");

  if (records.length > 0) {
    return records.map((record, index) => {
      const source =
        readString(record, "source") ||
        readString(record, "source_service") ||
        readString(record, "source_system") ||
        readString(record, "key") ||
        `source-${index + 1}`;
      return {
        key: `${source}-${index}`,
        source,
        state: readString(record, "state") || readString(record, "status") || "UNKNOWN",
        lastUpdated:
          readString(record, "last_updated") ||
          readString(record, "last_updated_at") ||
          readString(record, "as_of_utc") ||
          "N/A",
        reasonCode:
          readString(record, "reason_code") ||
          readString(record, "reason") ||
          extractStringArrayFromUnknown(record.reason_codes).join(", ") ||
          "-",
      };
    });
  }

  return commandModel.sourceReadiness.map((row) => ({
    key: row.key,
    source: commandModel.sourceService,
    state: row.key.toUpperCase(),
    lastUpdated: "N/A",
    reasonCode:
      row.value !== "N/A"
        ? `${row.label}: ${row.value}`
        : commandModel.partialReadinessReasons.join(", ") || "-",
  }));
}

export function buildMandateHealthDimensionRows(
  commandModel: CommandCenterModel
): MandateHealthRow[] {
  return commandModel.mandateHealthDimensions;
}

export function readStringFromResponse(
  response: ManageWorkspaceData["mandate"],
  key: string
): string | null {
  const data = asRecord(response?.data);
  const nestedMandate = asRecord(data.mandate);
  return readString(data, key) || readString(nestedMandate, key);
}

export function toneForState(value: string): BadgeTone {
  const normalized = value.toUpperCase();
  if (
    normalized.includes("READY") ||
    normalized.includes("SUPPORTED") ||
    normalized === "AVAILABLE" ||
    normalized === "COMPLETE" ||
    normalized === "SUCCEEDED"
  ) {
    return "success";
  }
  if (
    normalized.includes("PARTIAL") ||
    normalized.includes("DEGRADED") ||
    normalized.includes("REVIEW") ||
    normalized.includes("PENDING") ||
    normalized.includes("MEDIUM") ||
    normalized.includes("EMPTY") ||
    normalized.includes("UNKNOWN") ||
    normalized === "N/A"
  ) {
    return "warn";
  }
  if (
    normalized.includes("ERROR") ||
    normalized.includes("FAILED") ||
    normalized.includes("BLOCKED") ||
    normalized.includes("HIGH") ||
    normalized.includes("UNSUPPORTED")
  ) {
    return "danger";
  }
  return "default";
}

export function firstNonEmpty(...values: Array<string | null | undefined>): string {
  return values.find((value) => value && value.trim().length > 0) ?? "N/A";
}

export function businessStateLabel(value: string | number | null | undefined): string {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === "N/A") {
    return "Not available";
  }
  const upper = normalized.toUpperCase();
  const labels: Record<string, string> = {
    ACTIVE: "Open",
    AVAILABLE: "Available",
    DEGRADED: "Needs attention",
    EMPTY: "Not available",
    ERROR: "Error",
    HIGH: "High",
    LOW: "Low",
    MEDIUM: "Medium",
    NOT_REQUESTED: "Not requested",
    OPEN: "Open",
    PARTIAL: "Needs attention",
    PM_REVIEW_REQUIRED: "PM Review Required",
    READY: "Ready",
    SIMULATION_READY: "Simulation ready",
    SOURCE_CHECKED: "Data checked",
    SUPPORTED: "Supported",
    UNKNOWN: "Not available",
  };
  return labels[upper] ?? toTitleCase(normalized.replaceAll("_", " "));
}

export function formatBusinessMandateType(value: string | null | undefined): string {
  if (!value) {
    return "Not available";
  }
  return toTitleCase(value.replace(/^DPM[-_\s]*/i, "Discretionary ").replaceAll("_", " "));
}

export function formatBusinessBook(value: string | null | undefined): string {
  if (!value) {
    return "Not available";
  }
  return toTitleCase(value.replace(/^PM[_-\s]BOOK[_-\s]*/i, "").replaceAll("_", " "));
}

export function formatBusinessTrigger(value: string | null | undefined): string {
  if (!value || value === "N/A") {
    return "Scheduled rebalance";
  }
  const normalized = value.toUpperCase();
  if (normalized.includes("PORTFOLIO_LIST") || normalized.includes("SCHEDULED")) {
    return "Scheduled rebalance";
  }
  return businessStateLabel(value);
}

export function formatBusinessOwner(owner: string): string {
  if (!owner || owner === "N/A" || owner === "Not assigned") {
    return "Not assigned";
  }
  const normalized = owner.toLowerCase();
  if (normalized.includes("pricing") || normalized.includes("data")) {
    return "Data Operations";
  }
  if (normalized.includes("advisor")) {
    return "Advisor";
  }
  if (normalized.includes("portfolio") || normalized.includes("pm")) {
    return "Portfolio Manager";
  }
  if (normalized.includes("system") || normalized.includes("lotus") || normalized.includes("core")) {
    return "Operations";
  }
  return owner;
}

export function formatBusinessExceptionTitle(title: string): string {
  const normalized = title.toLowerCase();
  if (
    normalized.includes("source_risk_health_attention") ||
    normalized.includes("source risk health attention")
  ) {
    return "Risk posture requires review";
  }
  if (normalized.includes("dpm_source_stale") || normalized.includes("source stale")) {
    return "Mandate data requires refresh";
  }
  if (normalized.includes("tax_lot_source_partial") || normalized.includes("tax lot")) {
    return "Tax-lot data is incomplete";
  }
  if (normalized.includes("benchmark") || normalized.includes("mapping")) {
    return "Benchmark mapping requires review";
  }
  if (normalized.includes("stale price") || normalized.includes("price")) {
    return "Stale price requires review";
  }
  if (normalized.includes("cash")) {
    return "Cash weight above soft range";
  }
  return title;
}

export function formatBusinessSource(value: string | null | undefined): string {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("pricing") || normalized.includes("performance")) {
    return "Market Data";
  }
  if (normalized.includes("core") || normalized.includes("gateway")) {
    return "Portfolio Records";
  }
  if (normalized.includes("manage")) {
    return "Mandate Desk";
  }
  if (!value || value === "N/A") {
    return "Operations";
  }
  return toTitleCase(value.replace(/^lotus[-_\s]*/i, "").replaceAll("_", " "));
}

export function formatBusinessReason(value: string | null | undefined): string {
  if (!value || value === "-" || value === "N/A") {
    return "-";
  }
  const normalized = value.toUpperCase();
  if (normalized.includes("SOURCE_RISK_HEALTH_ATTENTION")) {
    return "Risk posture requires review";
  }
  if (normalized.includes("DPM_SOURCE_STALE")) {
    return "Mandate data requires refresh";
  }
  if (normalized.includes("TAX_LOT_SOURCE_PARTIAL")) {
    return "Tax-lot data is incomplete";
  }
  if (normalized.includes("PRICE_STALE")) {
    return "Stale price";
  }
  if (normalized.includes("SOURCE_READY")) {
    return "Ready";
  }
  if (normalized.includes("UNAVAILABLE")) {
    return "Unavailable";
  }
  if (normalized.includes("MAPPING")) {
    return "Mapping review";
  }
  if (normalized.includes("CASH")) {
    return "Cash range";
  }
  return preserveBusinessAcronyms(businessStateLabel(value));
}

export function businessLastReviewed(value: string | null | undefined): string {
  if (!value || value === "N/A") {
    return "Not available";
  }
  return value.replaceAll("_", " ").replace(/\bREADY\b/i, "Ready");
}

export function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function formatAge(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 24) {
      return `${Math.round(value / 24)}d`;
    }
    return `${Math.round(value)}h`;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return "N/A";
}

function extractRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function extractRecordsFromUnknownMap(value: unknown, keyName: string): Array<Record<string, unknown>> {
  const arrayRecords = extractRecords(value);
  if (arrayRecords.length > 0) {
    return arrayRecords;
  }
  const record = asRecord(value);
  return Object.entries(record).map(([key, item]) =>
    isRecord(item) ? { [keyName]: key, ...item } : { [keyName]: key, state: item }
  );
}

function extractStringArrayFromUnknown(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

function toTitleCase(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
