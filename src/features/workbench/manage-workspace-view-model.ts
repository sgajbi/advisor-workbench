import type { ReviewContextStripModel } from "@/design-system";
import { formatBusinessDateValue } from "@/design-system/utils/financial-formatters";
import {
  businessStateLabel,
  formatBusinessReason,
} from "@/copy/business-state-copy";
import type { buildDpmCommandCenterPanelModel } from "@/features/workbench/dpm-command-center-view-model";
import { formatBusinessBookingCenter } from "@/features/workbench/business-label-formatters";
import { buildReviewContextStripModel } from "@/shell/review-context-strip-view-model";

import type { ManageWorkspaceData } from "./manage-workspace-data";

export type BadgeTone = "default" | "success" | "warn" | "danger";

export type ManageExceptionRow = {
  key: string;
  mandateId: string | null;
  monitoringRunId: string;
  sourceRunId: string;
  correlationId: string;
  authority: string;
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
  reasonCode: string;
};

export type MandateHealthRow = {
  key: string;
  dimension: string;
  score: string;
  state: string;
  reasons: string;
};

export type ManageExceptionRowsResult = {
  rows: ManageExceptionRow[];
  rejectedRowCount: number;
};

export type ManageExceptionEvidencePosture =
  "complete" | "partial" | "unavailable";

type CommandCenterModel = ReturnType<typeof buildDpmCommandCenterPanelModel>;

export function buildManageReviewContextStrip(
  data: ManageWorkspaceData,
  notice?: ReviewContextStripModel["notice"],
): ReviewContextStripModel {
  const portfolio = data.portfolio.portfolio;
  const mandateValue = readStringFromResponse(data.mandate, "mandate_type");
  const mandateType = mandateValue
    ? formatBusinessMandateType(mandateValue)
    : null;
  const bookingCenter = formatBusinessBookingCenter(
    portfolio.booking_center_code,
  );
  return buildReviewContextStripModel(
    {
      portfolioName:
        readString(asRecord(portfolio), "display_name") ??
        portfolio.portfolio_id,
      portfolioId: portfolio.portfolio_id,
      clientId: portfolio.client_id,
      mandateType,
      bookingCenter,
      businessDate:
        formatBusinessDateValue(data.portfolio.as_of_date, {
          nullDisplay: "",
        }) || null,
      baseCurrency: portfolio.base_currency,
    },
    notice,
  );
}

export function buildManageExceptionRows(
  exceptions: ManageWorkspaceData["commandCenterExceptions"],
): ManageExceptionRow[] {
  return buildManageExceptionRowsResult(exceptions).rows;
}

export function buildManageExceptionRowsResult(
  exceptions: ManageWorkspaceData["commandCenterExceptions"],
): ManageExceptionRowsResult {
  const records = extractRecords(
    asRecord(exceptions?.data).items ?? asRecord(exceptions?.data).exceptions,
  );
  const rows: ManageExceptionRow[] = [];
  let rejectedRowCount = 0;

  for (const record of records) {
    const exceptionId =
      readString(record, "exception_id") ||
      readString(record, "monitoring_exception_id");
    if (!exceptionId) {
      rejectedRowCount += 1;
      continue;
    }
    rows.push({
      key: exceptionId,
      mandateId: readString(record, "mandate_id"),
      monitoringRunId: readString(record, "monitoring_run_id") || "N/A",
      sourceRunId: readString(record, "source_run_id") || "N/A",
      correlationId:
        readString(record, "correlation_id") ||
        exceptions?.correlation_id ||
        "N/A",
      authority:
        readString(record, "authority") ||
        exceptions?.supportability.authority ||
        "N/A",
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
      state:
        readString(record, "state") || readString(record, "status") || "ACTIVE",
      nextAction:
        readString(record, "next_action") ||
        readString(record, "recommended_action") ||
        "N/A",
    });
  }

  return { rows, rejectedRowCount };
}

