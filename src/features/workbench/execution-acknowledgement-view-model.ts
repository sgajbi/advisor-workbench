import type { ExternalOrderExecutionAcknowledgementResponse } from "./types";
import { formatBusinessReason } from "./manage-workspace-view-model";

export type ExecutionAcknowledgementLineageRow = {
  key: string;
  label: string;
  value: string;
};

export type ExecutionAcknowledgementSupportabilityModel = {
  state: string;
  reason: string;
  acknowledgementCount: string;
  missingDataFamilies: string[];
  blockedCapabilities: string[];
  lineageRows: ExecutionAcknowledgementLineageRow[];
  evidenceLabel: string;
  dataQualityStatus: string;
};

export function buildExecutionAcknowledgementSupportabilityModel(
  response: ExternalOrderExecutionAcknowledgementResponse | null,
): ExecutionAcknowledgementSupportabilityModel {
  if (!response) {
    return {
      state: "Unavailable",
      reason: "External OMS acknowledgement evidence has not loaded.",
      acknowledgementCount: "0",
      missingDataFamilies: [],
      blockedCapabilities: [],
      lineageRows: [],
      evidenceLabel: "ExternalOrderExecutionAcknowledgement v1",
      dataQualityStatus: "Unknown",
    };
  }

  return {
    state: formatBusinessReason(response.supportability.state),
    reason: formatBusinessReason(response.supportability.reason),
    acknowledgementCount: String(response.supportability.acknowledgement_count),
    missingDataFamilies: response.supportability.missing_data_families.map(formatBusinessReason),
    blockedCapabilities: response.supportability.blocked_capabilities.map(formatBusinessReason),
    lineageRows: buildLineageRows(response.lineage),
    evidenceLabel: `${response.product_name} ${response.product_version}`,
    dataQualityStatus: formatBusinessReason(response.data_quality_status ?? "UNKNOWN"),
  };
}

function buildLineageRows(lineage: Record<string, unknown>): ExecutionAcknowledgementLineageRow[] {
  return Object.entries(lineage)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim().length > 0)
    .map(([key, value]) => ({
      key,
      label: formatBusinessReason(key),
      value: String(value),
    }));
}
