import type { ExternalOrderExecutionAcknowledgementResponse } from "./types";
import {
  EXECUTION_EVIDENCE_COPY,
  executionEvidenceItemLabel,
  executionEvidenceLineageLabel,
  executionEvidenceReasonLabel,
  executionEvidenceStateLabel,
} from "@/copy/execution-evidence-copy";

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
      reason: EXECUTION_EVIDENCE_COPY.notLoadedReason,
      acknowledgementCount: "0",
      missingDataFamilies: [],
      blockedCapabilities: [],
      lineageRows: [],
      evidenceLabel: EXECUTION_EVIDENCE_COPY.evidenceLabel,
      dataQualityStatus: "Not available",
    };
  }

  return {
    state: executionEvidenceStateLabel(response.supportability.state),
    reason: executionEvidenceReasonLabel(response.supportability.reason),
    acknowledgementCount: String(response.supportability.acknowledgement_count),
    missingDataFamilies: response.supportability.missing_data_families.map(
      executionEvidenceItemLabel,
    ),
    blockedCapabilities: response.supportability.blocked_capabilities.map(
      executionEvidenceItemLabel,
    ),
    lineageRows: buildSupportRows(response),
    evidenceLabel: EXECUTION_EVIDENCE_COPY.evidenceLabel,
    dataQualityStatus: executionEvidenceStateLabel(
      response.data_quality_status ?? "UNKNOWN",
    ),
  };
}

function buildSupportRows(
  response: ExternalOrderExecutionAcknowledgementResponse,
): ExecutionAcknowledgementLineageRow[] {
  const contractRow = {
    key: "evidence_contract",
    label: "Evidence contract",
    value: `${response.product_name} ${response.product_version}`,
  };
  const sourcePostureRows = [
    {
      key: "source_reason",
      label: "Source reason",
      value: response.supportability.reason,
    },
    {
      key: "source_missing_data_families",
      label: "Source missing-data families",
      value:
        response.supportability.missing_data_families.join(", ") ||
        "None reported",
    },
    {
      key: "source_blocked_capabilities",
      label: "Source blocked capabilities",
      value:
        response.supportability.blocked_capabilities.join(", ") ||
        "None reported",
    },
  ];
  const lineageRows = Object.entries(response.lineage)
    .filter(
      ([, value]) =>
        value !== null &&
        value !== undefined &&
        String(value).trim().length > 0,
    )
    .map(([key, value]) => ({
      key,
      label: executionEvidenceLineageLabel(key),
      value: String(value),
    }));

  return [contractRow, ...sourcePostureRows, ...lineageRows];
}