export function filterManageExceptionRowsForMandate(
  rows: ManageExceptionRow[],
  mandateId: string | null | undefined,
): ManageExceptionRow[] {
  const normalizedMandateId = mandateId?.trim();
  if (!normalizedMandateId || normalizedMandateId === "N/A") {
    return [];
  }
  return rows.filter((row) => row.mandateId === normalizedMandateId);
}

export function isManageExceptionEvidenceComplete(
  data: ManageWorkspaceData,
): boolean {
  return (
    getManageExceptionEvidencePosture(
      data.commandCenterExceptions,
      data.commandCenterExceptionsError,
    ) === "complete"
  );
}

export function isManageExceptionEvidenceAvailable(
  data: ManageWorkspaceData,
): boolean {
  return (
    getManageExceptionEvidencePosture(
      data.commandCenterExceptions,
      data.commandCenterExceptionsError,
    ) !== "unavailable"
  );
}

export function getManageExceptionEvidencePosture(
  exceptions: ManageWorkspaceData["commandCenterExceptions"],
  error: string | null,
): ManageExceptionEvidencePosture {
  if (error || !exceptions) {
    return "unavailable";
  }
  const supportabilityState = exceptions.supportability.state
    .trim()
    .toUpperCase();
  const responseData = asRecord(exceptions.data);
  const exceptionRecords = Array.isArray(responseData.items)
    ? responseData.items
    : Array.isArray(responseData.exceptions)
      ? responseData.exceptions
      : null;
  if (
    !exceptionRecords ||
    !Object.prototype.hasOwnProperty.call(responseData, "next_cursor")
  ) {
    return "unavailable";
  }
  const nextCursorIsValid =
    responseData.next_cursor === null ||
    (typeof responseData.next_cursor === "string" &&
      Boolean(responseData.next_cursor.trim()));
  if (!nextCursorIsValid) {
    return "unavailable";
  }

  const confirmedStates = ["COMPLETE", "READY", "SUPPORTED"];
  if (!confirmedStates.includes(supportabilityState)) {
    const boundedPartialStates = ["UNKNOWN", "PARTIAL", "DEGRADED", "STALE"];
    return boundedPartialStates.includes(supportabilityState) &&
      (exceptionRecords.length > 0 || typeof responseData.next_cursor === "string")
      ? "partial"
      : "unavailable";
  }
  if (responseData.next_cursor === null) {
    return buildManageExceptionRowsResult(exceptions).rejectedRowCount > 0
      ? "partial"
      : "complete";
  }
  return "partial";
}

export function getManageExceptionNextCursor(
  exceptions: ManageWorkspaceData["commandCenterExceptions"],
): string | null {
  const nextCursor = asRecord(exceptions?.data).next_cursor;
  return typeof nextCursor === "string" && nextCursor.trim()
    ? nextCursor
    : null;
}

export function buildMandateSourceReadinessRows(
  data: ManageWorkspaceData,
  commandModel: CommandCenterModel,
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
        state:
          readString(record, "state") ||
          readString(record, "status") ||
          "UNKNOWN",
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
    reasonCode:
      row.value !== "N/A"
        ? `${row.label}: ${row.value}`
        : commandModel.partialReadinessReasons.join(", ") || "-",
  }));
}

export function buildMandateHealthDimensionRows(
  commandModel: CommandCenterModel,
): MandateHealthRow[] {
  return commandModel.mandateHealthDimensions;
}

export function readStringFromResponse(
  response: ManageWorkspaceData["mandate"],
  key: string,
): string | null {
  const data = asRecord(response?.data);
  const nestedMandate = asRecord(data.mandate);
  return readString(data, key) || readString(nestedMandate, key);
}

export function toneForState(value: string): BadgeTone {
  const normalized = value.toUpperCase();
  if (
    normalized.includes("ERROR") ||
    normalized.includes("FAILED") ||
    normalized.includes("BLOCKED") ||
    normalized.includes("HIGH") ||
    normalized.includes("UNSUPPORTED") ||
    normalized.includes("NOT_SUPPORTED")
  ) {
    return "danger";
  }
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
    normalized.includes("STALE") ||
    normalized.includes("REVIEW") ||
    normalized.includes("PENDING") ||
    normalized.includes("MEDIUM") ||
    normalized.includes("EMPTY") ||
    normalized.includes("UNKNOWN") ||
    normalized === "N/A"
  ) {
    return "warn";
  }
  return "default";
}

export function firstNonEmpty(
  ...values: Array<string | null | undefined>
): string {
  return values.find((value) => value && value.trim().length > 0) ?? "N/A";
}

export function isBusinessValueAvailable(
  value: string | number | null | undefined,
): boolean {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase()
    .replaceAll(/[^A-Z0-9]+/g, "_")
    .replaceAll(/^_+|_+$/g, "");
  return ![
    "",
    "EMPTY",
    "MISSING",
    "N_A",
    "NA",
    "NONE",
    "NOT_AVAILABLE",
    "NOT_PROVIDED",
    "NOT_REPORTED",
    "NOT_SUPPLIED",
    "NULL",
    "UNAVAILABLE",
    "UNKNOWN",
  ].includes(normalized);
}

export function formatBusinessMandateType(
  value: string | null | undefined,
): string {
  if (!value) {
    return "Not available";
  }
  return toTitleCase(
    value.replace(/^DPM[-_\s]*/i, "Discretionary ").replaceAll("_", " "),
  );
}

export function formatBusinessBook(value: string | null | undefined): string {
  if (!value) {
    return "Not available";
  }
  return toTitleCase(
    value.replace(/^PM[_-\s]BOOK[_-\s]*/i, "").replaceAll("_", " "),
  );
}

export function formatBusinessTrigger(
  value: string | null | undefined,
): string {
  if (!value || value === "N/A") {
    return "Scheduled rebalance";
  }
  const normalized = value.toUpperCase();
  if (
    normalized.includes("PORTFOLIO_LIST") ||
    normalized.includes("SCHEDULED")
  ) {
    return "Scheduled rebalance";
  }
  return businessStateLabel(value);
}

export function formatBusinessExceptionTitle(title: string): string {
  const normalized = title.toLowerCase();
  if (
    normalized.includes("source_risk_health_attention") ||
    normalized.includes("source risk health attention")
  ) {
    return "Risk posture requires review";
  }
  if (
    normalized.includes("dpm_source_stale") ||
    normalized.includes("source stale")
  ) {
    return "Mandate data requires refresh";
  }
  if (
    normalized.includes("tax_lot_source_partial") ||
    normalized.includes("tax lot")
  ) {
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

export function formatBusinessBoundary(value: string): string {
  const labels: Record<string, string> = {
    NO_CAMPAIGN_MEMBERSHIP_CALCULATION:
      "Campaign membership remains source-owned",
    NO_CLIENT_CONTACT_WORKFLOW: "No client-contact workflow",
    NO_LOCAL_COHORT_CALCULATION: "Cohort membership remains source-owned",
    NO_MAKER_CHECKER_WORKFLOW: "No maker-checker workflow",
    NO_OMS_EXECUTION_CLAIM: "No execution claim",
    NO_ORDER_GENERATION: "No order generation",
    NO_TRADE_APPROVAL: "No trade approval",
  };
  return labels[value.trim().toUpperCase()] ?? formatBusinessReason(value);
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

export function readString(
  record: Record<string, unknown>,
  key: string,
): string | null {
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

function extractRecordsFromUnknownMap(
  value: unknown,
  keyName: string,
): Array<Record<string, unknown>> {
  const arrayRecords = extractRecords(value);
  if (arrayRecords.length > 0) {
    return arrayRecords;
  }
  const record = asRecord(value);
  return Object.entries(record).map(([key, item]) =>
    isRecord(item)
      ? { [keyName]: key, ...item }
      : { [keyName]: key, state: item },
  );
}

function extractStringArrayFromUnknown(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === "string" && item.length > 0,
      )
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
